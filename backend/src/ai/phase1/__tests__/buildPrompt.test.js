const { buildFewShotPrompt, buildQueryText } = require('../buildPrompt')

describe('buildQueryText', () => {
  it('combines vendor, category, amount, and line items', () => {
    const text = buildQueryText({
      vendor: 'Shufersal',
      category: 'groceries',
      amount: 120,
      currency: 'ILS',
      lineItems: [{ description: 'Milk', amount: 6 }],
      rawText: 'extra ocr text',
    })
    expect(text).toContain('Shufersal')
    expect(text).toContain('groceries')
    expect(text).toContain('120')
    expect(text).toContain('Milk')
  })
})

describe('buildFewShotPrompt', () => {
  it('includes retrieved examples and receipt fields', () => {
    const prompt = buildFewShotPrompt(
      {
        vendor: 'Corner Store',
        amount: 42.5,
        currency: 'ILS',
        category: 'groceries',
        date: '2026-06-13',
        lineItems: [{ description: 'Bread', amount: 3.5 }],
        rawText: '',
      },
      [{ text: 'weekly supermarket groceries', type: 'shared', score: 0.9 }],
    )

    expect(prompt).toContain('weekly supermarket groceries')
    expect(prompt).toContain('→ shared')
    expect(prompt).toContain('Corner Store')
    expect(prompt).toContain('Bread')
    expect(prompt).toContain('"type"')
  })
})
