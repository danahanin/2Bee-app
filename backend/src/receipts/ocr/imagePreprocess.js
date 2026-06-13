const sharp = require('sharp')
const heicConvert = require('heic-convert')
const { AppError } = require('../../../utils/appError')

const HEIC_BRANDS = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1']

/**
 * Detect HEIC/HEIF by its ISO-BMFF `ftyp` box brand. sharp's prebuilt binary
 * ships an AV1 decoder (AVIF) but not the HEVC decoder iPhone HEIC needs, so we
 * route those files through heic-convert first.
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isHeic(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return false
  }
  if (buffer.toString('ascii', 4, 8) !== 'ftyp') {
    return false
  }
  const brand = buffer.toString('ascii', 8, 12)
  return HEIC_BRANDS.includes(brand)
}

/**
 * Decode a HEIC buffer to a JPEG buffer that sharp/Tesseract can read.
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
async function heicToJpeg(buffer) {
  const output = await heicConvert({ buffer, format: 'JPEG', quality: 0.92 })
  return Buffer.from(output)
}

/**
 * Normalize a receipt image into a clean PNG that Tesseract/Leptonica can decode.
 *
 * Without this, formats like HEIC (or corrupt uploads) reach Tesseract as raw
 * bytes and crash the OCR worker with "Unknown format: no pix returned".
 *
 * @param {Buffer} buffer Raw image bytes from the upload.
 * @returns {Promise<Buffer>}
 */
async function preprocess(buffer) {
  try {
    const decodable = isHeic(buffer) ? await heicToJpeg(buffer) : buffer

    return await sharp(decodable)
      .rotate()
      .resize({ width: 2000, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer()
  } catch (err) {
    throw new AppError(
      415,
      'UNSUPPORTED_IMAGE',
      'The uploaded file could not be read as an image. Please use a JPEG, PNG, WEBP, or HEIC photo.',
      { cause: err.message },
    )
  }
}

module.exports = { preprocess, isHeic }
