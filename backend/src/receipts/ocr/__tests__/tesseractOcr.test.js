const { confidenceOf, recoverPriceLines, mergeOcrText } = require('../tesseractOcr')

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

describe('recoverPriceLines', () => {
  it('returns price lines present only in the fallback pass', () => {
    const primary = 'MILK\nBREAD'
    const fallback = 'MILK\nTOTAL 69.70\nגׁ'
    expect(recoverPriceLines(primary, fallback)).toEqual(['TOTAL 69.70'])
  })

  it('ignores fallback price lines already in the primary (ignoring spacing)', () => {
    const primary = 'TOTAL  69.70'
    const fallback = 'TOTAL 69.70'
    expect(recoverPriceLines(primary, fallback)).toEqual([])
  })

  it('ignores non-price lines', () => {
    expect(recoverPriceLines('', 'just text\nno numbers')).toEqual([])
  })
})

describe('mergeOcrText', () => {
  it('appends recovered price lines to the primary text', () => {
    expect(mergeOcrText('MILK', 'לתשלום 69.70')).toBe('MILK\nלתשלום 69.70')
  })

  it('returns the primary text unchanged when nothing is recovered', () => {
    expect(mergeOcrText('MILK\nBREAD', 'MILK')).toBe('MILK\nBREAD')
  })
})
