const {
  detectImbalance,
  severityFromShares,
  deltaFromShares,
  trendBetween,
} = require('../imbalanceDetector');
const {
  IMBALANCE_RELATIVE_THRESHOLD,
  IMBALANCE_TREND_EPSILON,
  IMBALANCE_TREND,
} = require('../../constants/ai.constants');

describe('detectImbalance', () => {
  test('balanced 50/50 split is not imbalanced', () => {
    const result = detectImbalance({
      current: { u1: 500, u2: 500 },
      previous: { u1: 500, u2: 500 },
    });

    expect(result.isImbalanced).toBe(false);
    expect(result.delta).toBe(0);
    expect(result.severity).toBe(0);
    expect(result.trend).toBe(IMBALANCE_TREND.STABLE);
  });

  test('60/40 split sits at the threshold and is not flagged', () => {
    const result = detectImbalance({
      current: { u1: 600, u2: 400 },
      previous: { u1: 600, u2: 400 },
    });

    expect(result.delta).toBeCloseTo(0.1, 5);
    expect(result.severity).toBeCloseTo(0.2, 5);
    expect(result.isImbalanced).toBe(false);
  });

  test('65/35 split exceeds the default threshold and is flagged', () => {
    const result = detectImbalance({
      current: { u1: 650, u2: 350 },
      previous: { u1: 500, u2: 500 },
    });

    expect(result.delta).toBeCloseTo(0.15, 5);
    expect(result.severity).toBeCloseTo(0.3, 5);
    expect(result.isImbalanced).toBe(true);
  });

  test('default threshold equals IMBALANCE_RELATIVE_THRESHOLD', () => {
    const justAbove = detectImbalance({
      current: { u1: 605, u2: 395 },
      previous: { u1: 500, u2: 500 },
    });

    expect(justAbove.severity).toBeGreaterThan(IMBALANCE_RELATIVE_THRESHOLD);
    expect(justAbove.isImbalanced).toBe(true);
  });

  test('threshold can be overridden per call', () => {
    const lenient = detectImbalance({
      current: { u1: 700, u2: 300 },
      previous: { u1: 500, u2: 500 },
      threshold: 0.9,
    });
    const strict = detectImbalance({
      current: { u1: 520, u2: 480 },
      previous: { u1: 500, u2: 500 },
      threshold: 0.03,
    });

    expect(lenient.isImbalanced).toBe(false);
    expect(strict.isImbalanced).toBe(true);
  });

  test('trend is increasing when current window is more skewed', () => {
    const result = detectImbalance({
      current: { u1: 800, u2: 200 },
      previous: { u1: 550, u2: 450 },
    });

    expect(result.trend).toBe(IMBALANCE_TREND.INCREASING);
  });

  test('trend is decreasing when current window is less skewed', () => {
    const result = detectImbalance({
      current: { u1: 550, u2: 450 },
      previous: { u1: 800, u2: 200 },
    });

    expect(result.trend).toBe(IMBALANCE_TREND.DECREASING);
  });

  test('trend is stable when the change in severity is within epsilon', () => {
    const result = detectImbalance({
      current: { u1: 510, u2: 490 },
      previous: { u1: 505, u2: 495 },
    });

    expect(result.trend).toBe(IMBALANCE_TREND.STABLE);
  });

  test('contributions are sorted by userId and include totals plus shares', () => {
    const result = detectImbalance({
      current: { ub: 300, ua: 700 },
      previous: { ua: 500, ub: 500 },
    });

    expect(result.contributions.map((c) => c.userId)).toEqual(['ua', 'ub']);

    const ua = result.contributions.find((c) => c.userId === 'ua');
    expect(ua.current.total).toBe(700);
    expect(ua.current.share).toBe(0.7);
    expect(ua.previous.share).toBe(0.5);
  });

  test('users that appear in only one window still surface in contributions', () => {
    const result = detectImbalance({
      current: { u1: 400, u2: 600 },
      previous: { u1: 1000 },
    });

    const ids = result.contributions.map((c) => c.userId);
    expect(ids).toEqual(['u1', 'u2']);

    const u2 = result.contributions.find((c) => c.userId === 'u2');
    expect(u2.previous.total).toBe(0);
    expect(u2.previous.share).toBe(0);
  });

  test('window summaries report total spend and user count', () => {
    const result = detectImbalance({
      current: { u1: 200, u2: 300 },
      previous: { u1: 100, u2: 100 },
    });

    expect(result.windows.current.total).toBe(500);
    expect(result.windows.current.userCount).toBe(2);
    expect(result.windows.previous.total).toBe(200);
    expect(result.windows.previous.userCount).toBe(2);
  });

  test('handles empty windows gracefully', () => {
    const result = detectImbalance({ current: {}, previous: {} });

    expect(result.isImbalanced).toBe(false);
    expect(result.delta).toBe(0);
    expect(result.severity).toBe(0);
    expect(result.trend).toBe(IMBALANCE_TREND.STABLE);
    expect(result.contributions).toEqual([]);
    expect(result.windows.current.total).toBe(0);
    expect(result.windows.previous.total).toBe(0);
  });

  test('single-user hive cannot be imbalanced', () => {
    const result = detectImbalance({
      current: { u1: 1000 },
      previous: { u1: 800 },
    });

    expect(result.isImbalanced).toBe(false);
    expect(result.severity).toBe(0);
    expect(result.delta).toBe(0);
  });

  test('non-numeric and negative totals are coerced to zero', () => {
    const result = detectImbalance({
      current: { u1: 'banana', u2: -100, u3: 200 },
      previous: { u1: 100, u2: 100 },
    });

    const u3 = result.contributions.find((c) => c.userId === 'u3');
    expect(u3.current.total).toBe(200);
    expect(u3.current.share).toBe(1);
    expect(result.isImbalanced).toBe(true);
  });

  test('invalid input falls back to empty windows', () => {
    const result = detectImbalance(undefined);

    expect(result.isImbalanced).toBe(false);
    expect(result.contributions).toEqual([]);
    expect(result.windows.current.total).toBe(0);
  });

  test('message references current and previous percentages', () => {
    const result = detectImbalance({
      current: { u1: 700, u2: 300 },
      previous: { u1: 500, u2: 500 },
    });

    expect(result.message).toContain('70%');
    expect(result.message).toContain('30%');
    expect(result.message).toContain('50%');
  });

  test('balanced message differs from imbalanced message', () => {
    const balanced = detectImbalance({
      current: { u1: 500, u2: 500 },
      previous: { u1: 500, u2: 500 },
    });
    const skewed = detectImbalance({
      current: { u1: 800, u2: 200 },
      previous: { u1: 500, u2: 500 },
    });

    expect(balanced.message.toLowerCase()).toContain('balanced');
    expect(skewed.message.toLowerCase()).toContain('imbalanced');
    expect(skewed.message).toContain(IMBALANCE_TREND.INCREASING);
  });
});

