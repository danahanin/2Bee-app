const {
  INSIGHT_TYPES,
  RECOMMENDATION_TYPES,
  GOAL_TYPES,
  CLASSIFICATION_LABELS,
  FORECAST_PERIODS,
} = require('../constants/ai.constants');

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

function getForecast() {
  return [
    {
      id: 'frc_001',
      period: FORECAST_PERIODS.MONTHLY,
      predictedAmount: 2450.00,
      confidence: 0.78,
      category: 'total',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'frc_002',
      period: FORECAST_PERIODS.MONTHLY,
      predictedAmount: 650.00,
      confidence: 0.85,
      category: 'groceries',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'frc_003',
      period: FORECAST_PERIODS.MONTHLY,
      predictedAmount: 180.00,
      confidence: 0.72,
      category: 'utilities',
      createdAt: new Date().toISOString(),
    },
  ];
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

function classifyExpense({ description, amount }) {
  const sharedKeywords = ['rent', 'utilities', 'groceries', 'internet', 'electricity'];
  const lowerDesc = description.toLowerCase();
  const isShared = sharedKeywords.some((keyword) => lowerDesc.includes(keyword));

  return {
    label: isShared ? CLASSIFICATION_LABELS.SHARED : CLASSIFICATION_LABELS.INDIVIDUAL,
    confidence: isShared ? 0.89 : 0.76,
    category: detectCategory(lowerDesc, amount),
  };
}

function detectCategory(description, _amount) {
  if (description.includes('grocery') || description.includes('food')) return 'groceries';
  if (description.includes('rent')) return 'housing';
  if (description.includes('electric') || description.includes('water') || description.includes('gas')) return 'utilities';
  if (description.includes('internet') || description.includes('phone')) return 'telecom';
  return 'other';
}

function getImbalance() {
  return {
    id: 'imb_001',
    hiveName: 'Home Expenses',
    contributions: [
      {
        memberId: 'user_001',
        memberName: 'Alice',
        contributionPercentage: 65,
        expectedPercentage: 50,
        deviation: 15,
      },
      {
        memberId: 'user_002',
        memberName: 'Bob',
        contributionPercentage: 35,
        expectedPercentage: 50,
        deviation: -15,
      },
    ],
    imbalanceScore: 0.3,
    suggestion: 'Bob could contribute $150 more this month to balance contributions',
    createdAt: new Date().toISOString(),
  };
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
