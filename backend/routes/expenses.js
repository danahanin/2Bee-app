const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const hiveController = require('../controllers/hiveController')

const router = Router()

router.use(authMiddleware)

router.get('/personal', hiveController.getPersonalExpenses)

module.exports = router
