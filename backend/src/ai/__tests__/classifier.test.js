const {
  classifyExpenseRuleBased,
  scoreKeywordMatches,
  isSharedCategory,
} = require('../classifier');

describe('classifier', () => {
  test('classifies expense as shared for default shared category', () => {
    const result = classifyExpenseRuleBased({
      description: 'Monthly rent',
      amount: 3500,
      category: 'Rent',
    });

    expect(result.label).toBe('shared');
    expect(result.confidence).toBe(0.92);
    expect(result.reasoning).toContain('Matched shared category');
  });

  test('classifies expense as personal for default personal category', () => {
    const result = classifyExpenseRuleBased({
      description: 'Shoes',
      amount: 250,
      category: 'Clothing',
    });

    expect(result.label).toBe('personal');
    expect(result.confidence).toBe(0.9);
    expect(result.reasoning).toContain('Matched personal category');
  });

  test('classifies as shared when shared keywords score higher', () => {
    const result = classifyExpenseRuleBased({
      description: 'Paid electric bill and water account',
      amount: 420,
      category: 'misc',
    });

    expect(result.label).toBe('shared');
    expect(result.confidence).toBe(0.8);
    expect(result.reasoning).toContain('Matched shared keywords');
  });

  test('classifies as personal when personal keywords score higher', () => {
    const result = classifyExpenseRuleBased({
      description: 'Gym membership and spotify subscription',
      amount: 180,
      category: 'misc',
    });

    expect(result.label).toBe('personal');
    expect(result.confidence).toBe(0.8);
    expect(result.reasoning).toContain('Matched personal keywords');
  });

  test('falls back to personal when no rule matches', () => {
    const result = classifyExpenseRuleBased({
      description: 'One-time unknown purchase',
      amount: 99,
      category: 'other',
    });

    expect(result).toEqual(
      expect.objectContaining({
        label: 'personal',
        confidence: 0.5,
      })
    );
    expect(result.reasoning).toContain('defaulted to personal');
  });

  test('returns confidence between 0 and 1 and includes reasoning', () => {
    const result = classifyExpenseRuleBased({
      description: 'Coffee with lunch',
      amount: 50,
      category: 'other',
    });

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(typeof result.reasoning).toBe('string');
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  test('uses configured shared categories override', () => {
    const result = classifyExpenseRuleBased({
      description: 'Weekend outing',
      amount: 130,
      category: 'travel',
      sharedCategories: ['travel', 'subscriptions'],
    });

    expect(result.label).toBe('shared');
    expect(result.reasoning).toContain('Matched shared category: travel');
  });

  test('isSharedCategory matches normalized values', () => {
    expect(isSharedCategory(' Utilities ', ['rent', 'utilities'])).toBe(true);
  });

  test('scoreKeywordMatches counts shared and personal keywords', () => {
    const scores = scoreKeywordMatches(
      'Supermarket and internet for home plus coffee run',
      {
        shared: ['supermarket', 'internet'],
        personal: ['coffee'],
      }
    );

    expect(scores).toEqual({ sharedScore: 2, personalScore: 1 });
  });
});
