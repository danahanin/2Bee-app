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
      }),
    ).toEqual({
      type: 'shared',
      confidence: 0.85,
      reasoning: 'Grocery receipt',
      retrieved: [{ text: 'supermarket run', type: 'shared', score: 0.9 }],
    })
  })

  it('defaults reasoning and retrieved', () => {
    expect(makeClassification({ type: 'personal', confidence: 0.5 })).toEqual({
      type: 'personal',
      confidence: 0.5,
      reasoning: '',
      retrieved: [],
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
      }),
    ).toEqual({
      expenseGroupId: 'group-1',
      groupName: 'Work',
      confidence: 0.82,
      reasoning: 'Looks like a client meal',
      alternatives: [{ groupId: 'group-2', name: 'Partner', score: 0.4 }],
    })
  })

  it('defaults to an empty unresolved suggestion', () => {
    expect(makeHiveSuggestion()).toEqual({
      expenseGroupId: null,
      groupName: null,
      confidence: 0,
      reasoning: '',
      alternatives: [],
    })
  })
})

describe('makeReceiptDraft', () => {
  it('combines receiptId, ocr, extracted, and classification', () => {
    const ocr = makeOcrResult({ rawText: 'x' })
    const extracted = makeExtractedReceipt({ rawText: 'x' })
    const classification = makeClassification({ type: 'personal', confidence: 0.8 })
    expect(makeReceiptDraft({ receiptId: 'abc', ocr, extracted, classification })).toEqual({
      receiptId: 'abc',
      ocr,
      extracted,
      classification,
      hiveSuggestion: null,
    })
  })

  it('defaults receiptId, classification, and hiveSuggestion to null', () => {
    const ocr = makeOcrResult()
    const extracted = makeExtractedReceipt()
    expect(makeReceiptDraft({ ocr, extracted })).toEqual({
      receiptId: null,
      ocr,
      extracted,
      classification: null,
      hiveSuggestion: null,
    })
  })
})

describe('CATEGORIES', () => {
  it('re-exports the 12 expense categories', () => {
    expect(CATEGORIES).toHaveLength(12)
    expect(CATEGORIES).toEqual(expect.arrayContaining(['groceries', 'other']))
  })
})
