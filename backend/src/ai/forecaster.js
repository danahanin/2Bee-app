function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function arithmeticMean(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function populationStdDev(values, meanValue) {
  if (!values.length) {
    return 0;
  }
  const variance =
    values.reduce((sum, v) => sum + (v - meanValue) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function coefficientOfVariation(values, meanValue) {
  if (values.length <= 1) {
    return 0;
  }
  if (meanValue === 0) {
    const hasNonZero = values.some((v) => v !== 0);
    return hasNonZero ? 1 : 0;
  }
  return populationStdDev(values, meanValue) / Math.abs(meanValue);
}

function confidenceFromSamples(values) {
  if (!values.length) {
    return 0.35;
  }
  const n = values.length;
  const meanValue = arithmeticMean(values);
  const samplePortion = n / 3;
  const cv = coefficientOfVariation(values, meanValue);
  const stabilityPortion = 1 / (1 + cv);
  const blended =
    0.35 * samplePortion + 0.65 * stabilityPortion + (n >= 3 ? 0.05 : 0);
  return clamp(blended, 0.35, 0.95);
}

function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

function roundConfidence(value) {
  return Math.round(value * 1000) / 1000;
}

function forecastRowsForTotals(categoryMonthTotals) {
  const names = Object.keys(categoryMonthTotals)
    .filter((key) => key !== '__proto__' && key !== 'constructor')
    .sort();

  const rows = names.map((category) => {
    const buckets = categoryMonthTotals[category];
    const values = Array.isArray(buckets) ? buckets.slice(0, 3) : [];
    const predicted = roundMoney(arithmeticMean(values));
    const confidence = roundConfidence(confidenceFromSamples(values));

    return { category, predicted, confidence };
  });

  const totalPredicted = roundMoney(
    rows.reduce((sum, row) => sum + row.predicted, 0)
  );
  const totalConfidence =
    rows.length === 0
      ? 0.35
      : roundConfidence(
          arithmeticMean(rows.map((row) => row.confidence))
        );

  const totalRow = {
    category: 'total',
    predicted: totalPredicted,
    confidence: totalConfidence,
  };

  return [totalRow, ...rows];
}

function forecastFromCategoryMonthTotals(input) {
  const categoryMonthTotals =
    input &&
    typeof input === 'object' &&
    input.categoryMonthTotals &&
    typeof input.categoryMonthTotals === 'object'
      ? input.categoryMonthTotals
      : {};

  return forecastRowsForTotals(categoryMonthTotals);
}

module.exports = {
  forecastFromCategoryMonthTotals,
};
