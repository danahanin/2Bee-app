const Tesseract = require('tesseract.js')
const { makeOcrResult } = require('../contracts')

const DEFAULT_LANG = process.env.OCR_LANG || 'heb+eng'
// PSM 4 (single column) reads the receipt body cleanly; PSM 11 (sparse text)
// finds isolated large-font numbers like the total that PSM 4 drops. We run both
// and merge the price lines so the extractor still sees the totals.
const PRIMARY_PSM = process.env.OCR_PSM || '4'
const FALLBACK_PSM = process.env.OCR_FALLBACK_PSM || '11'
// Receipts are mostly non-words (prices, codes), so the word dictionaries can
// hurt. Toggle with OCR_DISABLE_DICTIONARY=true. These must be set at init.
const DISABLE_DICTIONARY = process.env.OCR_DISABLE_DICTIONARY === 'true'
const LSTM_ONLY = 1
const PRICE_PATTERN = /\d{1,4}[.,]\d{2}/

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

function normalizeLine(line) {
  return line.replace(/\s+/g, '')
}

/**
 * Return price-bearing lines from the fallback pass that the primary pass missed.
 * @param {string} primaryText
 * @param {string} fallbackText
 * @returns {string[]}
 */
function recoverPriceLines(primaryText, fallbackText) {
  const seen = new Set(primaryText.split('\n').map(normalizeLine))

  return fallbackText
    .split('\n')
    .filter((line) => PRICE_PATTERN.test(line) && !seen.has(normalizeLine(line)))
}

/**
 * Merge the clean primary text with any price lines recovered from the fallback.
 * @param {string} primaryText
 * @param {string} fallbackText
 * @returns {string}
 */
function mergeOcrText(primaryText, fallbackText) {
  const recovered = recoverPriceLines(primaryText, fallbackText)
  return recovered.length ? `${primaryText}\n${recovered.join('\n')}` : primaryText
}

function initConfig() {
  if (!DISABLE_DICTIONARY) {
    return {}
  }

  return { load_system_dawg: '0', load_freq_dawg: '0' }
}

async function recognizeWith(buffer, lang, psm) {
  const worker = await Tesseract.createWorker(lang, LSTM_ONLY, {}, initConfig())

  try {
    await worker.setParameters({ tessedit_pageseg_mode: psm })
    const { data } = await worker.recognize(buffer)
    return data
  } finally {
    await worker.terminate()
  }
}

/**
 * Run OCR over an image buffer and return a normalized OcrResult.
 * @param {Buffer} buffer Image bytes (already preprocessed).
 * @param {{ lang?: string, imageRef?: string|null }} [options]
 * @returns {Promise<import('../contracts').OcrResult>}
 */
async function runOcr(buffer, { lang = DEFAULT_LANG, imageRef = null } = {}) {
  const primary = await recognizeWith(buffer, lang, PRIMARY_PSM)
  const fallback = await recognizeWith(buffer, lang, FALLBACK_PSM)

  return makeOcrResult({
    rawText: mergeOcrText(primary.text || '', fallback.text || ''),
    confidence: confidenceOf(primary),
    imageRef,
  })
}

module.exports = { confidenceOf, recoverPriceLines, mergeOcrText, runOcr }
