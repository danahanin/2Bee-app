/**
 * Currency routes — exchange rate lookup for the frontend's display-currency
 * conversion. Not gated by auth: rates are not user-specific or sensitive.
 *
 *   GET /rates — current FX rates, base currency, and cache timestamp
 */

const { Router } = require('express')
const { getRates } = require('../controllers/currencyController')

const router = Router()

router.get('/rates', getRates)

module.exports = router
