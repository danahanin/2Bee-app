const { CATEGORIES } = require('../../models/Expense')

/**
 * Raw OCR output for a scanned receipt image.
 * @typedef {Object} OcrResult
 * @property {string} rawText Full text recognized from the image.
 * @property {number} confidence Overall confidence normalized to 0..1.
 * @property {string|null} imageRef Reference to the stored image (path/key), or null.
 * @property {string} source OCR engine that produced the result (e.g. 'tesseract').
 */

/**
 * Structured fields parsed from a receipt. All fields are nullable until a
 * downstream extractor fills them in; rawText carries the OCR text in the meantime.
 * @typedef {Object} ExtractedReceipt
 * @property {string|null} vendor
 * @property {number|null} amount
 * @property {string|null} currency
 * @property {string|null} date ISO 8601 date string, or null.
 * @property {string|null} category One of CATEGORIES, or null.
 * @property {Array<{ description: string, amount: number }>} lineItems
 * @property {string} rawText OCR text used to fill the fields.
 */

/**
 * One retrieved few-shot example used to justify a classification.
 * @typedef {Object} RetrievedExample
 * @property {string} text
 * @property {'personal'|'shared'} type
 * @property {number} score Cosine similarity 0..1.
 */

/**
 * Phase 1 output: personal vs shared expense classification.
 * @typedef {Object} Classification
 * @property {'personal'|'shared'} type
 * @property {number} confidence 0..1
 * @property {string} reasoning
 * @property {RetrievedExample[]} retrieved
 */

/**
 * Phase 2 output: suggested named hive group for a shared receipt.
 * @typedef {Object} HiveSuggestion
 * @property {string|null} expenseGroupId
 * @property {string|null} groupName
 * @property {number} confidence 0..1
 * @property {string} reasoning
 * @property {Array<{ groupId: string, name: string, score: number }>} alternatives
 */

/**
 * A scanned receipt ready for user review: links the persisted receipt to its
 * OCR result, extracted fields, and optional classification.
 * @typedef {Object} ReceiptDraft
 * @property {string|null} receiptId Persisted Receipt document id, or null.
 * @property {OcrResult} ocr
 * @property {ExtractedReceipt} extracted
 * @property {Classification|null} [classification]
 * @property {HiveSuggestion|null} [hiveSuggestion]
 */

/**
 * Build an OcrResult, always tagging the source as the OCR engine.
 * @param {{ rawText?: string, confidence?: number, imageRef?: string|null, source?: string }} [input]
 * @returns {OcrResult}
 */
function makeOcrResult({ rawText = '', confidence = 0, imageRef = null, source = 'tesseract' } = {}) {
  return { rawText, confidence, imageRef, source }
}

/**
 * Build an ExtractedReceipt. Every parsed field defaults to null so callers can
 * return a receipt with only rawText set (no fabricated values).
 * @param {Partial<ExtractedReceipt>} [input]
 * @returns {ExtractedReceipt}
 */
function makeExtractedReceipt({
  vendor = null,
  amount = null,
  currency = null,
  date = null,
  category = null,
  lineItems = [],
  rawText = '',
} = {}) {
  return { vendor, amount, currency, date, category, lineItems, rawText }
}

/**
 * Build a Classification result.
 * @param {{ type: 'personal'|'shared', confidence: number, reasoning?: string, retrieved?: RetrievedExample[] }} input
 * @returns {Classification}
 */
function makeClassification({ type, confidence, reasoning = '', retrieved = [] }) {
  return { type, confidence, reasoning, retrieved }
}

/**
 * Build a HiveSuggestion result.
 * @param {{ expenseGroupId?: string|null, groupName?: string|null, confidence?: number, reasoning?: string, alternatives?: Array<{ groupId: string, name: string, score: number }> }} [input]
 * @returns {HiveSuggestion}
 */
function makeHiveSuggestion({
  expenseGroupId = null,
  groupName = null,
  confidence = 0,
  reasoning = '',
  alternatives = [],
} = {}) {
  return { expenseGroupId, groupName, confidence, reasoning, alternatives }
}

/**
 * Build a ReceiptDraft from its parts.
 * @param {{ receiptId?: string|null, ocr: OcrResult, extracted: ExtractedReceipt, classification?: Classification|null }} input
 * @returns {ReceiptDraft}
 */
function makeReceiptDraft({ receiptId = null, ocr, extracted, classification = null, hiveSuggestion = null }) {
  return { receiptId, ocr, extracted, classification, hiveSuggestion }
}

module.exports = {
  CATEGORIES,
  makeOcrResult,
  makeExtractedReceipt,
  makeClassification,
  makeHiveSuggestion,
  makeReceiptDraft,
}
