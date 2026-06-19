const fs = require('fs')
const path = require('path')
const { parseVendor } = require('../parseVendor')
const { parseAmount } = require('../parseAmount')
const { parseDate } = require('../parseDate')
const { parseLineItems } = require('../parseLineItems')
const { mapCategory } = require('../mapCategory')
const { extractReceipt } = require('../extractReceipt')
const { CATEGORIES } = require('../../../../models/Expense')

const fixturesDir = path.join(__dirname, 'fixtures')

function loadFixture(name) {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8')
}

describe('parseVendor', () => {
  const cases = [
    { name: 'first business line', text: 'CORNER STORE\n123 Main\nTOTAL 10', expected: 'CORNER STORE', minConfidence: 0.8 },
    { name: 'Hebrew supermarket', text: loadFixture('shufersal-hebrew.txt'), expected: 'שופרסל דיל', minConfidence: 0.8 },
    { name: 'skips total lines', text: 'TOTAL 50\nREAL SHOP', expected: 'REAL SHOP', minConfidence: 0.5 },
    { name: 'empty text', text: '', expected: null, minConfidence: 0 },
  ]

  it.each(cases)('$name', ({ text, expected, minConfidence }) => {
    const result = parseVendor(text)
    expect(result.value).toBe(expected)
    expect(result.confidence).toBeGreaterThanOrEqual(minConfidence)
  })
})

describe('parseAmount', () => {
  const cases = [
    { name: 'TOTAL keyword', text: 'ITEM\nTOTAL 42.50', expected: 42.5, currency: 'ILS' },
    { name: 'Hebrew total', text: loadFixture('shufersal-hebrew.txt'), expected: 21.4, currency: 'ILS' },
    { name: 'currency symbol prefix', text: 'TOTAL ₪18.00', expected: 18, currency: 'ILS' },
    { name: 'USD symbol', text: 'GRAND TOTAL $9.99', expected: 9.99, currency: 'USD' },
    { name: 'no amount', text: 'just words', expected: null, currency: null },
  ]

  it.each(cases)('$name', ({ text, expected, currency }) => {
    const result = parseAmount(text)
    expect(result.value).toBe(expected)
    expect(result.currency).toBe(currency)
    if (expected != null) {
      expect(result.confidence).toBeGreaterThan(0.4)
    } else {
      expect(result.confidence).toBe(0)
    }
  })
})

describe('parseDate', () => {
  const cases = [
    { name: 'DD/MM/YYYY', text: 'CORNER\n13/06/2026\nTOTAL 1', expected: '2026-06-13', minConfidence: 0.85 },
    { name: 'ISO date', text: 'CAFE\n2026-05-20', expected: '2026-05-20', minConfidence: 0.85 },
    { name: 'Hebrew label', text: loadFixture('shufersal-hebrew.txt'), expected: '2026-03-01', minConfidence: 0.9 },
    { name: 'fallback to today', text: 'no dates here', expected: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), minConfidence: 0.2 },
  ]

  it.each(cases)('$name', ({ text, expected, minConfidence }) => {
    const result = parseDate(text)
    expect(result.value).toEqual(expected)
    expect(result.confidence).toBeGreaterThanOrEqual(minConfidence)
  })
})

describe('parseLineItems', () => {
  const cases = [
    {
      name: 'multiple items',
      text: 'MILK 5.00\nBREAD 3.50\nTOTAL 8.50',
      expected: [
        { description: 'MILK', amount: 5 },
        { description: 'BREAD', amount: 3.5 },
      ],
    },
    {
      name: 'Hebrew items',
      text: loadFixture('shufersal-hebrew.txt'),
      expected: [
        { description: 'חלב', amount: 12.9 },
        { description: 'לחם', amount: 8.5 },
      ],
    },
    { name: 'no items', text: 'TOTAL 10', expected: [] },
  ]

  it.each(cases)('$name', ({ text, expected }) => {
    const result = parseLineItems(text)
    expect(result.value).toEqual(expected)
    if (expected.length > 0) {
      expect(result.confidence).toBeGreaterThan(0.6)
    }
  })
})

describe('mapCategory', () => {
  const cases = [
    { text: 'שופרסל חלב', vendor: 'שופרסל', lineItems: [{ description: 'חלב', amount: 5 }], expected: 'groceries' },
    { text: 'UBER ride', vendor: 'UBER', lineItems: [], expected: 'transport' },
    { text: 'misc purchase', vendor: 'XYZ Ltd', lineItems: [], expected: 'other' },
  ]

  it.each(cases)('$expected from $vendor', ({ text, vendor, lineItems, expected }) => {
    expect(mapCategory(text, vendor, lineItems).value).toBe(expected)
  })
})

describe('extractReceipt', () => {
  it('returns a valid contract for corner store fixture', () => {
    const text = loadFixture('corner-store.txt')
    const { extracted, fieldConfidence } = extractReceipt(text)

    expect(extracted.vendor).toBe('CORNER STORE')
    expect(extracted.amount).toBe(42.5)
    expect(extracted.currency).toBe('ILS')
    expect(extracted.date).toBe('2026-06-13')
    expect(extracted.category).toEqual(expect.any(String))
    expect(CATEGORIES).toContain(extracted.category)
    expect(extracted.lineItems).toEqual([
      { description: 'MILK', amount: 5 },
      { description: 'BREAD', amount: 3.5 },
    ])
    expect(extracted.rawText).toBe(text)
    expect(fieldConfidence.vendor).toBeGreaterThan(0.7)
    expect(fieldConfidence.amount).toBeGreaterThan(0.7)
  })

  it('returns a valid contract for Hebrew supermarket fixture', () => {
    const text = loadFixture('shufersal-hebrew.txt')
    const { extracted, fieldConfidence } = extractReceipt(text)

    expect(extracted.vendor).toContain('שופרסל')
    expect(extracted.amount).toBe(21.4)
    expect(extracted.category).toBe('groceries')
    expect(extracted.lineItems.length).toBeGreaterThanOrEqual(2)
    expect(fieldConfidence).toEqual(
      expect.objectContaining({
        vendor: expect.any(Number),
        amount: expect.any(Number),
        date: expect.any(Number),
        category: expect.any(Number),
        lineItems: expect.any(Number),
      }),
    )
  })

  it('accepts an OcrResult object', () => {
    const ocr = { rawText: 'CAFE AROMA\nTOTAL 18.00', confidence: 0.9, imageRef: null, source: 'tesseract' }
    const { extracted } = extractReceipt(ocr)
    expect(extracted.vendor).toBe('CAFE AROMA')
    expect(extracted.amount).toBe(18)
  })
})
