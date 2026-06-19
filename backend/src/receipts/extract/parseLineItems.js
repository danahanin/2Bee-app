const { splitLines, parseDecimal } = require('./textUtils')

const SKIP_LINE =
  /total|subtotal|סה["״']?כ|לתשלום|grand\s*total|amount\s*due|vat|מע["״']?מ|cash|change|עודף|תודה|thank/i

const LINE_ITEM =
  /^(.+?)\s+(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\s*(?:₪|ils|\$)?\s*$/i

/**
 * @param {string} rawText
 * @returns {{ value: Array<{ description: string, amount: number }>, confidence: number }}
 */
function parseLineItems(rawText) {
  const lines = splitLines(rawText)
  const items = []

  for (const line of lines) {
    if (SKIP_LINE.test(line)) continue
    if (line.length < 4) continue

    const match = line.match(LINE_ITEM)
    if (!match) continue

    const description = match[1].trim()
    const amount = parseDecimal(match[2])
    if (!description || amount == null || amount <= 0) continue
    if (/^\d+$/.test(description)) continue
    if (/^(qty|quantity|כמות|item|פריט)/i.test(description)) continue

    items.push({ description, amount })
  }

  if (items.length === 0) {
    return { value: [], confidence: 0 }
  }

  const confidence = items.length >= 2 ? 0.82 : 0.68
  return { value: items, confidence }
}

module.exports = { parseLineItems }
