const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const privacyFilterMiddleware = require('../middleware/privacyFilter')
const analyticsController = require('../controllers/analyticsController')

const router = Router()

router.use(authMiddleware)

router.get('/spending-breakdown', privacyFilterMiddleware, analyticsController.getSpendingBreakdown)
router.get('/trends', privacyFilterMiddleware, analyticsController.getTrends)
router.get('/comparison', privacyFilterMiddleware, analyticsController.getComparison)

module.exports = router
