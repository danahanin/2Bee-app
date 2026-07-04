const {
  generateInsights,
  prioritizeInsights,
  formatInsightMessage,
} = require('../insightsGenerator');

describe('formatInsightMessage', () => {
  test('formats overspend pattern', () => {
    const pattern = {
      type: 'overspend',
      category: 'groceries',
      severity: 'high',
      data: { increasePercent: 45, currentSpend: 290, averagePrior: 200 },
    };

    const { title, description } = formatInsightMessage(pattern);

    expect(title).toBe('Spending up in groceries');
    expect(description).toContain('45%');
  });

  test('formats spike pattern with description', () => {
    const pattern = {
      type: 'spike',
      category: 'shopping',
      severity: 'high',
      data: { amount: 500, description: 'Electronics Store', categoryAverage: 50 },
    };

    const { title, description } = formatInsightMessage(pattern);

    expect(title).toBe('Unusual purchase in shopping');
    expect(description).toContain('₪500');
    expect(description).toContain('Electronics Store');
  });

  test('formats spike pattern without description', () => {
    const pattern = {
      type: 'spike',
      category: 'shopping',
      severity: 'high',
      data: { amount: 500, description: '', categoryAverage: 50 },
    };

    const { description } = formatInsightMessage(pattern);

    expect(description).not.toContain('()');
  });

  test('formats recurring pattern', () => {
    const pattern = {
      type: 'recurring',
      category: 'subscriptions',
      severity: 'low',
      data: { description: 'Netflix', amount: 15.99, occurrences: 3 },
    };

    const { title, description } = formatInsightMessage(pattern);

    expect(title).toBe('Recurring charge detected');
    expect(description).toContain('Netflix');
    expect(description).toContain('₪16');
  });

  test('formats budget_warning pattern', () => {
    const pattern = {
      type: 'budget_warning',
      category: 'dining',
      severity: 'medium',
      data: { limit: 200, spent: 180, percentUsed: 90 },
    };

    const { title, description } = formatInsightMessage(pattern);

    expect(title).toBe('Budget alert for dining');
    expect(description).toContain('90%');
    expect(description).toContain('₪180');
    expect(description).toContain('₪200');
  });

  test('formats forecast_exceeded pattern', () => {
    const pattern = {
      type: 'forecast_exceeded',
      category: 'utilities',
      severity: 'medium',
      data: { currentSpend: 150, predicted: 100, exceedancePercent: 50 },
    };

    const { title, description } = formatInsightMessage(pattern);

    expect(title).toBe('utilities spending above forecast');
    expect(description).toContain('₪150');
    expect(description).toContain('50%');
    expect(description).toContain('₪100');
  });

  test('handles unknown pattern type gracefully', () => {
    const pattern = {
      type: 'unknown_type',
      category: 'misc',
      severity: 'low',
      data: {},
    };

    const { title, description } = formatInsightMessage(pattern);

    expect(title).toContain('unknown_type');
    expect(title).toContain('misc');
    expect(description).toBeTruthy();
  });
});

describe('generateInsights', () => {
  test('transforms patterns into insight objects', () => {
    const patterns = [
      {
        type: 'overspend',
        category: 'groceries',
        severity: 'high',
        data: { increasePercent: 50, currentSpend: 300, averagePrior: 200 },
      },
    ];

    const insights = generateInsights(patterns);

    expect(insights).toHaveLength(1);
    expect(insights[0]).toHaveProperty('id');
    expect(insights[0]).toHaveProperty('type', 'overspend');
    expect(insights[0]).toHaveProperty('title');
    expect(insights[0]).toHaveProperty('description');
    expect(insights[0]).toHaveProperty('confidence');
    expect(insights[0]).toHaveProperty('category', 'groceries');
    expect(insights[0]).toHaveProperty('createdAt');
  });

  test('assigns high confidence to high severity patterns', () => {
    const patterns = [
      { type: 'overspend', category: 'dining', severity: 'high', data: { increasePercent: 60 } },
    ];

    const insights = generateInsights(patterns);

    expect(insights[0].confidence).toBe(0.9);
  });

  test('assigns medium confidence to medium severity patterns', () => {
    const patterns = [
      { type: 'budget_warning', category: 'groceries', severity: 'medium', data: { percentUsed: 85 } },
    ];

    const insights = generateInsights(patterns);

    expect(insights[0].confidence).toBe(0.75);
  });

  test('assigns lower confidence to low severity patterns', () => {
    const patterns = [
      { type: 'recurring', category: 'subscriptions', severity: 'low', data: { description: 'Netflix', amount: 10 } },
    ];

    const insights = generateInsights(patterns);

    expect(insights[0].confidence).toBe(0.6);
  });

  test('uses provided timestamp for createdAt', () => {
    const patterns = [
      { type: 'overspend', category: 'dining', severity: 'high', data: { increasePercent: 40 } },
    ];
    const timestamp = '2024-03-15T10:00:00.000Z';

    const insights = generateInsights(patterns, { timestamp });

    expect(insights[0].createdAt).toBe(timestamp);
  });
});

describe('prioritizeInsights', () => {
  test('sorts by confidence descending', () => {
    const insights = [
      { id: '1', type: 'recurring', confidence: 0.6, createdAt: '2024-01-01' },
      { id: '2', type: 'overspend', confidence: 0.9, createdAt: '2024-01-01' },
      { id: '3', type: 'budget_warning', confidence: 0.75, createdAt: '2024-01-01' },
    ];

    const sorted = prioritizeInsights(insights);

    expect(sorted.map((i) => i.id)).toEqual(['2', '3', '1']);
  });

  test('limits results to specified count', () => {
    const insights = [
      { id: '1', confidence: 0.9, createdAt: '2024-01-01' },
      { id: '2', confidence: 0.8, createdAt: '2024-01-01' },
      { id: '3', confidence: 0.7, createdAt: '2024-01-01' },
      { id: '4', confidence: 0.6, createdAt: '2024-01-01' },
    ];

    const sorted = prioritizeInsights(insights, 2);

    expect(sorted).toHaveLength(2);
    expect(sorted.map((i) => i.id)).toEqual(['1', '2']);
  });

  test('breaks ties by createdAt descending (newer first)', () => {
    const insights = [
      { id: '1', confidence: 0.9, createdAt: '2024-01-01T08:00:00Z' },
      { id: '2', confidence: 0.9, createdAt: '2024-01-01T12:00:00Z' },
    ];

    const sorted = prioritizeInsights(insights);

    expect(sorted.map((i) => i.id)).toEqual(['2', '1']);
  });

  test('defaults to limit of 5', () => {
    const insights = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      confidence: 0.5,
      createdAt: '2024-01-01',
    }));

    const sorted = prioritizeInsights(insights);

    expect(sorted).toHaveLength(5);
  });
});
