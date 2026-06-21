const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const Receipt = require('../../models/Receipt')
const { sendError } = require('../../utils/appError')
const { scanReceipt } = require('./receiptPipeline')
const { makeReceiptDraft } = require('./contracts')

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads')

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
}

function extensionFor(file) {
  return EXTENSION_BY_MIME[file.mimetype] || path.extname(file.originalname || '') || '.img'
}

function saveImage(file) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const filename = `${crypto.randomUUID()}${extensionFor(file)}`
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer)
  return filename
}

async function scan(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { code: 'NO_FILE', message: 'An image file is required' } })
    }

    const { ocr, extracted, fieldConfidence, classification } = await scanReceipt(req.file.buffer)

    const imageRef = saveImage(req.file)
    ocr.imageRef = imageRef

    const receipt = await Receipt.create({
      userId: req.user.userId,
      imageRef,
      status: 'scanned',
      ocr: { rawText: ocr.rawText, confidence: ocr.confidence, source: ocr.source },
    })

    const draft = makeReceiptDraft({ receiptId: String(receipt._id), ocr, extracted, classification })
    draft.fieldConfidence = fieldConfidence
    res.status(201).json({ data: draft })
  } catch (err) {
    sendError(res, err, err.message)
  }
}

module.exports = { scan }
