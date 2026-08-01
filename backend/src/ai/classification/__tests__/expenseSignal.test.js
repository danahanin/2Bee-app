const { makeExpenseSignal, fromExtractedReceipt, fromManualExpense, fromBankTransaction } = require('../expenseSignal')

describe('makeExpenseSignal', () => {
  it('fills in defaults for missing fields', () => {
    expect(makeExpenseSignal()).toEqual({
      description: '',
      vendor: null,
      amount: null,
      category: null,
      currency: null,
      date: null,
      lineItems: [],
      rawText: null,
    })
  })
})

describe('fromExtractedReceipt', () => {
  it('uses the vendor as the description when available', () => {
    const signal = fromExtractedReceipt({
      vendor: 'Cafe Aroma',
      amount: 42,
      currency: 'ILS',
      category: 'dining',
      date: '2026-06-13',
      lineItems: [{ description: 'Latte', amount: 18 }],
      rawText: 'CAFE AROMA receipt text',
    })

    expect(signal.description).toBe('Cafe Aroma')
    expect(signal.vendor).toBe('Cafe Aroma')
    expect(signal.amount).toBe(42)
    expect(signal.lineItems).toEqual([{ description: 'Latte', amount: 18 }])
    expect(signal.rawText).toBe('CAFE AROMA receipt text')
  })

  it('falls back to raw text when vendor is missing', () => {
    const signal = fromExtractedReceipt({ vendor: null, rawText: 'unreadable receipt text here' })
    expect(signal.description).toBe('unreadable receipt text here')
  })
})

describe('fromManualExpense', () => {
  it('maps manual form fields into a signal', () => {
    const signal = fromManualExpense({
      description: 'Haircut',
      amount: 80,
      category: 'health',
      currency: 'ILS',
      date: '2026-07-01',
    })

    expect(signal).toEqual(
      expect.objectContaining({
        description: 'Haircut',
        amount: 80,
        category: 'health',
        currency: 'ILS',
        date: '2026-07-01',
        vendor: null,
        lineItems: [],
      }),
    )
  })
})

describe('fromBankTransaction', () => {
  it('normalizes a bank transaction and takes the absolute amount', () => {
    const signal = fromBankTransaction(
      { description: 'SHUFERSAL TLV', amount: -152.4, bookingDate: '2026-07-10' },
      { category: 'groceries' },
    )

    expect(signal.description).toBe('SHUFERSAL TLV')
    expect(signal.amount).toBe(152.4)
    expect(signal.category).toBe('groceries')
    expect(signal.date).toBe('2026-07-10')
  })

  it('falls back to a generic description when none is provided', () => {
    const signal = fromBankTransaction({ amount: 10 })
    expect(signal.description).toBe('Bank transaction')
  })
})
