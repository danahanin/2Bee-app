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
} = require('../ai/expenseTotals');

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function emptyImbalanceResult() {
  return detectImbalance({ current: {}, previous: {} });
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

function getInsights() {
  return [
    {
      id: 'ins_001',
      type: INSIGHT_TYPES.SPENDING_PATTERN,
      title: 'Grocery spending increased',
      description: 'Your grocery spending is 15% higher than last month',
      confidence: 0.87,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ins_002',
      type: INSIGHT_TYPES.SAVING_OPPORTUNITY,
      title: 'Subscription overlap detected',
      description: 'You have 2 streaming services with similar content',
      confidence: 0.92,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ins_003',
      type: INSIGHT_TYPES.BUDGET_ALERT,
      title: 'Dining budget at 80%',
      description: 'You have used 80% of your dining budget with 10 days left',
      confidence: 0.95,
      createdAt: new Date().toISOString(),
    },
  ];
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

function getRecommendations() {
  return [
    {
      id: 'rec_001',
      type: RECOMMENDATION_TYPES.REDUCE_SPENDING,
      title: 'Reduce takeout orders',
      description: 'Cooking at home 2 more times per week could save you money',
      potentialSavings: 120.00,
      priority: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rec_002',
      type: RECOMMENDATION_TYPES.INCREASE_SAVINGS,
      title: 'Automate savings',
      description: 'Set up automatic transfers to reach your goals faster',
      potentialSavings: 200.00,
      priority: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rec_003',
      type: RECOMMENDATION_TYPES.SET_BUDGET,
      title: 'Create entertainment budget',
      description: 'Setting a budget for entertainment could help control spending',
      potentialSavings: 75.00,
      priority: 3,
      createdAt: new Date().toISOString(),
    },
  ];
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

function getGoalSuggestions() {
  return [
    {
      id: 'goal_001',
      type: GOAL_TYPES.EMERGENCY_FUND,
      title: 'Build emergency fund',
      description: 'Based on your expenses, aim for 3-6 months of savings',
      targetAmount: 7500.00,
      suggestedMonthlyContribution: 250.00,
      confidence: 0.88,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'goal_002',
      type: GOAL_TYPES.VACATION,
      title: 'Summer vacation fund',
      description: 'Start saving for a vacation based on your travel history',
      targetAmount: 2000.00,
      suggestedMonthlyContribution: 167.00,
      confidence: 0.75,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'goal_003',
      type: GOAL_TYPES.DEBT_PAYOFF,
      title: 'Credit card payoff',
      description: 'Accelerate debt repayment to save on interest',
      targetAmount: 3000.00,
      suggestedMonthlyContribution: 300.00,
      confidence: 0.82,
      createdAt: new Date().toISOString(),
    },
  ];
}

module.exports = {
  getInsights,
  getForecast,
  getRecommendations,
  classifyExpense,
  getImbalance,
  getGoalSuggestions,
};
