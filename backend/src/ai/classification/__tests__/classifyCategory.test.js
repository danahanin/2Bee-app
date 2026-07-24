jest.mock('../../llm', () => ({
  generateJSON: jest.fn(),
  TASK_MODELS: { category: 'llama3.1:8b', classify: 'llama3.1:8b', hive: 'qwen3.6:27b-capped' },
}))

const { generateJSON } = require('../../llm')
const { classifyCategory } = require('../classifyCategory')

describe('classifyCategory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the AI suggestion when the LLM responds with valid JSON', async () => {
    generateJSON.mockResolvedValue({ category: 'dining', confidence: 0.87 })

    const result = await classifyCategory({ description: 'Dinner at Cafe Aroma', amount: 68 })

    expect(result).toEqual({ value: 'dining', confidence: 0.87, source: 'ai' })
  })

  it('falls back to the rule-based classifier when the LLM fails', async () => {
    generateJSON.mockRejectedValue(new Error('LLM unavailable'))

    const result = await classifyCategory({ description: 'Weekly Shufersal groceries run', amount: 200 })

    expect(result.source).toBe('fallback')
    expect(result.value).toBe('groceries')
  })

  it('falls back when the LLM returns an invalid category', async () => {
    generateJSON.mockResolvedValue({ category: 'not-a-real-category', confidence: 0.5 })

    const result = await classifyCategory({ description: 'Monthly rent payment', amount: 4000 })

    expect(result.source).toBe('fallback')
    expect(result.value).toBe('rent')
  })
})
