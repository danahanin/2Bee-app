const { buildSignalQueryText, buildLineItemsText } = require('../signalText')

describe('buildSignalQueryText', () => {
  it('combines vendor, category, amount, currency, line items, description, and raw text', () => {
    const text = buildSignalQueryText({
      vendor: 'Shufersal',
      category: 'groceries',
      amount: 120,
      currency: 'ILS',
      lineItems: [{ description: 'Milk', amount: 6 }],
      description: 'Weekly groceries',
      rawText: 'extra ocr text',
    })

    expect(text).toContain('Shufersal')
    expect(text).toContain('groceries')
    expect(text).toContain('120')
    expect(text).toContain('Milk')
    expect(text).toContain('Weekly groceries')
  })

  it('returns an empty string when every field is empty', () => {
    expect(buildSignalQueryText({ lineItems: [] })).toBe('')
  })
})

describe('buildLineItemsText', () => {
  it('renders a bullet per line item', () => {
    const text = buildLineItemsText({ lineItems: [{ description: 'Bread', amount: 3.5 }] })
    expect(text).toBe('- Bread: 3.5')
  })

  it('returns an empty string with no line items', () => {
    expect(buildLineItemsText({})).toBe('')
  })
})
