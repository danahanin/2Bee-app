const Expense = require('../../../models/Expense')
const ExpenseGroup = require('../../../models/ExpenseGroup')
const { makeHiveSuggestion } = require('../../receipts/contracts')
const { retrieveSimilar, llmChat } = require('../rag')

const AUTO_ACCEPT_CONFIDENCE = 0.85

function buildHiveQueryText(extractedReceipt) {
  const lineItems = (extractedReceipt.lineItems || [])
    .map((item) => `${item.description || item.name || ''} ${item.amount || item.price || ''}`)
    .filter(Boolean)

  return [
    extractedReceipt.vendor,
    extractedReceipt.category,
    extractedReceipt.amount != null ? `amount ${extractedReceipt.amount}` : null,
    extractedReceipt.currency,
    ...lineItems,
    extractedReceipt.rawText?.slice(0, 300),
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function normalizeScore(value, fallback = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(1, Math.max(0, value))
}

function buildFallbackSuggestion(groups, reasoning = 'Fallback to the default shared hive group.') {
  const preferred = groups.find((group) => group.name === 'Partner') || groups[0] || null
  return makeHiveSuggestion({
    expenseGroupId: preferred ? String(preferred._id) : null,
    groupName: preferred?.name || null,
    confidence: preferred ? 0.55 : 0,
    reasoning,
    alternatives: groups.slice(0, 4).map((group, index) => ({
      groupId: String(group._id),
      name: group.name,
      score: index === 0 ? 0.55 : 0.35,
    })),
  })
}

function buildHivePrompt(extractedReceipt, groups, retrieved) {
  const groupLines = groups.map((group) => `- ${group.name}: ${group._id}`).join('\n')
  const retrievedLines = retrieved
    .map((item, index) => {
      const groupName = item.metadata?.groupName || item.groupName || 'unknown'
      return `${index + 1}. "${item.text}" -> ${groupName}`
    })
    .join('\n')
  const lineItems = (extractedReceipt.lineItems || [])
    .map((item) => `- ${item.description || item.name}: ${item.amount || item.price || 0}`)
    .join('\n')

  return `Choose the best hive group for a shared expense.
Available groups:
${groupLines || '(none)'}

Similar past examples:
${retrievedLines || '(none)'}

Receipt:
Vendor: ${extractedReceipt.vendor || 'unknown'}
Amount: ${extractedReceipt.amount ?? 'unknown'} ${extractedReceipt.currency || ''}
Category: ${extractedReceipt.category || 'unknown'}
Date: ${extractedReceipt.date || 'unknown'}
Line items:
${lineItems || '(none)'}

Return JSON only:
{"expenseGroupId":"one available group id or null","groupName":"group name or null","confidence":0.0-1.0,"reasoning":"brief explanation","alternatives":[{"groupId":"id","name":"name","score":0.0-1.0}]}`
}

function parseHiveSuggestion(raw, groups) {
  let parsed
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
  } catch {
    throw new Error('Failed to parse LLM hive suggestion JSON')
  }

  const groupById = new Map(groups.map((group) => [String(group._id), group]))
  const groupByName = new Map(groups.map((group) => [group.name.toLowerCase(), group]))
  const selected =
    groupById.get(String(parsed.expenseGroupId || '')) ||
    groupByName.get(String(parsed.groupName || '').toLowerCase()) ||
    null

  const alternatives = Array.isArray(parsed.alternatives)
    ? parsed.alternatives
        .map((alt) => {
          const group =
            groupById.get(String(alt.groupId || alt.expenseGroupId || '')) ||
            groupByName.get(String(alt.name || '').toLowerCase())
          if (!group) return null
          return {
            groupId: String(group._id),
            name: group.name,
            score: normalizeScore(alt.score, 0.5),
          }
        })
        .filter(Boolean)
    : []

  const selectedAlternative = selected
    ? { groupId: String(selected._id), name: selected.name, score: normalizeScore(parsed.confidence, 0.5) }
    : null
  const mergedAlternatives = [
    selectedAlternative,
    ...alternatives.filter((alt) => !selectedAlternative || alt.groupId !== selectedAlternative.groupId),
  ].filter(Boolean)

  return makeHiveSuggestion({
    expenseGroupId: selected ? String(selected._id) : null,
    groupName: selected?.name || null,
    confidence: normalizeScore(parsed.confidence, selected ? 0.5 : 0),
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    alternatives: mergedAlternatives.slice(0, 4),
  })
}

function shouldAutoAcceptSuggestion(suggestion, threshold = AUTO_ACCEPT_CONFIDENCE) {
  return Boolean(suggestion?.expenseGroupId && suggestion.confidence >= threshold)
}

async function findActiveGroups(hiveId) {
  return ExpenseGroup.find({ hiveId, isActive: true }).sort({ name: 1 }).lean()
}

async function suggestHive(extractedReceipt, { hiveId, userId, k = 5 } = {}) {
  if (!hiveId) {
    return makeHiveSuggestion({ reasoning: 'No active hive is available for this user.' })
  }

  const groups = await findActiveGroups(hiveId)
  if (groups.length === 0) {
    return makeHiveSuggestion({ reasoning: 'No expense groups exist for this hive yet.' })
  }

  const queryText = buildHiveQueryText(extractedReceipt)
  let retrieved = []

  try {
    retrieved = queryText
      ? await retrieveSimilar(queryText, { k, filter: { type: 'shared', hiveId: String(hiveId) } })
      : []
  } catch {
    retrieved = []
  }

  try {
    const prompt = buildHivePrompt(extractedReceipt, groups, retrieved)
    const raw = await llmChat([{ role: 'user', content: prompt }], { format: 'json', temperature: 0.2 })
    return parseHiveSuggestion(raw, groups)
  } catch {
    const recent = await Expense.find({
      hiveId,
      userId,
      type: 'shared',
      isDeleted: false,
      expenseGroupId: { $ne: null },
    })
      .sort({ date: -1 })
      .limit(1)
      .lean()

    if (recent[0]) {
      const group = groups.find((item) => String(item._id) === String(recent[0].expenseGroupId))
      if (group) {
        return makeHiveSuggestion({
          expenseGroupId: String(group._id),
          groupName: group.name,
          confidence: 0.6,
          reasoning: '[fallback] Based on your most recent shared receipt group.',
          alternatives: groups.slice(0, 4).map((item) => ({
            groupId: String(item._id),
            name: item.name,
            score: String(item._id) === String(group._id) ? 0.6 : 0.35,
          })),
        })
      }
    }

    return buildFallbackSuggestion(groups, '[fallback] The model was unavailable, so a default group was suggested.')
  }
}

module.exports = {
  AUTO_ACCEPT_CONFIDENCE,
  buildHivePrompt,
  buildHiveQueryText,
  parseHiveSuggestion,
  shouldAutoAcceptSuggestion,
  suggestHive,
}
