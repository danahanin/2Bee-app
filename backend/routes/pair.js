const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const { generatePairCode, joinPair, getPairStatus } = require('../controllers/pairController')

const router = Router()

router.use(authMiddleware)
router.post('/pair/generate', generatePairCode)
router.post('/pair/join', joinPair)
router.get('/pair/status', getPairStatus)

module.exports = router
