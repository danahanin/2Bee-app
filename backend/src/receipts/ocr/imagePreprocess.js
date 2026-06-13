/**
 * Prepare a receipt image buffer for OCR.
 *
 * POC: passthrough — returns the buffer unchanged. This is the seam where
 * deskew/denoise/grayscale (e.g. via `sharp`) lands for the end product.
 *
 * @param {Buffer} buffer Raw image bytes.
 * @returns {Promise<Buffer>}
 */
async function preprocess(buffer) {
  return buffer
}

module.exports = { preprocess }
