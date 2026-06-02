const {
  detectOverspend,
  detectSpendingSpike,
  detectRecurringCharges,
  detectBudgetOverrun,
  detectForecastExceedance,
  analyzeSpendingBehavior,
} = require('../behaviorAnalyzer');

describe('detectOverspend', () => {
  test('detects category with 30%+ increase over prior average', () => {
    const categorySpendByMonth = {
      groceries: [100, 100, 140],
    };

    const patterns = detectOverspend(categorySpendByMonth);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].type).toBe('overspend');
    expect(patterns[0].category).toBe('groceries');
    expect(patterns[0].severity).toBe('medium');
    expect(patterns[0].data.increasePercent).toBe(40);
  });

  test('marks severity as high for 50%+ increase', () => {
    const categorySpendByMonth = {
      dining: [100, 100, 160],
    };

    const patterns = detectOverspend(categorySpendByMonth);

    expect(patterns[0].severity).toBe('high');
    expect(patterns[0].data.increasePercent).toBe(60);
  });

  test('ignores categories with less than 30% increase', () => {
    const categorySpendByMonth = {
      utilities: [100, 100, 120],
    };

    const patterns = detectOverspend(categorySpendByMonth);

    expect(patterns).toHaveLength(0);
  });

  test('ignores categories with single month data', () => {
    const categorySpendByMonth = {
      rent: [1000],
    };

    const patterns = detectOverspend(categorySpendByMonth);

    expect(patterns).toHaveLength(0);
  });

  test('ignores categories with zero prior average', () => {
    const categorySpendByMonth = {
      newCategory: [0, 0, 100],
    };

    const patterns = detectOverspend(categorySpendByMonth);

    expect(patterns).toHaveLength(0);
  });
});

describe('detectSpendingSpike', () => {
  test('detects transaction exceeding 3x category average', () => {
    const recentTransactions = [
      { amount: 20, category: 'shopping', description: 'Groceries' },
      { amount: 20, category: 'shopping', description: 'Clothing' },
      { amount: 20, category: 'shopping', description: 'Books' },
      { amount: 20, category: 'shopping', description: 'Misc' },
      { amount: 500, category: 'shopping', description: 'Electronics' },
    ];

    const patterns = detectSpendingSpike(recentTransactions);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].type).toBe('spike');
    expect(patterns[0].category).toBe('shopping');
    expect(patterns[0].data.amount).toBe(500);
  });

  test('does not flag normal transactions', () => {
    const recentTransactions = [
      { amount: 50, category: 'groceries', description: 'Store A' },
      { amount: 60, category: 'groceries', description: 'Store B' },
      { amount: 55, category: 'groceries', description: 'Store C' },
    ];

    const patterns = detectSpendingSpike(recentTransactions);

    expect(patterns).toHaveLength(0);
  });
});

describe('detectRecurringCharges', () => {
  test('detects monthly recurring charge by same description and amount', () => {
    const recentTransactions = [
      { amount: 9.99, category: 'subscriptions', description: 'Netflix', date: '2024-01-15' },
      { amount: 9.99, category: 'subscriptions', description: 'Netflix', date: '2024-02-15' },
    ];

    const patterns = detectRecurringCharges(recentTransactions);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].type).toBe('recurring');
    expect(patterns[0].data.description).toBe('Netflix');
    expect(patterns[0].data.amount).toBe(9.99);
    expect(patterns[0].data.occurrences).toBe(2);
  });

  test('ignores non-monthly recurring (weekly)', () => {
    const recentTransactions = [
      { amount: 15, category: 'groceries', description: 'Weekly Shop', date: '2024-01-01' },
      { amount: 15, category: 'groceries', description: 'Weekly Shop', date: '2024-01-08' },
    ];

    const patterns = detectRecurringCharges(recentTransactions);

    expect(patterns).toHaveLength(0);
  });

  test('ignores transactions without description', () => {
    const recentTransactions = [
      { amount: 50, category: 'misc', description: '', date: '2024-01-15' },
      { amount: 50, category: 'misc', description: '', date: '2024-02-15' },
    ];

    const patterns = detectRecurringCharges(recentTransactions);

    expect(patterns).toHaveLength(0);
  });
});

describe('detectBudgetOverrun', () => {
  test('detects budget at 80%+ usage as warning', () => {
    const budgetStatus = [
      { category: 'dining', limit: 200, spent: 170, percentUsed: 85 },
    ];

    const patterns = detectBudgetOverrun(budgetStatus);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].type).toBe('budget_warning');
    expect(patterns[0].severity).toBe('medium');
  });

  test('marks severity high for 100%+ usage', () => {
    const budgetStatus = [
      { category: 'groceries', limit: 300, spent: 320, percentUsed: 106.67 },
    ];

    const patterns = detectBudgetOverrun(budgetStatus);

    expect(patterns[0].severity).toBe('high');
  });

  test('ignores budgets under 80%', () => {
    const budgetStatus = [
      { category: 'utilities', limit: 150, spent: 100, percentUsed: 66.67 },
    ];

    const patterns = detectBudgetOverrun(budgetStatus);

    expect(patterns).toHaveLength(0);
  });
});

describe('detectForecastExceedance', () => {
  test('detects when current spend exceeds forecast', () => {
    const categorySpendByMonth = {
      groceries: [200, 200, 280],
    };
    const forecast = [
      { category: 'groceries', predicted: 200, confidence: 0.8 },
    ];

    const patterns = detectForecastExceedance(categorySpendByMonth, forecast);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].type).toBe('forecast_exceeded');
    expect(patterns[0].data.exceedancePercent).toBe(40);
  });

  test('marks high severity for 50%+ exceedance', () => {
    const categorySpendByMonth = {
      dining: [100, 100, 200],
    };
    const forecast = [
      { category: 'dining', predicted: 100, confidence: 0.8 },
    ];

    const patterns = detectForecastExceedance(categorySpendByMonth, forecast);

    expect(patterns[0].severity).toBe('high');
  });

  test('ignores total category', () => {
    const categorySpendByMonth = {};
    const forecast = [
      { category: 'total', predicted: 500, confidence: 0.8 },
    ];

    const patterns = detectForecastExceedance(categorySpendByMonth, forecast);

    expect(patterns).toHaveLength(0);
  });

  test('ignores when spend is under forecast', () => {
    const categorySpendByMonth = {
      groceries: [200, 200, 180],
    };
    const forecast = [
      { category: 'groceries', predicted: 200, confidence: 0.8 },
    ];

    const patterns = detectForecastExceedance(categorySpendByMonth, forecast);

    expect(patterns).toHaveLength(0);
  });
});

describe('analyzeSpendingBehavior', () => {
  test('combines all pattern detectors', () => {
    const input = {
      categorySpendByMonth: {
        groceries: [100, 100, 150],
      },
      budgetStatus: [
        { category: 'dining', limit: 200, spent: 180, percentUsed: 90 },
      ],
      forecast: [],
      recentTransactions: [],
    };

    const patterns = analyzeSpendingBehavior(input);

    expect(patterns).toHaveLength(2);
    expect(patterns.map((p) => p.type)).toContain('overspend');
    expect(patterns.map((p) => p.type)).toContain('budget_warning');
  });

  test('handles empty input gracefully', () => {
    const patterns = analyzeSpendingBehavior({});

    expect(patterns).toEqual([]);
  });
});
