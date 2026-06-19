const { makeExtractedReceipt } = require('../contracts')
const { parseVendor } = require('./parseVendor')
const { parseAmount } = require('./parseAmount')
const { parseDate } = require('./parseDate')
const { parseLineItems } = require('./parseLineItems')
const { mapCategory } = require('./mapCategory')

/**
 * @typedef {Object} FieldConfidence
 * @property {number} vendor
 * @property {number} amount
 * @property {number} currency
 * @property {number} date
 * @property {number} category
 * @property {number} lineItems
 */

/**
 * Turn OCR text into structured receipt fields.
 * @param {import('../contracts').OcrResult|string} ocrOrText
 * @returns {{ extracted: import('../contracts').ExtractedReceipt, fieldConfidence: FieldConfidence }}
 */
function extractReceipt(ocrOrText) {
  const rawText = typeof ocrOrText === 'string' ? ocrOrText : ocrOrText?.rawText || ''

  const vendorResult = parseVendor(rawText)
  const amountResult = parseAmount(rawText)
  const dateResult = parseDate(rawText)
  const lineItemsResult = parseLineItems(rawText)
  const categoryResult = mapCategory(rawText, vendorResult.value, lineItemsResult.value)

  const extracted = makeExtractedReceipt({
    vendor: vendorResult.value,
    amount: amountResult.value,
    currency: amountResult.currency,
    date: dateResult.value,
    category: categoryResult.value,
    lineItems: lineItemsResult.value,
    rawText,
  })

  const fieldConfidence = {
    vendor: vendorResult.confidence,
    amount: amountResult.confidence,
    currency: amountResult.currency ? 0.7 : 0,
    date: dateResult.confidence,
    category: categoryResult.confidence,
    lineItems: lineItemsResult.confidence,
  }

  return { extracted, fieldConfidence }
}

module.exports = { extractReceipt }
