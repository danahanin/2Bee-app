const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const goalController = require('../controllers/goalController')

const router = Router()

router.use(authMiddleware)

router.get('/', goalController.listGoals)
router.post('/', goalController.createGoal)

module.exports = router
