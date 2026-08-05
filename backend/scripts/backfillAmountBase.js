/**
 * One-time migration: backfill `amountBase` + `fxRate` on Expense documents
 * created before multi-currency support existed. Safe to re-run — only
 * touches documents where `amountBase` is still null.
 */
const mongoose = require('mongoose')
const Expense = require('../models/Expense')
const fxService = require('../services/fxService')

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/twobee'

async function backfillCurrency(currency) {
  const rate = await fxService.getRate(currency, fxService.BASE_CURRENCY)

  const result = await Expense.updateMany(
    { currency, $or: [{ amountBase: null }, { amountBase: { $exists: false } }] },
    [{ $set: { fxRate: rate, amountBase: { $multiply: ['$amount', rate] } } }],
    { updatePipeline: true },
  )

  return { currency, rate, matched: result.matchedCount, modified: result.modifiedCount }
}

async function backfillAmountBase() {
  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const currencies = await Expense.distinct('currency', {
    $or: [{ amountBase: null }, { amountBase: { $exists: false } }],
  })

  if (currencies.length === 0) {
    console.log('Nothing to backfill — every expense already has amountBase.')
  } else {
    for (const currency of currencies) {
      const summary = await backfillCurrency(currency)
      console.log(
        `${summary.currency}: rate=${summary.rate.toFixed(4)} matched=${summary.matched} modified=${summary.modified}`,
      )
    }
  }

  await mongoose.disconnect()
  console.log('Done')
}

backfillAmountBase().catch(async (error) => {
  console.error('backfillAmountBase failed:', error)
  try {
    await mongoose.disconnect()
  } catch {
    // noop
  }
  process.exit(1)
})
