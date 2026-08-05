const express = require('express')
const multer = require('multer')

const authMiddleware = require('../../middleware/auth')
const receiptsController = require('../receipts/receipts.controller')

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true)
      return
    }
    cb(new Error('Only JPEG, PNG, WebP, and HEIC images are allowed'))
  },
})
const router = express.Router()

router.post('/scan', authMiddleware, upload.single('image'), receiptsController.scan)
router.post('/confirm', authMiddleware, receiptsController.confirm)

module.exports = router
