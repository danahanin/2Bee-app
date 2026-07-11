const mongoose = require('mongoose');
const {
  INSIGHT_TYPES,
  RECOMMENDATION_TYPES,
  GOAL_TYPES,
  FORECAST_PERIODS,
} = require('../constants/ai.constants');
const { classifyExpenseRuleBased } = require('../ai/classifier');
const { forecastFromCategoryMonthTotals } = require('../ai/forecaster');
const { detectImbalance } = require('../ai/imbalanceDetector');
const {
  getPersonalCategoryMonthTotals,
  getSharedCategoryMonthTotals,
  getSharedSpendByUserRollingWindows,
  getRecentTransactions,
} = require('../ai/expenseTotals');
const { analyzeSpendingBehavior } = require('../ai/behaviorAnalyzer');
const { generateInsights, prioritizeInsights } = require('../ai/insightsGenerator');
const { generateRecommendations } = require('../ai/recommender');
const { suggestGoals } = require('../ai/goalSuggester');
const Budget = require('../../models/Budget');
const { utcMonthRange } = require('../../services/dashboardService');

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function emptyImbalanceResult() {
  return detectImbalance({ current: {}, previous: {} });
}

async function getBudgetStatusForUser(userId, hiveId, scope = 'personal') {
  const { start, end } = utcMonthRange();
  const Expense = require('../../models/Expense');
  
  const query = scope === 'shared' && hiveId 
    ? { hiveId, type: 'shared' } 
    : { userId, type: 'personal' };
  
  const budgets = await Budget.find(query).lean();
  
  const statusList = [];
  for (const budget of budgets) {
    let matchFilter;
    if (budget.type === 'shared' && hiveId) {
      matchFilter = {
        hiveId: new mongoose.Types.ObjectId(hiveId),
        type: 'shared',
        category: budget.category,
        isDeleted: false,
        date: { $gte: start, $lte: end },
      };
    } else {
      matchFilter = {
        userId,
        type: 'personal',
        category: budget.category,
        isDeleted: false,
        date: { $gte: start, $lte: end },
      };
    }
    
    const [row] = await Expense.aggregate([
      { $match: matchFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    
    const spent = row?.total || 0;
    const limit = budget.limitAmount;
    const percentUsed = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    
    statusList.push({
      category: budget.category,
      limit,
      spent,
      percentUsed,
    });
  }
  
  return statusList;
}

function mapForecastApiRows(rows, createdAtIso) {
  return rows.map((row, index) => ({
    id: `frc_${String(index + 1).padStart(3, '0')}`,
    period: FORECAST_PERIODS.MONTHLY,
    predictedAmount: row.predicted,
    confidence: row.confidence,
    category: row.category,
    createdAt: createdAtIso,
  }));
}

async function getInsights(options = {}) {
  if (!isMongoConnected()) {
    return [];
  }
  
  const { userId, hiveId, scope = 'personal' } = options;
  
  if (!userId) {
    return [];
  }
  
  try {
    const categoryMonthTotals = scope === 'shared' && hiveId
      ? await getSharedCategoryMonthTotals(hiveId)
      : await getPersonalCategoryMonthTotals(userId);
    
    const forecast = forecastFromCategoryMonthTotals({ categoryMonthTotals });
    const budgetStatus = await getBudgetStatusForUser(userId, hiveId, scope);
    const recentTx = await getRecentTransactions(userId);
    
    const patterns = analyzeSpendingBehavior({
      categorySpendByMonth: categoryMonthTotals,
      budgetStatus,
      forecast,
      recentTransactions: recentTx,
    });
    
    const insights = generateInsights(patterns);
    return prioritizeInsights(insights);
  } catch {
    return [];
  }
}

async function getForecast(options = {}) {
  const createdAt = new Date().toISOString();
  if (!isMongoConnected()) {
    return [];
  }

  const scope = options.scope === 'shared' ? 'shared' : 'personal';
  let categoryMonthTotals;

  try {
    if (scope === 'personal') {
      if (!options.userId) {
        return [];
      }
      categoryMonthTotals = await getPersonalCategoryMonthTotals(options.userId);
    } else if (!options.hiveId) {
      return [];
    } else {
      categoryMonthTotals = await getSharedCategoryMonthTotals(options.hiveId);
    }
  } catch {
    return [];
  }

  const forecastRows = forecastFromCategoryMonthTotals({ categoryMonthTotals });
  return mapForecastApiRows(forecastRows, createdAt);
}

async function getRecommendations(options = {}) {
  if (!isMongoConnected()) {
    return [];
  }
  
  const { userId, hiveId, scope = 'personal', userData = {} } = options;
  
  if (!userId) {
    return [];
  }
  
  try {
    const categoryMonthTotals = scope === 'shared' && hiveId
      ? await getSharedCategoryMonthTotals(hiveId)
      : await getPersonalCategoryMonthTotals(userId);
    
    const forecast = forecastFromCategoryMonthTotals({ categoryMonthTotals });
    const budgetStatus = await getBudgetStatusForUser(userId, hiveId, scope);
    const recentTx = await getRecentTransactions(userId);
    
    const patterns = analyzeSpendingBehavior({
      categorySpendByMonth: categoryMonthTotals,
      budgetStatus,
      forecast,
      recentTransactions: recentTx,
    });
    
    const recommendations = generateRecommendations(patterns, userData);
    return recommendations.sort((a, b) => a.priority - b.priority);
  } catch {
    return [];
  }
}

function classifyExpense({ description, amount, category, sharedCategories, keywordMap }) {
  return classifyExpenseRuleBased({
    description,
    amount,
    category,
    sharedCategories,
    keywordMap,
  });
}

async function getImbalance(options = {}) {
  const createdAt = new Date().toISOString();
  const envelope = () => ({
    id: 'imb_001',
    createdAt,
    ...emptyImbalanceResult(),
  });

  if (!isMongoConnected()) {
    return envelope();
  }

  if (!options.hiveId) {
    return envelope();
  }

  try {
    const rolling = await getSharedSpendByUserRollingWindows(options.hiveId);
    return {
      id: 'imb_001',
      createdAt,
      ...detectImbalance({
        current: rolling.current,
        previous: rolling.previous,
      }),
    };
  } catch {
    return envelope();
  }
}

async function getGoalSuggestions(options = {}) {
  if (!isMongoConnected()) {
    return [];
  }
  
  const { userId, hiveId, scope = 'personal' } = options;
  
  if (!userId) {
    return [];
  }
  
  try {
    // Goal suggestions compare the most recent *completed* month against the
    // forecast. Anchoring to last month avoids the current in-progress month
    // (which is near-empty early on) always falling short of the forecast.
    const referenceDate = lastCompletedMonthReference();

    const categoryMonthTotals = scope === 'shared' && hiveId
      ? await getSharedCategoryMonthTotals(hiveId, { referenceDate })
      : await getPersonalCategoryMonthTotals(userId, { referenceDate });

    const forecast = forecastFromCategoryMonthTotals({ categoryMonthTotals });

    return suggestGoals(categoryMonthTotals, forecast);
  } catch {
    return [];
  }
}

function lastCompletedMonthReference(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 12, 0, 0));
}

module.exports = {
  getInsights,
  getForecast,
  getRecommendations,
  classifyExpense,
  getImbalance,
  getGoalSuggestions,
};
