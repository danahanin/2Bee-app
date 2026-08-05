const {
  CATEGORIES,
  makeOcrResult,
  makeExtractedReceipt,
  makeClassification,
  makeHiveSuggestion,
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

describe('makeClassification', () => {
  it('builds a classification with retrieved examples', () => {
    expect(
      makeClassification({
        type: 'shared',
        confidence: 0.85,
        reasoning: 'Grocery receipt',
        retrieved: [{ text: 'supermarket run', type: 'shared', score: 0.9 }],
        source: 'fallback',
      }),
    ).toEqual({
      type: 'shared',
      confidence: 0.85,
      reasoning: 'Grocery receipt',
      retrieved: [{ text: 'supermarket run', type: 'shared', score: 0.9 }],
      source: 'fallback',
    })
  })

  it('defaults reasoning, retrieved, and source', () => {
    expect(makeClassification({ type: 'personal', confidence: 0.5 })).toEqual({
      type: 'personal',
      confidence: 0.5,
      reasoning: '',
      retrieved: [],
      source: 'ai',
    })
  })
})

describe('makeHiveSuggestion', () => {
  it('builds a hive suggestion with alternatives', () => {
    expect(
      makeHiveSuggestion({
        expenseGroupId: 'group-1',
        groupName: 'Work',
        confidence: 0.82,
        reasoning: 'Looks like a client meal',
        alternatives: [{ groupId: 'group-2', name: 'Partner', score: 0.4 }],
        source: 'fallback',
      }),
    ).toEqual({
      expenseGroupId: 'group-1',
      groupName: 'Work',
      confidence: 0.82,
      reasoning: 'Looks like a client meal',
      alternatives: [{ groupId: 'group-2', name: 'Partner', score: 0.4 }],
      source: 'fallback',
    })
  })

  it('defaults to an empty unresolved suggestion with source ai', () => {
    expect(makeHiveSuggestion()).toEqual({
      expenseGroupId: null,
      groupName: null,
      confidence: 0,
      reasoning: '',
      alternatives: [],
      source: 'ai',
    })
  })
})

describe('makeReceiptDraft', () => {
  it('combines receiptId, ocr, extracted, classification, and categorySuggestion', () => {
    const ocr = makeOcrResult({ rawText: 'x' })
    const extracted = makeExtractedReceipt({ rawText: 'x' })
    const classification = makeClassification({ type: 'personal', confidence: 0.8 })
    const categorySuggestion = { value: 'dining', confidence: 0.7, source: 'ai' }
    expect(
      makeReceiptDraft({ receiptId: 'abc', ocr, extracted, classification, categorySuggestion }),
    ).toEqual({
      receiptId: 'abc',
      ocr,
      extracted,
      classification,
      hiveSuggestion: null,
      categorySuggestion,
    })
  })

  it('defaults receiptId, classification, hiveSuggestion, and categorySuggestion to null', () => {
    const ocr = makeOcrResult()
    const extracted = makeExtractedReceipt()
    expect(makeReceiptDraft({ ocr, extracted })).toEqual({
      receiptId: null,
      ocr,
      extracted,
      classification: null,
      hiveSuggestion: null,
      categorySuggestion: null,
    })
  })
})

describe('CATEGORIES', () => {
  it('re-exports the 12 expense categories', () => {
    expect(CATEGORIES).toHaveLength(12)
    expect(CATEGORIES).toEqual(expect.arrayContaining(['groceries', 'other']))
  })
})
