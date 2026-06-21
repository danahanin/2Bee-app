const { cosineSimilarity } = require('../retriever')

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
  })

  it('returns 0 for empty or mismatched lengths', () => {
    expect(cosineSimilarity([], [1])).toBe(0)
    expect(cosineSimilarity([1, 2], [1])).toBe(0)
  })

  it('handles arbitrary dimensions', () => {
    const a = [0.5, 0.5, 0.5, 0.5]
    const b = [0.5, 0.5, 0.5, 0.5]
    expect(cosineSimilarity(a, b)).toBeCloseTo(1)
  })
})
