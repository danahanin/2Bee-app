const fxService = require('../services/fxService')

async function getRates(req, res, next) {
  try {
    const liveRates = await fxService.getRates()
    // Always expose the currencies the app supports, even if the live feed
    // is missing a code — the frontend needs these to convert display totals.
    const rates = {
      ...fxService.STATIC_RATES,
      ...liveRates,
      [fxService.BASE_CURRENCY]: 1,
    }
    return res.json({ base: fxService.BASE_CURRENCY, rates, updatedAt: new Date().toISOString() })
  } catch (error) {
    return next(error)
  }
}

module.exports = { getRates }
