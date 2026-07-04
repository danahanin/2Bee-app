const {
  suggestGoals,
  calculateSuggestedContribution,
} = require('../goalSuggester');

describe('calculateSuggestedContribution', () => {
  test('divides target amount by months', () => {
    const contribution = calculateSuggestedContribution(120, 6);
    expect(contribution).toBe(20);
  });

  test('rounds to two decimal places', () => {
    const contribution = calculateSuggestedContribution(100, 3);
    expect(contribution).toBe(33.33);
  });

  test('returns full amount if months is zero', () => {
    const contribution = calculateSuggestedContribution(50, 0);
    expect(contribution).toBe(50);
  });

  test('returns full amount if months is negative', () => {
    const contribution = calculateSuggestedContribution(50, -2);
    expect(contribution).toBe(50);
  });
});

describe('suggestGoals', () => {
  test('suggests goal when current spend exceeds forecast', () => {
    const categorySpendByMonth = {
      groceries: [200, 200, 280],
    };
    const forecast = [
      { category: 'groceries', predicted: 200, confidence: 0.8 },
    ];

    const goals = suggestGoals(categorySpendByMonth, forecast, { remainingMonths: 6 });

    expect(goals).toHaveLength(1);
    expect(goals[0].type).toBe('savings_goal');
    expect(goals[0].category).toBe('groceries');
    expect(goals[0].targetAmount).toBe(40);
    expect(goals[0].suggestedMonthlyContribution).toBe(6.67);
    expect(goals[0].confidence).toBe(0.8);
  });

  test('returns all required fields', () => {
    const categorySpendByMonth = {
      dining: [100, 100, 200],
    };
    const forecast = [
      { category: 'dining', predicted: 100, confidence: 0.75 },
    ];

    const goals = suggestGoals(categorySpendByMonth, forecast, { remainingMonths: 4 });

    expect(goals[0]).toHaveProperty('id');
    expect(goals[0]).toHaveProperty('type', 'savings_goal');
    expect(goals[0]).toHaveProperty('title');
    expect(goals[0]).toHaveProperty('description');
    expect(goals[0]).toHaveProperty('targetAmount');
    expect(goals[0]).toHaveProperty('suggestedMonthlyContribution');
    expect(goals[0]).toHaveProperty('confidence');
    expect(goals[0]).toHaveProperty('category');
    expect(goals[0]).toHaveProperty('reasoning');
    expect(goals[0]).toHaveProperty('createdAt');
  });

  test('filters out suggestions below minimum threshold', () => {
    const categorySpendByMonth = {
      coffee: [50, 50, 55],
    };
    const forecast = [
      { category: 'coffee', predicted: 50, confidence: 0.7 },
    ];

    const goals = suggestGoals(categorySpendByMonth, forecast, {
      minSuggestion: 10,
      remainingMonths: 6,
    });

    expect(goals).toHaveLength(0);
  });

  test('ignores total category from forecast', () => {
    const categorySpendByMonth = {};
    const forecast = [
      { category: 'total', predicted: 1000, confidence: 0.8 },
    ];

    const goals = suggestGoals(categorySpendByMonth, forecast);

    expect(goals).toHaveLength(0);
  });

  test('ignores categories with zero forecast', () => {
    const categorySpendByMonth = {
      newCategory: [100],
    };
    const forecast = [
      { category: 'newCategory', predicted: 0, confidence: 0.35 },
    ];

    const goals = suggestGoals(categorySpendByMonth, forecast);

    expect(goals).toHaveLength(0);
  });

  test('ignores categories where current spend is below forecast', () => {
    const categorySpendByMonth = {
      groceries: [200, 200, 180],
    };
    const forecast = [
      { category: 'groceries', predicted: 200, confidence: 0.8 },
    ];

    const goals = suggestGoals(categorySpendByMonth, forecast);

    expect(goals).toHaveLength(0);
  });

  test('ignores categories not in spend data', () => {
    const categorySpendByMonth = {};
    const forecast = [
      { category: 'unknown', predicted: 100, confidence: 0.5 },
    ];

    const goals = suggestGoals(categorySpendByMonth, forecast);

    expect(goals).toHaveLength(0);
  });

  test('sorts goals by target amount descending', () => {
    const categorySpendByMonth = {
      small: [100, 100, 130],
      large: [200, 200, 300],
    };
    const forecast = [
      { category: 'small', predicted: 100, confidence: 0.8 },
      { category: 'large', predicted: 200, confidence: 0.8 },
    ];

    const goals = suggestGoals(categorySpendByMonth, forecast, { remainingMonths: 6 });

    expect(goals).toHaveLength(2);
    expect(goals[0].category).toBe('large');
    expect(goals[1].category).toBe('small');
  });

  test('uses provided timestamp for createdAt', () => {
    const categorySpendByMonth = {
      dining: [100, 100, 150],
    };
    const forecast = [
      { category: 'dining', predicted: 100, confidence: 0.8 },
    ];
    const timestamp = '2024-06-15T12:00:00.000Z';

    const goals = suggestGoals(categorySpendByMonth, forecast, {
      remainingMonths: 6,
      timestamp,
    });

    expect(goals[0].createdAt).toBe(timestamp);
  });

  test('includes reasoning with spending details', () => {
    const categorySpendByMonth = {
      utilities: [100, 100, 160],
    };
    const forecast = [
      { category: 'utilities', predicted: 100, confidence: 0.7 },
    ];

    const goals = suggestGoals(categorySpendByMonth, forecast, { remainingMonths: 6 });

    expect(goals[0].reasoning).toContain('₪160');
    expect(goals[0].reasoning).toContain('₪100');
    expect(goals[0].reasoning).toContain('₪60');
  });
});
