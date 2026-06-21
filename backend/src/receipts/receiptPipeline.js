const { preprocess } = require('./ocr/imagePreprocess')
const { runOcr } = require('./ocr/tesseractOcr')
const { extractReceipt } = require('./extract/extractReceipt')
const { classifyPersonalShared } = require('../ai/phase1/classifyPersonalShared')
const { suggestHive } = require('../ai/phase2/suggestHive')

/**
 * Scan a receipt image: preprocess, run OCR, extract structured fields, classify.
 *
 * @param {Buffer} buffer Raw image bytes from the upload.
 * @param {{ lang?: string, imageRef?: string|null, hiveId?: string|null, userId?: string|null }} [options]
 * @returns {Promise<{ ocr: import('./contracts').OcrResult, extracted: import('./contracts').ExtractedReceipt, fieldConfidence: import('./extract/extractReceipt').FieldConfidence, classification: import('./contracts').Classification, hiveSuggestion: import('./contracts').HiveSuggestion|null }>}
 */
async function scanReceipt(buffer, options = {}) {
  const processed = await preprocess(buffer)
  const ocr = await runOcr(processed, options)
  const { extracted, fieldConfidence } = extractReceipt(ocr)
  const classification = await classifyPersonalShared(extracted)
  const hiveSuggestion =
    classification.type === 'shared'
      ? await suggestHive(extracted, { hiveId: options.hiveId, userId: options.userId })
      : null

  return { ocr, extracted, fieldConfidence, classification, hiveSuggestion }
}

module.exports = { scanReceipt }
