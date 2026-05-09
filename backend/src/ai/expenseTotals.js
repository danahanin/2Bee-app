const mongoose = require('mongoose');
const Expense = require('../../models/Expense');
const { utcMonthRange } = require('../../services/dashboardService');

const MS_PER_DAY = 86400000;
const DEFAULT_FORECAST_MONTHS = 3;

function addUtcMonths(referenceDate, deltaMonths) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth() + deltaMonths;
  return new Date(Date.UTC(year, month, 15, 12, 0, 0, 0));
}

function utcMonthSlicesOldestFirst(monthCount, referenceDate) {
  const slices = [];
  for (let back = monthCount - 1; back >= 0; back -= 1) {
    const ref = addUtcMonths(referenceDate, -back);
    slices.push(utcMonthRange(ref));
  }
  return slices;
}

function monthKeyFromSliceStart(sliceStart) {
  const y = sliceStart.getUTCFullYear();
  const m = sliceStart.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function toHiveObjectId(hiveId) {
  if (hiveId instanceof mongoose.Types.ObjectId) {
    return hiveId;
  }
  return new mongoose.Types.ObjectId(hiveId);
}

function personalExpenseMatch(userId, rangeStart, rangeEnd) {
  return {
    userId,
    type: 'personal',
    isDeleted: false,
    date: { $gte: rangeStart, $lte: rangeEnd },
  };
}

function sharedExpenseMatch(hiveObjectId, rangeStart, rangeEnd) {
  return {
    hiveId: hiveObjectId,
    type: 'shared',
    isDeleted: false,
    date: { $gte: rangeStart, $lte: rangeEnd },
  };
}

async function aggregateCategoryTotalsByMonthKey(matchFilter) {
  return Expense.aggregate([
    { $match: matchFilter },
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
        _id: {
          category: '$category',
          ym: '$ymKey',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);
}

function buildCategoryMonthTotals(rows, orderedMonthKeys) {
  const keyed = {};

  for (const row of rows) {
    const category = row._id.category;
    const ym = row._id.ym;
    if (!orderedMonthKeys.includes(ym)) {
      continue;
    }
    if (!keyed[category]) {
      keyed[category] = Object.fromEntries(
        orderedMonthKeys.map((k) => [k, 0])
      );
    }
    keyed[category][ym] = row.total;
  }

  const out = {};
  for (const [category, ymTotals] of Object.entries(keyed)) {
    const buckets = orderedMonthKeys.map((k) => ymTotals[k] || 0);
    const hasSpend = buckets.some((v) => v > 0);
    if (hasSpend) {
      out[category] = buckets;
    }
  }
  return out;
}

function utcRollingThirtyDayWindows(referenceDate = new Date()) {
  const end = new Date(referenceDate.getTime());
  const currentStart = new Date(end.getTime() - 30 * MS_PER_DAY);
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(end.getTime() - 60 * MS_PER_DAY);
  return {
    current: { start: currentStart, end },
    previous: { start: previousStart, end: previousEnd },
  };
}

async function aggregateSharedSpendByUser(hiveObjectId, rangeStart, rangeEnd) {
  const rows = await Expense.aggregate([
    { $match: sharedExpenseMatch(hiveObjectId, rangeStart, rangeEnd) },
    {
      $group: {
        _id: '$userId',
        total: { $sum: '$amount' },
      },
    },
  ]);
  return rows.reduce((acc, row) => {
    acc[row._id] = row.total;
    return acc;
  }, {});
}

async function getPersonalCategoryMonthTotals(userId, options = {}) {
  const monthCount = options.monthCount ?? DEFAULT_FORECAST_MONTHS;
  const referenceDate = options.referenceDate ?? new Date();

  const slices = utcMonthSlicesOldestFirst(monthCount, referenceDate);
  const orderedMonthKeys = slices.map((slice) =>
    monthKeyFromSliceStart(slice.start)
  );
  const rangeStart = slices[0].start;
  const rangeEnd = slices[slices.length - 1].end;

  const match = personalExpenseMatch(userId, rangeStart, rangeEnd);
  const rows = await aggregateCategoryTotalsByMonthKey(match);

  return buildCategoryMonthTotals(rows, orderedMonthKeys);
}

async function getSharedCategoryMonthTotals(hiveId, options = {}) {
  const monthCount = options.monthCount ?? DEFAULT_FORECAST_MONTHS;
  const referenceDate = options.referenceDate ?? new Date();

  const slices = utcMonthSlicesOldestFirst(monthCount, referenceDate);
  const orderedMonthKeys = slices.map((slice) =>
    monthKeyFromSliceStart(slice.start)
  );
  const rangeStart = slices[0].start;
  const rangeEnd = slices[slices.length - 1].end;

  const hiveObjectId = toHiveObjectId(hiveId);
  const match = sharedExpenseMatch(hiveObjectId, rangeStart, rangeEnd);
  const rows = await aggregateCategoryTotalsByMonthKey(match);

  return buildCategoryMonthTotals(rows, orderedMonthKeys);
}

async function getSharedSpendByUserRollingWindows(hiveId, options = {}) {
  const referenceDate = options.referenceDate ?? new Date();
  const windows = utcRollingThirtyDayWindows(referenceDate);
  const hiveObjectId = toHiveObjectId(hiveId);

  const [current, previous] = await Promise.all([
    aggregateSharedSpendByUser(
      hiveObjectId,
      windows.current.start,
      windows.current.end
    ),
    aggregateSharedSpendByUser(
      hiveObjectId,
      windows.previous.start,
      windows.previous.end
    ),
  ]);

  return { current, previous, windowsUtc: windows };
}

module.exports = {
  getPersonalCategoryMonthTotals,
  getSharedCategoryMonthTotals,
  getSharedSpendByUserRollingWindows,
};
