const { parseCategorySuggestion, parsePersonalOrSharedSuggestion, clampConfidence } = require('../schemas')

describe('clampConfidence', () => {
  it('clamps values above 1 and below 0', () => {
    expect(clampConfidence(1.5)).toBe(1)
    expect(clampConfidence(-0.2)).toBe(0)
  })

  it('falls back for non-numeric input', () => {
    expect(clampConfidence('high')).toBe(0.5)
    expect(clampConfidence(undefined, 0.4)).toBe(0.4)
  })
})

describe('parseCategorySuggestion', () => {
  it('parses a valid category suggestion', () => {
    expect(parseCategorySuggestion({ category: 'dining', confidence: 0.8 })).toEqual({
      value: 'dining',
      confidence: 0.8,
    })
  })

  it('normalizes case and clamps confidence', () => {
    expect(parseCategorySuggestion({ category: 'DINING', confidence: 1.7 })).toEqual({
      value: 'dining',
      confidence: 1,
    })
  })

  it('throws for a category outside the enum', () => {
    expect(() => parseCategorySuggestion({ category: 'crypto', confidence: 0.9 })).toThrow(
      'Invalid category suggestion',
    )
  })
})

describe('parsePersonalOrSharedSuggestion', () => {
  it('parses a valid suggestion', () => {
    expect(parsePersonalOrSharedSuggestion({ type: 'shared', confidence: 0.9, reasoning: 'household bill' })).toEqual({
      value: 'shared',
      confidence: 0.9,
      reasoning: 'household bill',
    })
  })

  it('defaults an unknown type to personal', () => {
    const result = parsePersonalOrSharedSuggestion({ type: 'unknown', confidence: 0.5, reasoning: 'x' })
    expect(result.value).toBe('personal')
  })

  it('clamps confidence and defaults missing reasoning to an empty string', () => {
    const result = parsePersonalOrSharedSuggestion({ type: 'personal', confidence: 5 })
    expect(result.confidence).toBe(1)
    expect(result.reasoning).toBe('')
  })
})
