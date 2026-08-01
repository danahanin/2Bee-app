/**
 * Orchestrates running a classifier function against a golden set for a single model
 * and turning the raw outputs into a metrics report. Kept independent of any specific
 * task (category vs personal/shared) — callers supply how to extract the expected and
 * predicted label from their own item/output shapes.
 */
const {
  computeAccuracy,
  computeMacroF1,
  computeLatencyStats,
  computeConfidenceCalibration,
  computeJsonValidityRate,
} = require('./metrics')

/**
 * @template TItem, TOutput
 * @param {{
 *   items: TItem[],
 *   classify: (item: TItem, model: string) => Promise<TOutput>,
 *   model: string,
 *   getExpected: (item: TItem) => string,
 *   getPredicted: (output: TOutput) => string,
 *   getConfidence?: (output: TOutput) => number,
 *   isJsonValid?: (output: TOutput) => boolean,
 *   concurrency?: number,
 * }} options
 * @returns {Promise<Array<{ id: string, expected: string, predicted: string, confidence: number, jsonValid: boolean, latencyMs: number, error: string|null }>>}
 */
async function evaluateModel({
  items,
  classify,
  model,
  getExpected,
  getPredicted,
  getConfidence = (output) => output.confidence,
  isJsonValid = (output) => output.source === 'ai',
  concurrency = 1,
}) {
  const queue = [...items]
  const results = []

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()
      const startedAt = Date.now()
      try {
        const output = await classify(item, model)
        results.push({
          id: item.id,
          expected: getExpected(item),
          predicted: getPredicted(output),
          confidence: getConfidence(output),
          jsonValid: isJsonValid(output),
          latencyMs: Date.now() - startedAt,
          error: null,
        })
      } catch (err) {
        results.push({
          id: item.id,
          expected: getExpected(item),
          predicted: null,
          confidence: 0,
          jsonValid: false,
          latencyMs: Date.now() - startedAt,
          error: err.message,
        })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker))
  return results
}

/**
 * @param {Array<{ expected: string, predicted: string, confidence: number, jsonValid: boolean, latencyMs: number }>} results
 */
function buildReport(results) {
  const { perClass, macroF1 } = computeMacroF1(results)
  return {
    n: results.length,
    accuracy: computeAccuracy(results),
    macroF1,
    perClass,
    latency: computeLatencyStats(results.map((r) => r.latencyMs)),
    jsonValidityRate: computeJsonValidityRate(results),
    calibration: computeConfidenceCalibration(results),
    errors: results.filter((r) => r.error).map((r) => ({ id: r.id, error: r.error })),
  }
}

module.exports = { evaluateModel, buildReport }
