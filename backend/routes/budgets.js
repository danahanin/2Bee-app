const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const budgetController = require('../controllers/budgetController')

const router = Router()

router.use(authMiddleware)

router.get('/', budgetController.listBudgets)
router.post('/', budgetController.createBudget)
router.put('/:id', budgetController.updateBudget)
router.delete('/:id', budgetController.deleteBudget)

module.exports = router
