const { preprocess } = require('./ocr/imagePreprocess')
const { runOcr } = require('./ocr/tesseractOcr')
const { extractReceipt } = require('./extract/extractReceipt')
const { classifyPersonalShared } = require('../ai/phase1/classifyPersonalShared')

/**
 * Scan a receipt image: preprocess, run OCR, extract structured fields, classify.
 *
 * @param {Buffer} buffer Raw image bytes from the upload.
 * @param {{ lang?: string, imageRef?: string|null }} [options]
 * @returns {Promise<{ ocr: import('./contracts').OcrResult, extracted: import('./contracts').ExtractedReceipt, fieldConfidence: import('./extract/extractReceipt').FieldConfidence, classification: import('./contracts').Classification }>}
 */
async function scanReceipt(buffer, options = {}) {
  const processed = await preprocess(buffer)
  const ocr = await runOcr(processed, options)
  const { extracted, fieldConfidence } = extractReceipt(ocr)
  const classification = await classifyPersonalShared(extracted)

  return { ocr, extracted, fieldConfidence, classification }
}

module.exports = { scanReceipt }
