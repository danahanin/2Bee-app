const { preprocess } = require('./ocr/imagePreprocess')
const { runOcr } = require('./ocr/tesseractOcr')
const { makeExtractedReceipt } = require('./contracts')

/**
 * Scan a receipt image: preprocess, run OCR, and return the OCR result alongside
 * an empty extracted draft (only rawText is carried over — no fabricated values).
 *
 * @param {Buffer} buffer Raw image bytes from the upload.
 * @param {{ lang?: string, imageRef?: string|null }} [options]
 * @returns {Promise<{ ocr: import('./contracts').OcrResult, extracted: import('./contracts').ExtractedReceipt }>}
 */
async function scanReceipt(buffer, options = {}) {
  const processed = await preprocess(buffer)
  const ocr = await runOcr(processed, options)

  // SEAM: Dana's extractReceipt(ocr) plugs in here to parse vendor/amount/date/
  // category/lineItems from ocr.rawText. Until then we return an empty draft so
  // the review form starts blank instead of with guessed values.
  const extracted = makeExtractedReceipt({ rawText: ocr.rawText })

  return { ocr, extracted }
}

module.exports = { scanReceipt }
