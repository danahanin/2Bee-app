const {
  computeAccuracy,
  computeConfusionMatrix,
  computeMacroF1,
  computeLatencyStats,
  computeConfidenceCalibration,
  computeJsonValidityRate,
} = require('../metrics')

describe('computeAccuracy', () => {
  it('returns 0 for an empty result set', () => {
    expect(computeAccuracy([])).toBe(0)
  })

  it('computes the fraction of correct predictions', () => {
    const results = [
      { expected: 'dining', predicted: 'dining' },
      { expected: 'dining', predicted: 'groceries' },
      { expected: 'health', predicted: 'health' },
      { expected: 'health', predicted: 'health' },
    ]
    expect(computeAccuracy(results)).toBe(0.75)
  })
})

describe('computeConfusionMatrix', () => {
  it('counts expected/predicted pairs', () => {
    const results = [
      { expected: 'personal', predicted: 'personal' },
      { expected: 'personal', predicted: 'shared' },
      { expected: 'shared', predicted: 'shared' },
    ]
    expect(computeConfusionMatrix(results)).toEqual({
      personal: { personal: 1, shared: 1 },
      shared: { shared: 1 },
    })
  })
})

describe('computeMacroF1', () => {
  it('gives perfect scores when every prediction is correct', () => {
    const results = [
      { expected: 'personal', predicted: 'personal' },
      { expected: 'shared', predicted: 'shared' },
      { expected: 'shared', predicted: 'shared' },
    ]
    const { perClass, macroF1 } = computeMacroF1(results)
    expect(perClass.personal).toEqual({ precision: 1, recall: 1, f1: 1, support: 1 })
    expect(perClass.shared).toEqual({ precision: 1, recall: 1, f1: 1, support: 2 })
    expect(macroF1).toBe(1)
  })

  it('penalizes a class that is never predicted correctly', () => {
    const results = [
      { expected: 'personal', predicted: 'shared' },
      { expected: 'personal', predicted: 'shared' },
      { expected: 'shared', predicted: 'shared' },
    ]
    const { perClass } = computeMacroF1(results)
    expect(perClass.personal.recall).toBe(0)
    expect(perClass.personal.f1).toBe(0)
    expect(perClass.shared.precision).toBeCloseTo(1 / 3)
  })
})

describe('computeLatencyStats', () => {
  it('returns zeros for an empty array', () => {
    expect(computeLatencyStats([])).toEqual({ mean: 0, p50: 0, p95: 0, min: 0, max: 0 })
  })

  it('computes mean, percentiles, min and max', () => {
    const stats = computeLatencyStats([100, 200, 300, 400, 500])
    expect(stats.mean).toBe(300)
    expect(stats.min).toBe(100)
    expect(stats.max).toBe(500)
    expect(stats.p50).toBe(300)
  })
})

describe('computeConfidenceCalibration', () => {
  it('buckets results by confidence and reports per-bucket accuracy', () => {
    const results = [
      { expected: 'a', predicted: 'a', confidence: 0.95 },
      { expected: 'a', predicted: 'b', confidence: 0.92 },
      { expected: 'a', predicted: 'a', confidence: 0.6 },
    ]
    const buckets = computeConfidenceCalibration(results)
    const highBucket = buckets.find((b) => b.range.startsWith('[0.90'))
    expect(highBucket.count).toBe(2)
    expect(highBucket.accuracy).toBe(0.5)

    const midBucket = buckets.find((b) => b.range.startsWith('[0.50'))
    expect(midBucket.count).toBe(1)
    expect(midBucket.accuracy).toBe(1)
  })
})

describe('computeJsonValidityRate', () => {
  it('returns 0 for an empty array', () => {
    expect(computeJsonValidityRate([])).toBe(0)
  })

  it('computes the fraction with valid JSON', () => {
    const results = [{ jsonValid: true }, { jsonValid: true }, { jsonValid: false }, { jsonValid: false }]
    expect(computeJsonValidityRate(results)).toBe(0.5)
  })
})
