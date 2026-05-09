const { forecastFromCategoryMonthTotals } = require('../forecaster');

describe('forecastFromCategoryMonthTotals', () => {
  test('returns total first then categories sorted alphabetically', () => {
    const rows = forecastFromCategoryMonthTotals({
      categoryMonthTotals: {
        utilities: [80, 90, 100],
        groceries: [200, 200, 200],
      },
    });

    expect(rows.map((r) => r.category)).toEqual([
      'total',
      'groceries',
      'utilities',
    ]);
  });

  test('predicted amount is mean of up to three month buckets', () => {
    const rows = forecastFromCategoryMonthTotals({
      categoryMonthTotals: {
        a: [100],
        b: [100, 200],
        c: [100, 200, 300],
      },
    });

    const byCat = Object.fromEntries(
      rows.filter((r) => r.category !== 'total').map((r) => [r.category, r])
    );

    expect(byCat.a.predicted).toBe(100);
    expect(byCat.b.predicted).toBe(150);
    expect(byCat.c.predicted).toBe(200);
  });

  test('truncates buckets to three entries (oldest to newest semantics preserved by caller)', () => {
    const rows = forecastFromCategoryMonthTotals({
      categoryMonthTotals: {
        x: [10, 20, 30, 999],
      },
    });

    const cat = rows.find((r) => r.category === 'x');
    expect(cat.predicted).toBe(20);
  });

  test('total predicted equals sum of category predictions', () => {
    const rows = forecastFromCategoryMonthTotals({
      categoryMonthTotals: {
        rent: [1000, 1000, 1000],
        misc: [50, 100, 150],
      },
    });

    const total = rows.find((r) => r.category === 'total');
    const sumCategories = rows
      .filter((r) => r.category !== 'total')
      .reduce((s, r) => s + r.predicted, 0);

    expect(total.predicted).toBe(sumCategories);
    expect(total.predicted).toBe(1100);
  });

  test('handles empty totals object', () => {
    const rows = forecastFromCategoryMonthTotals({ categoryMonthTotals: {} });
    expect(rows).toEqual([
      {
        category: 'total',
        predicted: 0,
        confidence: 0.35,
      },
    ]);
  });

  test('treats non-array buckets as empty', () => {
    const rows = forecastFromCategoryMonthTotals({
      categoryMonthTotals: {
        broken: null,
      },
    });

    const cat = rows.find((r) => r.category === 'broken');
    expect(cat.predicted).toBe(0);
    expect(cat.confidence).toBe(0.35);
  });

  test('confidence is higher for three stable months than one month', () => {
    const one = forecastFromCategoryMonthTotals({
      categoryMonthTotals: { k: [300] },
    });
    const three = forecastFromCategoryMonthTotals({
      categoryMonthTotals: { k: [300, 300, 300] },
    });

    const c1 = one.find((r) => r.category === 'k').confidence;
    const c3 = three.find((r) => r.category === 'k').confidence;
    expect(c3).toBeGreaterThan(c1);
  });

  test('confidence is lower when month-to-month variance is high', () => {
    const stable = forecastFromCategoryMonthTotals({
      categoryMonthTotals: { k: [100, 105, 102] },
    });
    const wild = forecastFromCategoryMonthTotals({
      categoryMonthTotals: { k: [10, 100, 500] },
    });

    const s = stable.find((r) => r.category === 'k').confidence;
    const w = wild.find((r) => r.category === 'k').confidence;
    expect(w).toBeLessThan(s);
  });

  test('confidence values stay within bounds for varied inputs', () => {
    const rows = forecastFromCategoryMonthTotals({
      categoryMonthTotals: {
        one: [100],
        two: [50, 150],
        three: [1, 2, 3],
        zeros: [0, 0, 100],
      },
    });
    rows.forEach((row) => {
      expect(row.confidence).toBeGreaterThanOrEqual(0.35);
      expect(row.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  test('empty bucket list yields zero prediction', () => {
    const rows = forecastFromCategoryMonthTotals({
      categoryMonthTotals: { empty: [] },
    });
    const cat = rows.find((r) => r.category === 'empty');
    expect(cat.predicted).toBe(0);
  });
});
