const {
  generateRecommendations,
  calculatePotentialSavings,
  assignPriority,
} = require('../recommender');

describe('calculatePotentialSavings', () => {
  test('calculates savings for overspend as 50% of excess', () => {
    const pattern = {
      type: 'overspend',
      category: 'dining',
      severity: 'high',
      data: { currentSpend: 200, averagePrior: 100, increasePercent: 100 },
    };

    const savings = calculatePotentialSavings(pattern);

    expect(savings).toBe(50);
  });

  test('calculates savings for recurring as full monthly amount', () => {
    const pattern = {
      type: 'recurring',
      category: 'subscriptions',
      severity: 'low',
      data: { description: 'Unused Service', amount: 9.99, occurrences: 3 },
    };

    const savings = calculatePotentialSavings(pattern);

    expect(savings).toBe(9.99);
  });

  test('calculates savings for forecast_exceeded as difference', () => {
    const pattern = {
      type: 'forecast_exceeded',
      category: 'groceries',
      severity: 'medium',
      data: { currentSpend: 350, predicted: 300, exceedancePercent: 16.67 },
    };

    const savings = calculatePotentialSavings(pattern);

    expect(savings).toBe(50);
  });

  test('calculates savings for budget_warning as overage', () => {
    const pattern = {
      type: 'budget_warning',
      category: 'dining',
      severity: 'high',
      data: { limit: 200, spent: 250, percentUsed: 125 },
    };

    const savings = calculatePotentialSavings(pattern);

    expect(savings).toBe(50);
  });

  test('returns zero for budget_warning under limit', () => {
    const pattern = {
      type: 'budget_warning',
      category: 'groceries',
      severity: 'medium',
      data: { limit: 300, spent: 270, percentUsed: 90 },
    };

    const savings = calculatePotentialSavings(pattern);

    expect(savings).toBe(0);
  });

  test('returns zero for spike pattern', () => {
    const pattern = {
      type: 'spike',
      category: 'shopping',
      severity: 'high',
      data: { amount: 500, description: 'Big Purchase', categoryAverage: 50 },
    };

    const savings = calculatePotentialSavings(pattern);

    expect(savings).toBe(0);
  });
});

describe('assignPriority', () => {
  test('assigns priority 1 to high severity', () => {
    expect(assignPriority({ severity: 'high' })).toBe(1);
  });

  test('assigns priority 2 to medium severity', () => {
    expect(assignPriority({ severity: 'medium' })).toBe(2);
  });

  test('assigns priority 3 to low severity', () => {
    expect(assignPriority({ severity: 'low' })).toBe(3);
  });
});

describe('generateRecommendations', () => {
  test('generates recommendation with all required fields', () => {
    const patterns = [
      {
        type: 'overspend',
        category: 'dining',
        severity: 'high',
        data: { currentSpend: 300, averagePrior: 200, increasePercent: 50 },
      },
    ];

    const recommendations = generateRecommendations(patterns);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toHaveProperty('id');
    expect(recommendations[0]).toHaveProperty('type', 'overspend');
    expect(recommendations[0]).toHaveProperty('title');
    expect(recommendations[0]).toHaveProperty('description');
    expect(recommendations[0]).toHaveProperty('potentialSavings');
    expect(recommendations[0]).toHaveProperty('priority');
    expect(recommendations[0]).toHaveProperty('category', 'dining');
    expect(recommendations[0]).toHaveProperty('cta');
    expect(recommendations[0]).toHaveProperty('createdAt');
  });

  test('generates dining-specific recommendation for dining overspend', () => {
    const patterns = [
      {
        type: 'overspend',
        category: 'dining',
        severity: 'high',
        data: { currentSpend: 300, averagePrior: 200, increasePercent: 50 },
      },
    ];

    const recommendations = generateRecommendations(patterns);

    expect(recommendations[0].title).toBe('Reduce dining out expenses');
    expect(recommendations[0].description).toContain('cooking at home');
  });

  test('generates default recommendation for unknown overspend category', () => {
    const patterns = [
      {
        type: 'overspend',
        category: 'miscellaneous',
        severity: 'medium',
        data: { currentSpend: 150, averagePrior: 100, increasePercent: 50 },
      },
    ];

    const recommendations = generateRecommendations(patterns);

    expect(recommendations[0].title).toContain('miscellaneous');
    expect(recommendations[0].cta).toBe('Review expenses');
  });

  test('generates budget adjustment recommendation', () => {
    const patterns = [
      {
        type: 'budget_warning',
        category: 'groceries',
        severity: 'medium',
        data: { limit: 300, spent: 280, percentUsed: 93.33 },
      },
    ];

    const recommendations = generateRecommendations(patterns);

    expect(recommendations[0].title).toContain('groceries');
    expect(recommendations[0].title).toContain('budget');
    expect(recommendations[0].cta).toBe('Adjust budget');
  });

  test('generates subscription review recommendation for recurring', () => {
    const patterns = [
      {
        type: 'recurring',
        category: 'subscriptions',
        severity: 'low',
        data: { description: 'Old Magazine', amount: 14.99, occurrences: 3 },
      },
    ];

    const recommendations = generateRecommendations(patterns);

    expect(recommendations[0].title).toBe('Review subscription');
    expect(recommendations[0].description).toContain('Old Magazine');
    expect(recommendations[0].description).toContain('₪15');
    expect(recommendations[0].potentialSavings).toBe(14.99);
  });

  test('generates reduction recommendation for forecast exceeded', () => {
    const patterns = [
      {
        type: 'forecast_exceeded',
        category: 'utilities',
        severity: 'medium',
        data: { currentSpend: 180, predicted: 150, exceedancePercent: 20 },
      },
    ];

    const recommendations = generateRecommendations(patterns);

    expect(recommendations[0].title).toContain('utilities');
    expect(recommendations[0].description).toContain('₪30');
  });

  test('handles multiple patterns', () => {
    const patterns = [
      {
        type: 'overspend',
        category: 'dining',
        severity: 'high',
        data: { currentSpend: 200, averagePrior: 100, increasePercent: 100 },
      },
      {
        type: 'recurring',
        category: 'subscriptions',
        severity: 'low',
        data: { description: 'Service', amount: 10, occurrences: 2 },
      },
    ];

    const recommendations = generateRecommendations(patterns);

    expect(recommendations).toHaveLength(2);
  });

  test('handles unknown pattern type gracefully', () => {
    const patterns = [
      {
        type: 'unknown_type',
        category: 'misc',
        severity: 'low',
        data: {},
      },
    ];

    const recommendations = generateRecommendations(patterns);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].title).toContain('misc');
    expect(recommendations[0].cta).toBe('Review');
  });
});
