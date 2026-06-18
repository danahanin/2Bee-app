const {
  CATEGORIES,
  makeOcrResult,
  makeExtractedReceipt,
  makeReceiptDraft,
} = require('../contracts')

describe('makeOcrResult', () => {
  it('always tags the source as tesseract by default', () => {
    expect(makeOcrResult({ rawText: 'hi', confidence: 0.5 })).toEqual({
      rawText: 'hi',
      confidence: 0.5,
      imageRef: null,
      source: 'tesseract',
    })
  })

  it('applies safe defaults when called empty', () => {
    expect(makeOcrResult()).toEqual({
      rawText: '',
      confidence: 0,
      imageRef: null,
      source: 'tesseract',
    })
  })
})

describe('makeExtractedReceipt', () => {
  it('defaults every parsed field to null with no fabricated values', () => {
    expect(makeExtractedReceipt({ rawText: 'STORE\nTOTAL 10' })).toEqual({
      vendor: null,
      amount: null,
      currency: null,
      date: null,
      category: null,
      lineItems: [],
      rawText: 'STORE\nTOTAL 10',
    })
  })
})

describe('makeReceiptDraft', () => {
  it('combines receiptId, ocr and extracted', () => {
    const ocr = makeOcrResult({ rawText: 'x' })
    const extracted = makeExtractedReceipt({ rawText: 'x' })
    expect(makeReceiptDraft({ receiptId: 'abc', ocr, extracted })).toEqual({
      receiptId: 'abc',
      ocr,
      extracted,
    })
  })

  it('defaults receiptId to null', () => {
    const ocr = makeOcrResult()
    const extracted = makeExtractedReceipt()
    expect(makeReceiptDraft({ ocr, extracted }).receiptId).toBeNull()
  })
})

describe('CATEGORIES', () => {
  it('re-exports the 12 expense categories', () => {
    expect(CATEGORIES).toHaveLength(12)
    expect(CATEGORIES).toEqual(expect.arrayContaining(['groceries', 'other']))
  })
})
