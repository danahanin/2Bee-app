const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const hiveController = require('../controllers/hiveController')

const router = Router()

router.use(authMiddleware)

router.get('/:id', hiveController.getHive)
router.get('/:id/expenses', hiveController.getHiveExpenses)
router.post('/:id/expenses', hiveController.createHiveExpense)
router.put('/:id/expenses/:expId', hiveController.updateHiveExpense)
router.delete('/:id/expenses/:expId', hiveController.deleteHiveExpense)

module.exports = router
