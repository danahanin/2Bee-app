const { evaluateModel, buildReport } = require('../runEval')

describe('evaluateModel', () => {
  const items = [
    { id: 'a', signal: {}, expectedCategory: 'dining' },
    { id: 'b', signal: {}, expectedCategory: 'health' },
    { id: 'c', signal: {}, expectedCategory: 'groceries' },
  ]

  function makeClassify(predictionsById) {
    return jest.fn(async (item) => predictionsById[item.id])
  }

  it('maps each item to a result using the provided extractors', async () => {
    const classify = makeClassify({
      a: { value: 'dining', confidence: 0.9, source: 'ai' },
      b: { value: 'health', confidence: 0.8, source: 'ai' },
      c: { value: 'other', confidence: 0.4, source: 'fallback' },
    })

    const results = await evaluateModel({
      items,
      classify,
      model: 'test-model',
      getExpected: (item) => item.expectedCategory,
      getPredicted: (output) => output.value,
    })

    expect(results).toHaveLength(3)
    expect(results.find((r) => r.id === 'a')).toEqual(
      expect.objectContaining({ expected: 'dining', predicted: 'dining', confidence: 0.9, jsonValid: true, error: null }),
    )
    expect(results.find((r) => r.id === 'c')).toEqual(
      expect.objectContaining({ expected: 'groceries', predicted: 'other', jsonValid: false }),
    )
    expect(classify).toHaveBeenCalledTimes(3)
    expect(classify).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'test-model')
  })

  it('records a failed classification as an error result instead of throwing', async () => {
    const classify = jest.fn(async (item) => {
      if (item.id === 'b') throw new Error('LLM timeout')
      return { value: item.expectedCategory, confidence: 0.9, source: 'ai' }
    })

    const results = await evaluateModel({
      items,
      classify,
      model: 'test-model',
      getExpected: (item) => item.expectedCategory,
      getPredicted: (output) => output.value,
    })

    const failed = results.find((r) => r.id === 'b')
    expect(failed.error).toBe('LLM timeout')
    expect(failed.predicted).toBeNull()
  })

  it('respects a concurrency limit greater than 1 while still covering every item', async () => {
    const classify = makeClassify({
      a: { value: 'dining', confidence: 0.9, source: 'ai' },
      b: { value: 'health', confidence: 0.9, source: 'ai' },
      c: { value: 'groceries', confidence: 0.9, source: 'ai' },
    })

    const results = await evaluateModel({
      items,
      classify,
      model: 'test-model',
      getExpected: (item) => item.expectedCategory,
      getPredicted: (output) => output.value,
      concurrency: 3,
    })

    expect(results.map((r) => r.id).sort()).toEqual(['a', 'b', 'c'])
  })
})

describe('buildReport', () => {
  it('aggregates accuracy, macroF1, latency, jsonValidityRate, calibration, and errors', () => {
    const results = [
      { expected: 'dining', predicted: 'dining', confidence: 0.9, jsonValid: true, latencyMs: 100, error: null },
      { expected: 'health', predicted: 'other', confidence: 0.3, jsonValid: false, latencyMs: 200, error: null },
      { expected: 'groceries', predicted: null, confidence: 0, jsonValid: false, latencyMs: 50, error: 'timeout' },
    ]

    const report = buildReport(results)

    expect(report.n).toBe(3)
    expect(report.accuracy).toBeCloseTo(1 / 3)
    expect(report.jsonValidityRate).toBeCloseTo(1 / 3)
    expect(report.latency.mean).toBeCloseTo((100 + 200 + 50) / 3)
    expect(report.errors).toEqual([{ id: undefined, error: 'timeout' }])
    expect(report.macroF1).toBeGreaterThanOrEqual(0)
    expect(report.calibration.length).toBeGreaterThan(0)
  })
})
