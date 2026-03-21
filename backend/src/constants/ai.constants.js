const INSIGHT_TYPES = {
  SPENDING_PATTERN: 'spending_pattern',
  SAVING_OPPORTUNITY: 'saving_opportunity',
  BUDGET_ALERT: 'budget_alert',
  UNUSUAL_ACTIVITY: 'unusual_activity',
};

const RECOMMENDATION_TYPES = {
  REDUCE_SPENDING: 'reduce_spending',
  INCREASE_SAVINGS: 'increase_savings',
  BALANCE_CONTRIBUTION: 'balance_contribution',
  SET_BUDGET: 'set_budget',
};

const GOAL_TYPES = {
  EMERGENCY_FUND: 'emergency_fund',
  VACATION: 'vacation',
  LARGE_PURCHASE: 'large_purchase',
  DEBT_PAYOFF: 'debt_payoff',
  CUSTOM: 'custom',
};

const CLASSIFICATION_LABELS = {
  SHARED: 'shared',
  INDIVIDUAL: 'individual',
};

const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3,
};

const FORECAST_PERIODS = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
};

module.exports = {
  INSIGHT_TYPES,
  RECOMMENDATION_TYPES,
  GOAL_TYPES,
  CLASSIFICATION_LABELS,
  CONFIDENCE_THRESHOLDS,
  FORECAST_PERIODS,
};
