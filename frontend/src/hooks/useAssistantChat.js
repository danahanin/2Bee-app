import { useCallback, useState } from 'react'
import { fetchPersonalDashboard } from '../services/dashboardService.js'
import * as aiService from '../services/aiService.js'
import { formatCurrency } from '../utils/formatCurrency.js'

const SUGGESTED_PROMPTS = [
  { id: 'spend', label: 'How much did I spend this month?', intent: 'personalSpend' },
  { id: 'balance', label: "What's our hive balance?", intent: 'hiveBalance' },
  { id: 'insights', label: 'Any spending insights?', intent: 'insights' },
  { id: 'forecast', label: 'Forecast next month', intent: 'forecast' },
  { id: 'recommend', label: 'What should we cut back on?', intent: 'recommendations' },
]

function formatInsights(data) {
  if (!data?.length) return 'No insights available right now. Add more expenses and check back soon.'
  return data
    .slice(0, 4)
    .map((item, i) => `${i + 1}. **${item.title}** — ${item.description}`)
    .join('\n\n')
}

function formatForecast(data) {
  if (!data?.length) return 'Not enough data to generate a forecast yet.'
  return data
    .slice(0, 5)
    .map((row) => `• ${row.category}: ${formatCurrency(row.predictedAmount)} predicted`)
    .join('\n')
}

function formatRecommendations(data) {
  if (!data?.length) return 'No recommendations at this time. Your spending looks balanced.'
  return data
    .slice(0, 4)
    .map((rec) => `• **${rec.title}** — ${rec.description}`)
    .join('\n\n')
}

function formatBalance(data) {
  if (!data) return 'Could not load hive balance.'
  if (data.message) return data.message
  if (!data.isImbalanced) return 'Your hive is balanced. Everyone is settled up.'
  return `There is an imbalance of ${formatCurrency(Math.abs(data.delta || 0))}. Trend: ${data.trend || 'stable'}.`
}

export function useAssistantChat({ hiveId } = {}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your 2bee financial assistant. Ask about spending, hive balance, forecasts, or tap a suggested question below.",
    },
  ])
  const [isTyping, setIsTyping] = useState(false)

  const addMessage = useCallback((role, content) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, role, content }])
  }, [])

  const orchestrate = useCallback(
    async (text, intent) => {
      const lower = text.toLowerCase()
      const resolvedIntent =
        intent ||
        (lower.includes('spend') || lower.includes('month')
          ? 'personalSpend'
          : lower.includes('balance') || lower.includes('owe') || lower.includes('hive')
            ? 'hiveBalance'
            : lower.includes('insight') || lower.includes('pattern')
              ? 'insights'
              : lower.includes('forecast') || lower.includes('predict')
                ? 'forecast'
                : lower.includes('cut') || lower.includes('recommend') || lower.includes('save')
                  ? 'recommendations'
                  : 'insights')

      switch (resolvedIntent) {
        case 'personalSpend': {
          const data = await fetchPersonalDashboard()
          return `You've spent **${formatCurrency(data.totalSpendThisMonth, { maximumFractionDigits: 0 })}** on personal expenses this month.${
            data.topCategory
              ? ` Your top category is **${data.topCategory.category}** at ${formatCurrency(data.topCategory.amount)}.`
              : ''
          }`
        }
        case 'hiveBalance': {
          const result = await aiService.fetchImbalance(hiveId ? { hiveId } : {})
          return formatBalance(result.data)
        }
        case 'forecast': {
          const result = await aiService.fetchForecast({ scope: 'personal' })
          return `Here's your spending forecast:\n\n${formatForecast(result.data)}`
        }
        case 'recommendations': {
          const result = await aiService.fetchRecommendations()
          return formatRecommendations(result.data)
        }
        case 'insights':
        default: {
          const result = await aiService.fetchInsights()
          return formatInsights(result.data)
        }
      }
    },
    [hiveId],
  )

  const sendMessage = useCallback(
    async (text, intent) => {
      if (!text.trim()) return
      addMessage('user', text.trim())
      setIsTyping(true)
      try {
        const reply = await orchestrate(text, intent)
        addMessage('assistant', reply)
      } catch (err) {
        addMessage('assistant', `Sorry, I couldn't fetch that right now. ${err.message || 'Please try again.'}`)
      } finally {
        setIsTyping(false)
      }
    },
    [addMessage, orchestrate],
  )

  return { messages, isTyping, sendMessage, suggestedPrompts: SUGGESTED_PROMPTS }
}
