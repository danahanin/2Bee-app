/**
 * Pure scoring functions for the model evaluation harness (see evalClassifier.js).
 * Kept dependency-free and side-effect-free so they can be unit tested without ever
 * calling the LLM.
 */

/**
 * @param {Array<{ expected: string, predicted: string }>} results
 * @returns {number} Fraction correct, in [0, 1]. 0 for an empty result set.
 */
function computeAccuracy(results) {
  if (results.length === 0) return 0
  const correct = results.filter((r) => r.predicted === r.expected).length
  return correct / results.length
}

/**
 * @param {Array<{ expected: string, predicted: string }>} results
 * @returns {Record<string, Record<string, number>>} confusion[expected][predicted] = count
 */
function computeConfusionMatrix(results) {
  const matrix = {}
  for (const { expected, predicted } of results) {
    matrix[expected] = matrix[expected] || {}
    matrix[expected][predicted] = (matrix[expected][predicted] || 0) + 1
  }
  return matrix
}

/**
 * Per-class precision/recall/F1, plus the macro-average F1 across all labels seen
 * (as either an expected or predicted value).
 * @param {Array<{ expected: string, predicted: string }>} results
 * @returns {{ perClass: Record<string, { precision: number, recall: number, f1: number, support: number }>, macroF1: number }}
 */
function computeMacroF1(results) {
  const labels = new Set()
  for (const { expected, predicted } of results) {
    labels.add(expected)
    labels.add(predicted)
  }

  const perClass = {}
  for (const label of labels) {
    let truePositive = 0
    let falsePositive = 0
    let falseNegative = 0
    let support = 0

    for (const { expected, predicted } of results) {
      if (expected === label) support += 1
      if (predicted === label && expected === label) truePositive += 1
      else if (predicted === label && expected !== label) falsePositive += 1
      else if (predicted !== label && expected === label) falseNegative += 1
    }

    const precision = truePositive + falsePositive > 0 ? truePositive / (truePositive + falsePositive) : 0
    const recall = truePositive + falseNegative > 0 ? truePositive / (truePositive + falseNegative) : 0
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

    perClass[label] = { precision, recall, f1, support }
  }

  const f1Values = Object.values(perClass).map((c) => c.f1)
  const macroF1 = f1Values.length > 0 ? f1Values.reduce((sum, v) => sum + v, 0) / f1Values.length : 0

  return { perClass, macroF1 }
}

/**
 * @param {number[]} latenciesMs
 * @returns {{ mean: number, p50: number, p95: number, min: number, max: number }}
 */
function computeLatencyStats(latenciesMs) {
  if (latenciesMs.length === 0) return { mean: 0, p50: 0, p95: 0, min: 0, max: 0 }

  const sorted = [...latenciesMs].sort((a, b) => a - b)
  const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]

  return {
    mean: sorted.reduce((sum, v) => sum + v, 0) / sorted.length,
    p50: percentile(50),
    p95: percentile(95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  }
}

/**
 * Buckets predictions by confidence and reports the actual accuracy within each
 * bucket — a well-calibrated model's accuracy should track its confidence.
 * @param {Array<{ expected: string, predicted: string, confidence: number }>} results
 * @param {number[]} [bucketEdges] Ascending edges, e.g. [0.5, 0.7, 0.9, 1.01].
 * @returns {Array<{ range: string, count: number, accuracy: number, meanConfidence: number }>}
 */
function computeConfidenceCalibration(results, bucketEdges = [0.5, 0.7, 0.9, 1.01]) {
  const buckets = bucketEdges.map((edge, index) => ({
    lower: index === 0 ? 0 : bucketEdges[index - 1],
    upper: edge,
    items: [],
  }))

  for (const result of results) {
    const confidence = typeof result.confidence === 'number' ? result.confidence : 0
    const bucket = buckets.find((b) => confidence >= b.lower && confidence < b.upper) || buckets[buckets.length - 1]
    bucket.items.push(result)
  }

  return buckets
    .filter((b) => b.items.length > 0)
    .map((b) => ({
      range: `[${b.lower.toFixed(2)}, ${Math.min(b.upper, 1).toFixed(2)})`,
      count: b.items.length,
      accuracy: computeAccuracy(b.items),
      meanConfidence: b.items.reduce((sum, r) => sum + (r.confidence || 0), 0) / b.items.length,
    }))
}

/**
 * @param {Array<{ jsonValid: boolean }>} results
 * @returns {number} Fraction of results whose LLM response parsed as valid JSON (source === 'ai').
 */
function computeJsonValidityRate(results) {
  if (results.length === 0) return 0
  return results.filter((r) => r.jsonValid).length / results.length
}

module.exports = {
  computeAccuracy,
  computeConfusionMatrix,
  computeMacroF1,
  computeLatencyStats,
  computeConfidenceCalibration,
  computeJsonValidityRate,
}
