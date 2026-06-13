const express = require('express')
const multer = require('multer')

const authMiddleware = require('../../middleware/auth')
const receiptsController = require('../receipts/receipts.controller')

const upload = multer({ storage: multer.memoryStorage() })
const router = express.Router()

router.post('/scan', authMiddleware, upload.single('image'), receiptsController.scan)

module.exports = router
