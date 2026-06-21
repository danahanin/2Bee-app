jest.mock('../../rag', () => ({
  retrieveSimilar: jest.fn(),
  llmGenerate: jest.fn(),
}))

const { retrieveSimilar, llmGenerate } = require('../../rag')
const { classifyPersonalShared, parseClassification } = require('../classifyPersonalShared')

const sampleExtracted = {
  vendor: 'Starbucks',
  amount: 18,
  currency: 'ILS',
  category: 'dining',
  date: '2026-06-13',
  lineItems: [],
  rawText: 'STARBUCKS COFFEE 18.00',
}

describe('parseClassification', () => {
  it('parses valid LLM JSON', () => {
    const result = parseClassification(
      '{"type":"personal","confidence":0.88,"reasoning":"Solo coffee purchase"}',
      [{ text: 'coffee solo', type: 'personal', score: 0.9 }],
    )
    expect(result).toEqual({
      type: 'personal',
      confidence: 0.88,
      reasoning: 'Solo coffee purchase',
      retrieved: [{ text: 'coffee solo', type: 'personal', score: 0.9 }],
    })
  })

  it('clamps confidence to 0..1', () => {
    const result = parseClassification('{"type":"shared","confidence":1.5,"reasoning":"x"}', [])
    expect(result.confidence).toBe(1)
  })

  it('defaults invalid type to personal', () => {
    const result = parseClassification('{"type":"unknown","confidence":0.5,"reasoning":"x"}', [])
    expect(result.type).toBe('personal')
  })
})

describe('classifyPersonalShared', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns LLM classification when available', async () => {
    retrieveSimilar.mockResolvedValue([
      { text: 'coffee shop solo', type: 'personal', score: 0.85 },
    ])
    llmGenerate.mockResolvedValue(
      '{"type":"personal","confidence":0.91,"reasoning":"Individual coffee purchase"}',
    )

    const result = await classifyPersonalShared(sampleExtracted)

    expect(result.type).toBe('personal')
    expect(result.confidence).toBe(0.91)
    expect(result.reasoning).toBe('Individual coffee purchase')
    expect(result.retrieved).toHaveLength(1)
  })

  it('falls back to rule-based classifier when LLM fails', async () => {
    retrieveSimilar.mockResolvedValue([])
    llmGenerate.mockRejectedValue(new Error('LLM unavailable'))

    const result = await classifyPersonalShared({
      ...sampleExtracted,
      vendor: 'Electric bill',
      category: 'utilities',
    })

    expect(result.type).toBe('shared')
    expect(result.reasoning).toMatch(/^\[fallback\]/)
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('maps fallback label to type for groceries', async () => {
    retrieveSimilar.mockRejectedValue(new Error('no db'))
    llmGenerate.mockRejectedValue(new Error('timeout'))

    const result = await classifyPersonalShared({
      vendor: 'Shufersal',
      amount: 200,
      currency: 'ILS',
      category: 'groceries',
      date: '2026-06-13',
      lineItems: [],
      rawText: 'SHUFERSAL GROCERIES',
    })

    expect(result.type).toBe('shared')
    expect(result.reasoning).toContain('[fallback]')
  })
})
