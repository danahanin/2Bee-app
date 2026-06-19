const mongoose = require('mongoose')
const Expense = require('../models/Expense')
const {
  normalizeRange,
  utcMonthSlices,
  monthKeyFromDate,
} = require('../utils/parseDateRange')
const { utcMonthRange } = require('./dashboardService')

function buildExpenseMatch({ type, userId, hiveId, from, to }) {
  const match = {
    type,
    isDeleted: false,
    date: { $gte: from, $lte: to },
  }

  if (type === 'personal') {
    match.userId = userId
  } else {
    match.hiveId = new mongoose.Types.ObjectId(hiveId)
  }

  return match
}

async function aggregateByCategory(match) {
  const rows = await Expense.aggregate([
    { $match: match },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ])

  return rows.map((row) => ({
    category: row._id,
    amount: row.total,
  }))
}

function withPercents(items) {
  const total = items.reduce((sum, row) => sum + row.amount, 0)
  return items.map((row) => ({
    ...row,
    percent: total > 0 ? Math.round((row.amount / total) * 1000) / 10 : 0,
  }))
}

function computeTrend(values) {
  if (values.length < 2) return 'stable'
  const previous = values[values.length - 2]
  const current = values[values.length - 1]
  if (previous === 0 && current === 0) return 'stable'
  if (previous === 0) return current > 0 ? 'up' : 'stable'
  const changeRatio = (current - previous) / previous
  if (changeRatio >= 0.05) return 'up'
  if (changeRatio <= -0.05) return 'down'
  return 'stable'
}

async function getSpendingBreakdown({ type, userId, hiveId, fromInput, toInput }) {
  const { from, to } = normalizeRange(fromInput, toInput)
  if (type === 'shared' && !hiveId) {
    return {
      type,
      from: from.toISOString(),
      to: to.toISOString(),
      total: 0,
      breakdown: [],
      message: 'No hive — pair with a partner to see shared analytics.',
    }
  }

  const match = buildExpenseMatch({ type, userId, hiveId, from, to })
  const breakdown = withPercents(await aggregateByCategory(match))
  const total = breakdown.reduce((sum, row) => sum + row.amount, 0)

  return {
    type,
    from: from.toISOString(),
    to: to.toISOString(),
    total,
    breakdown,
  }
}

async function aggregateCategoryTotalsByMonth(match, monthKeys) {
  const rows = await Expense.aggregate([
    { $match: match },
    {
      $addFields: {
        ymKey: {
          $dateToString: {
            format: '%Y-%m',
            date: '$date',
            timezone: 'UTC',
          },
        },
      },
    },
    {
      $group: {
        _id: { category: '$category', ym: '$ymKey' },
        total: { $sum: '$amount' },
      },
    },
  ])

  const seriesMap = new Map()

  for (const row of rows) {
    const category = row._id.category
    const ym = row._id.ym
    if (!monthKeys.includes(ym)) continue

    if (!seriesMap.has(category)) {
      seriesMap.set(
        category,
        Object.fromEntries(monthKeys.map((key) => [key, 0])),
      )
    }
    seriesMap.get(category)[ym] = row.total
  }

  return seriesMap
}

function monthKeysAndSlicesBetween(from, to) {
  const monthKeys = []
  const slices = []
  let cursor = utcMonthRange(from).start
  const endAnchor = utcMonthRange(to).start

  while (cursor <= endAnchor) {
    const slice = utcMonthRange(cursor)
    monthKeys.push(monthKeyFromDate(slice.start))
    slices.push(slice)
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 15, 12, 0, 0, 0))
  }

  return { monthKeys, slices }
}

