jest.mock('../../rag', () => ({
  retrieveSimilar: jest.fn(),
}))

jest.mock('../../llm', () => ({
  generateJSON: jest.fn(),
  TASK_MODELS: { category: 'llama3.1:8b', classify: 'llama3.1:8b', hive: 'qwen3.6:27b-capped' },
}))

const { retrieveSimilar } = require('../../rag')
const { generateJSON } = require('../../llm')
const { classifyPersonalOrShared, retrieveFewShotExamples } = require('../classifyPersonalOrShared')

describe('retrieveFewShotExamples', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('merges curated and hive-specific examples, deduplicated and sorted by score', async () => {
    retrieveSimilar
      .mockResolvedValueOnce([{ text: 'coffee shop solo', type: 'personal', score: 0.7 }]) // curated
      .mockResolvedValueOnce([{ text: 'grocery run', type: 'shared', score: 0.95 }]) // hive-specific

    const results = await retrieveFewShotExamples(
      { description: 'coffee', amount: 18, lineItems: [] },
      { hiveId: 'hive-1', k: 5 },
    )

    const expectedQueryText = 'amount 18 coffee'
    expect(results[0].text).toBe('grocery run')
    expect(results).toHaveLength(2)
    expect(retrieveSimilar).toHaveBeenCalledWith(expectedQueryText, { k: 5, filter: { source: 'const' } })
    expect(retrieveSimilar).toHaveBeenCalledWith(expectedQueryText, {
      k: 5,
      filter: { source: 'dynamic', hiveId: 'hive-1' },
    })
  })

  it('skips the hive-specific lookup when no hiveId is provided', async () => {
    retrieveSimilar.mockResolvedValueOnce([])
    const results = await retrieveFewShotExamples({ description: 'coffee' }, {})
    expect(retrieveSimilar).toHaveBeenCalledTimes(1)
    expect(results).toEqual([])
  })

  it('returns an empty array when the signal has no query text', async () => {
    const results = await retrieveFewShotExamples({ lineItems: [] }, {})
    expect(results).toEqual([])
    expect(retrieveSimilar).not.toHaveBeenCalled()
  })
})

describe('classifyPersonalOrShared', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the AI classification with retrieved examples attached', async () => {
    retrieveSimilar.mockResolvedValue([{ text: 'coffee shop solo', type: 'personal', score: 0.6 }])
    generateJSON.mockResolvedValue({ type: 'personal', confidence: 0.91, reasoning: 'Individual coffee purchase' })

    const result = await classifyPersonalOrShared({ description: 'Coffee', amount: 18 }, { hiveId: 'hive-1' })

    expect(result).toEqual(
      expect.objectContaining({ value: 'personal', confidence: 0.91, reasoning: 'Individual coffee purchase', source: 'ai' }),
    )
    expect(result.retrieved.length).toBeGreaterThan(0)
  })

  it('trusts a very close retrieved match when the LLM fails (the haircut case)', async () => {
    retrieveSimilar.mockResolvedValueOnce([{ text: 'Got a haircut', type: 'personal', score: 0.9 }]).mockResolvedValue([])
    generateJSON.mockRejectedValue(new Error('LLM unavailable'))

    const result = await classifyPersonalOrShared({ description: 'Haircut at the salon', amount: 80 })

    expect(result.value).toBe('personal')
    expect(result.source).toBe('fallback')
    expect(result.confidence).toBeGreaterThan(0.6)
    expect(result.reasoning).toContain('[fallback]')
  })

  it('falls back to the generic rule-based classifier without a strong retrieval match', async () => {
    retrieveSimilar.mockResolvedValue([])
    generateJSON.mockRejectedValue(new Error('timeout'))

    const result = await classifyPersonalOrShared({
      description: 'Electric bill',
      amount: 300,
      category: 'utilities',
    })

    expect(result.value).toBe('shared')
    expect(result.source).toBe('fallback')
  })
})
