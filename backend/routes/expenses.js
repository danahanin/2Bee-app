const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const privacyFilterMiddleware = require('../middleware/privacyFilter')
const hiveController = require('../controllers/hiveController')

const router = Router()

router.use(authMiddleware)

router.get('/personal', privacyFilterMiddleware, hiveController.getPersonalExpenses)
router.post('/', hiveController.createPersonalExpense)

module.exports = router
