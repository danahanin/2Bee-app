const { confidenceOf } = require('../tesseractOcr')

describe('confidenceOf', () => {
  const cases = [
    { name: 'normalizes mid-range confidence', input: { confidence: 90 }, expected: 0.9 },
    { name: 'returns 0 for zero confidence', input: { confidence: 0 }, expected: 0 },
    { name: 'returns 1 for full confidence', input: { confidence: 100 }, expected: 1 },
    { name: 'clamps values above 100 to 1', input: { confidence: 140 }, expected: 1 },
    { name: 'clamps negative values to 0', input: { confidence: -20 }, expected: 0 },
    { name: 'defaults missing confidence to 0', input: {}, expected: 0 },
    { name: 'defaults undefined data to 0', input: undefined, expected: 0 },
  ]

  it.each(cases)('$name', ({ input, expected }) => {
    expect(confidenceOf(input)).toBe(expected)
  })
})
