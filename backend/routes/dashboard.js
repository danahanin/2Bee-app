const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const privacyFilterMiddleware = require('../middleware/privacyFilter')
const dashboardController = require('../controllers/dashboardController')

const router = Router()

router.use(authMiddleware)

router.get('/personal', privacyFilterMiddleware, dashboardController.getPersonal)
router.get('/shared', dashboardController.getShared)

module.exports = router
