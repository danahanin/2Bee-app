const mongoose = require('mongoose')
const User = require('../models/User')

const INCOME_FIELDS = new Set(['income', 'monthlyIncome', 'annualIncome'])
const BALANCE_FIELDS = new Set(['personalBalance', 'currentBalance'])

function getPrimaryTargetUserId(req) {
  const queryUserId = typeof req.query?.userId === 'string' ? req.query.userId.trim() : ''
  if (queryUserId) return queryUserId

  const bodyUserId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : ''
  if (bodyUserId) return bodyUserId

  return null
}

function shouldInspectIncomeNarrative(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    (typeof entry.title === 'string' ||
      typeof entry.message === 'string' ||
      typeof entry.body === 'string' ||
      typeof entry.description === 'string')
  )
}

function isIncomeNarrative(entry) {
  if (!shouldInspectIncomeNarrative(entry)) return false
  const text = [entry.title, entry.message, entry.body, entry.description]
    .filter((part) => typeof part === 'string')
    .join(' ')
    .toLowerCase()
  return text.includes('income')
}

function isPartnerPersonalExpense(entry, partnerUserId) {
  if (!entry || typeof entry !== 'object') return false
  if (entry.type !== 'personal') return false
  return entry.userId === partnerUserId || entry.paidBy?.id === partnerUserId
}

function filterPayload(payload, options) {
  const {
    hideIncome,
    hideBalance,
    hidePersonalExpenses,
    partnerUserId,
    allowFieldStripping,
  } = options

  if (Array.isArray(payload)) {
    return payload
      .filter((entry) => {
        if (hidePersonalExpenses && isPartnerPersonalExpense(entry, partnerUserId)) {
          return false
        }
        if (hideIncome && isIncomeNarrative(entry)) {
          return false
        }
        return true
      })
      .map((entry) => filterPayload(entry, options))
  }

  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const nextObject = {}
  for (const [key, value] of Object.entries(payload)) {
    if (allowFieldStripping && hideIncome && INCOME_FIELDS.has(key)) {
      continue
    }
    if (allowFieldStripping && hideBalance && BALANCE_FIELDS.has(key)) {
      continue
    }
    nextObject[key] = filterPayload(value, options)
  }

  return nextObject
}

async function privacyFilter(req, res, next) {
  req.privacyContext = {
    partnerHidesExpenses: false,
    partnerHidesIncome: false,
    partnerHidesBalance: false,
    partnerUserId: null,
    isPartnerScopedRequest: false,
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
    const targetUserId = getPrimaryTargetUserId(req)
    const isPartnerScopedRequest = targetUserId === partner._id

    req.privacyContext = {
      partnerHidesExpenses: Boolean(settings.hidePersonalExpenses),
      partnerHidesIncome: Boolean(settings.hidePersonalIncome),
      partnerHidesBalance: Boolean(settings.hidePersonalBalance),
      partnerUserId: partner._id,
      isPartnerScopedRequest,
    }

    const originalJson = res.json.bind(res)
    res.json = (payload) => {
      if (!req.privacyContext.partnerUserId) {
        return originalJson(payload)
      }

      const filterOptions = {
        hideIncome: req.privacyContext.partnerHidesIncome,
        hideBalance: req.privacyContext.partnerHidesBalance,
        hidePersonalExpenses: req.privacyContext.partnerHidesExpenses,
        partnerUserId: req.privacyContext.partnerUserId,
        allowFieldStripping: req.privacyContext.isPartnerScopedRequest,
      }

      if (
        !filterOptions.hideIncome &&
        !filterOptions.hideBalance &&
        !filterOptions.hidePersonalExpenses
      ) {
        return originalJson(payload)
      }

      const filteredPayload = filterPayload(payload, filterOptions)
      return originalJson(filteredPayload)
    }
  } catch (err) {
    console.warn('privacyFilter lookup failed:', err.message)
  }

  return next()
}

module.exports = privacyFilter
