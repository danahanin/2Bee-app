const { Router } = require('express')
const { register, login, logout, refresh } = require('../controllers/authController')

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.post('/refresh', refresh)

module.exports = router