describe('severityFromShares', () => {
  test('returns 0 for empty or single-share lists', () => {
    expect(severityFromShares([])).toBe(0);
    expect(severityFromShares([1])).toBe(0);
  });

  test('returns 0 for fair shares', () => {
    expect(severityFromShares([0.5, 0.5])).toBe(0);
    expect(severityFromShares([1 / 3, 1 / 3, 1 / 3])).toBeCloseTo(0, 5);
  });

  test('returns relative deviation from fair share for two-user windows', () => {
    expect(severityFromShares([0.6, 0.4])).toBeCloseTo(0.2, 5);
    expect(severityFromShares([0.65, 0.35])).toBeCloseTo(0.3, 5);
    expect(severityFromShares([1, 0])).toBeCloseTo(1, 5);
  });
});

describe('deltaFromShares', () => {
  test('returns the largest absolute gap from fair share', () => {
    expect(deltaFromShares([0.5, 0.5])).toBe(0);
    expect(deltaFromShares([0.6, 0.4])).toBeCloseTo(0.1, 5);
    expect(deltaFromShares([0.7, 0.3])).toBeCloseTo(0.2, 5);
  });

  test('returns 0 when fewer than two shares', () => {
    expect(deltaFromShares([])).toBe(0);
    expect(deltaFromShares([0.4])).toBe(0);
  });
});

describe('trendBetween', () => {
  test('stable when severities match', () => {
    expect(trendBetween(0.3, 0.3)).toBe(IMBALANCE_TREND.STABLE);
  });

  test('increasing when current is meaningfully higher', () => {
    expect(trendBetween(0.5, 0.1)).toBe(IMBALANCE_TREND.INCREASING);
  });

  test('decreasing when current is meaningfully lower', () => {
    expect(trendBetween(0.1, 0.5)).toBe(IMBALANCE_TREND.DECREASING);
  });

  test('stable when change is within the supplied epsilon', () => {
    expect(trendBetween(0.32, 0.3, 0.05)).toBe(IMBALANCE_TREND.STABLE);
  });

  test('uses IMBALANCE_TREND_EPSILON by default', () => {
    const justInside = IMBALANCE_TREND_EPSILON / 2;
    const justOutside = IMBALANCE_TREND_EPSILON * 2;

    expect(trendBetween(0.4, 0.4 - justInside)).toBe(IMBALANCE_TREND.STABLE);
    expect(trendBetween(0.4, 0.4 - justOutside)).toBe(IMBALANCE_TREND.INCREASING);
  });
});
