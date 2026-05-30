const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const privacyFilterMiddleware = require('../middleware/privacyFilter')
const hiveController = require('../controllers/hiveController')

const router = Router()

router.use(authMiddleware)

router.get('/:id', hiveController.getHive)
router.get('/:id/balance', hiveController.getHiveBalance)
router.get('/:id/expenses', privacyFilterMiddleware, hiveController.getHiveExpenses)
router.get('/:id/transfers', hiveController.getHiveTransfers)
router.get('/:id/notifications', hiveController.getHiveNotifications)
router.post('/:id/expenses', hiveController.createHiveExpense)
router.post('/:id/transfers', hiveController.createHiveTransfer)
router.put('/:id/expenses/:expId', hiveController.updateHiveExpense)
router.delete('/:id/expenses/:expId', hiveController.deleteHiveExpense)

module.exports = router