async function getTrends({ type, userId, hiveId, monthsCount, fromInput, toInput }) {
  let slices
  let monthKeys

  if (fromInput || toInput) {
    const { from, to } = normalizeRange(fromInput, toInput)
    const ranged = monthKeysAndSlicesBetween(from, to)
    monthKeys = ranged.monthKeys
    slices = ranged.slices
  } else {
    slices = utcMonthSlices(monthsCount)
    monthKeys = slices.map((slice) => monthKeyFromDate(slice.start))
  }

  if (type === 'shared' && !hiveId) {
    return {
      type,
      months: monthKeys,
      series: [],
      message: 'No hive — pair with a partner to see shared analytics.',
    }
  }

  const rangeStart = slices[0].start
  const rangeEnd = slices[slices.length - 1].end
  const match = buildExpenseMatch({ type, userId, hiveId, from: rangeStart, to: rangeEnd })
  const seriesMap = await aggregateCategoryTotalsByMonth(match, monthKeys)

  const series = Array.from(seriesMap.entries())
    .map(([category, totalsByMonth]) => {
      const data = monthKeys.map((key) => totalsByMonth[key] || 0)
      const hasSpend = data.some((value) => value > 0)
      if (!hasSpend) return null
      return {
        category,
        data,
        trend: computeTrend(data),
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const totalA = a.data.reduce((sum, value) => sum + value, 0)
      const totalB = b.data.reduce((sum, value) => sum + value, 0)
      return totalB - totalA
    })

  return {
    type,
    months: monthKeys,
    from: rangeStart.toISOString(),
    to: rangeEnd.toISOString(),
    series,
  }
}

async function getMonthTotalsByCategory(match) {
  const rows = await aggregateByCategory(match)
  return rows.reduce((acc, row) => {
    acc[row.category] = row.amount
    return acc
  }, {})
}

function buildComparisonCategories(currentByCategory, previousByCategory) {
  const categories = new Set([
    ...Object.keys(currentByCategory),
    ...Object.keys(previousByCategory),
  ])

  return Array.from(categories)
    .map((category) => {
      const current = currentByCategory[category] || 0
      const previous = previousByCategory[category] || 0
      let changePercent = null
      if (previous > 0) {
        changePercent = Math.round(((current - previous) / previous) * 1000) / 10
      } else if (current > 0) {
        changePercent = 100
      }
      return { category, current, previous, changePercent }
    })
    .sort((a, b) => b.current - a.current)
}

async function getComparison({ type, userId, hiveId }) {
  const currentRange = utcMonthRange()
  const previousRef = new Date(
    Date.UTC(currentRange.start.getUTCFullYear(), currentRange.start.getUTCMonth() - 1, 15),
  )
  const previousRange = utcMonthRange(previousRef)

  if (type === 'shared' && !hiveId) {
    return {
      type,
      currentMonth: {
        key: monthKeyFromDate(currentRange.start),
        from: currentRange.start.toISOString(),
        to: currentRange.end.toISOString(),
        total: 0,
        byCategory: {},
      },
      previousMonth: {
        key: monthKeyFromDate(previousRange.start),
        from: previousRange.start.toISOString(),
        to: previousRange.end.toISOString(),
        total: 0,
        byCategory: {},
      },
      categories: [],
      forecast: null,
      forecastNote: 'Forecast comparison will be available when AI forecast data is wired.',
      message: 'No hive — pair with a partner to see shared analytics.',
    }
  }

  const currentMatch = buildExpenseMatch({
    type,
    userId,
    hiveId,
    from: currentRange.start,
    to: currentRange.end,
  })
  const previousMatch = buildExpenseMatch({
    type,
    userId,
    hiveId,
    from: previousRange.start,
    to: previousRange.end,
  })

  const [currentByCategory, previousByCategory] = await Promise.all([
    getMonthTotalsByCategory(currentMatch),
    getMonthTotalsByCategory(previousMatch),
  ])

  const currentTotal = Object.values(currentByCategory).reduce((sum, value) => sum + value, 0)
  const previousTotal = Object.values(previousByCategory).reduce((sum, value) => sum + value, 0)

  return {
    type,
    currentMonth: {
      key: monthKeyFromDate(currentRange.start),
      from: currentRange.start.toISOString(),
      to: currentRange.end.toISOString(),
      total: currentTotal,
      byCategory: currentByCategory,
    },
    previousMonth: {
      key: monthKeyFromDate(previousRange.start),
      from: previousRange.start.toISOString(),
      to: previousRange.end.toISOString(),
      total: previousTotal,
      byCategory: previousByCategory,
    },
    categories: buildComparisonCategories(currentByCategory, previousByCategory),
    forecast: null,
    forecastNote: 'Forecast comparison will be available when AI forecast data is wired.',
  }
}

module.exports = {
  getSpendingBreakdown,
  getTrends,
  getComparison,
}
