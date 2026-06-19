const { AppError } = require('./appError')
const { utcMonthRange } = require('../services/dashboardService')

function parseDateParam(value, name) {
  if (value == null || value === '') return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, 'VALIDATION_ERROR', `Invalid ${name}`)
  }
  return parsed
}

function normalizeRange(fromInput, toInput, referenceDate = new Date()) {
  const defaultRange = utcMonthRange(referenceDate)
  const to = parseDateParam(toInput, 'to') ?? defaultRange.end
  const from = parseDateParam(fromInput, 'from') ?? defaultRange.start

  if (from > to) {
    throw new AppError(400, 'VALIDATION_ERROR', 'from must be before or equal to to')
  }

  return { from, to }
}

function parseExpenseType(value) {
  if (value === 'personal' || value === 'shared') return value
  throw new AppError(400, 'VALIDATION_ERROR', 'type must be personal or shared')
}

function parseMonthsCount(value, defaultCount = 6) {
  if (value == null || value === '') return defaultCount
  const count = Number.parseInt(String(value), 10)
  if (!Number.isFinite(count) || count < 1 || count > 24) {
    throw new AppError(400, 'VALIDATION_ERROR', 'months must be an integer between 1 and 24')
  }
  return count
}

function utcMonthSlices(count, referenceDate = new Date()) {
  const slices = []
  for (let back = count - 1; back >= 0; back -= 1) {
    const ref = new Date(
      Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - back, 15, 12, 0, 0, 0),
    )
    slices.push(utcMonthRange(ref))
  }
  return slices
}

function monthKeyFromDate(date) {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

module.exports = {
  normalizeRange,
  parseExpenseType,
  parseMonthsCount,
  utcMonthSlices,
  monthKeyFromDate,
}
