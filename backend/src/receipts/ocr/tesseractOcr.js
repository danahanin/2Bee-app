const Tesseract = require('tesseract.js')
const { makeOcrResult } = require('../contracts')

const DEFAULT_LANG = process.env.OCR_LANG || 'heb+eng'
// PSM 4 = single column of variable-size text, which matches the narrow receipt
// layout and stops Tesseract from reading the photo background as extra columns.
const DEFAULT_PSM = process.env.OCR_PSM || '4'
const LSTM_ONLY = 1

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
async function runOcr(buffer, { lang = DEFAULT_LANG, imageRef = null } = {}) {
  const worker = await Tesseract.createWorker(lang, LSTM_ONLY)

  try {
    await worker.setParameters({ tessedit_pageseg_mode: DEFAULT_PSM })
    const { data } = await worker.recognize(buffer)

    return makeOcrResult({
      rawText: data.text || '',
      confidence: confidenceOf(data),
      imageRef,
    })
  } finally {
    await worker.terminate()
  }
}

module.exports = { confidenceOf, runOcr }
