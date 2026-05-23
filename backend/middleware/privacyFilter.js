const mongoose = require('mongoose')
const User = require('../models/User')

/**
 * Privacy filter middleware — enforces Dana's privacy settings.
 *
 * When a user's partner has `hidePersonalExpenses: true`, API responses from
 * the Hive and expense endpoints must not include that partner's personal
 * expenses. Similarly, `hidePersonalBalance` hides balance details.
 *
 * This middleware attaches a `req.privacyContext` object that controllers
 * and services can check before including sensitive data in responses.
 */
async function privacyFilter(req, res, next) {
  req.privacyContext = {
    partnerHidesExpenses: false,
    partnerHidesIncome: false,
    partnerHidesBalance: false,
    partnerUserId: null,
  }

  if (mongoose.connection.readyState !== 1 || !req.user?.userId) {
    return next()
  }

  try {
    const currentUser = await User.findById(req.user.userId).lean()
    if (!currentUser?.pairId) return next()

    const partner = await User.findById(currentUser.pairId).lean()
    if (!partner) return next()

    const settings = partner.privacySettings || {}
    req.privacyContext = {
      partnerHidesExpenses: Boolean(settings.hidePersonalExpenses),
      partnerHidesIncome: Boolean(settings.hidePersonalIncome),
      partnerHidesBalance: Boolean(settings.hidePersonalBalance),
      partnerUserId: partner._id,
    }
  } catch (err) {
    console.warn('privacyFilter lookup failed:', err.message)
  }

  return next()
}

module.exports = privacyFilter
