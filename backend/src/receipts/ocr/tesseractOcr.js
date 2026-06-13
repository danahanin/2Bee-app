const Tesseract = require('tesseract.js')
const { makeOcrResult } = require('../contracts')

/**
 * Normalize Tesseract's 0..100 confidence to a clamped 0..1 value.
 * @param {{ confidence?: number }} [tesseractData]
 * @returns {number}
 */
function confidenceOf(tesseractData) {
  const raw = tesseractData && typeof tesseractData.confidence === 'number' ? tesseractData.confidence : 0
  const normalized = raw / 100

  if (normalized < 0) {
    return 0
  }

  if (normalized > 1) {
    return 1
  }

  return normalized
}

/**
 * Run OCR over an image buffer and return a normalized OcrResult.
 * @param {Buffer} buffer Image bytes (already preprocessed).
 * @param {{ lang?: string, imageRef?: string|null }} [options]
 * @returns {Promise<import('../contracts').OcrResult>}
 */
async function runOcr(buffer, { lang = 'eng', imageRef = null } = {}) {
  const { data } = await Tesseract.recognize(buffer, lang)

  return makeOcrResult({
    rawText: data.text || '',
    confidence: confidenceOf(data),
    imageRef,
  })
}

module.exports = { confidenceOf, runOcr }
