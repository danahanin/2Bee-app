/**
 * Model evaluation harness — runs the golden set (src/ai/eval/goldenSet.js) against
 * one or more candidate models for a classification task and prints accuracy, macro
 * F1, latency, JSON-validity, and confidence-calibration metrics side by side, so a
 * TASK_MODELS.* choice in .env can be backed by a number instead of a guess.
 *
 * Usage:
 *   node scripts/evalClassifier.js --task=category --models=llama3.1:8b,mistral
 *   node scripts/evalClassifier.js --task=classify --limit=10   (quick smoke run)
 *   node scripts/evalClassifier.js                              (both tasks, default candidates)
 */
require('../loadEnv')
const fs = require('fs')
const path = require('path')

const { classifyCategory } = require('../src/ai/classification/classifyCategory')
const { classifyPersonalOrShared } = require('../src/ai/classification/classifyPersonalOrShared')
const { CATEGORY_GOLDEN_SET, PERSONAL_OR_SHARED_GOLDEN_SET } = require('../src/ai/eval/goldenSet')
const { evaluateModel, buildReport } = require('../src/ai/eval/runEval')

// Installed on the live college server as of the last `npm run test:llm` discovery —
// see backend/.env.example for how these were found. Kept as the default candidate
// pool so `node scripts/evalClassifier.js` works with no flags.
const DEFAULT_CANDIDATE_MODELS = [
  'llama3.1:8b',
  'mistral',
  'gemma2:9b',
  'gemma3:12b',
  'qwen2.5-coder:32b',
  'qwen3.6:27b-capped',
]

const TASKS = {
  category: {
    goldenSet: CATEGORY_GOLDEN_SET,
    classify: (item, model) => classifyCategory(item.signal, { model }),
    getExpected: (item) => item.expectedCategory,
    getPredicted: (output) => output.value,
  },
  classify: {
    goldenSet: PERSONAL_OR_SHARED_GOLDEN_SET,
    classify: (item, model) => classifyPersonalOrShared(item.signal, { model }),
    getExpected: (item) => item.expectedType,
    getPredicted: (output) => output.value,
  },
}

function parseArgs(argv) {
  const args = { task: null, models: null, limit: null, concurrency: 1 }
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, '').split('=')
    if (key === 'task') args.task = value
    if (key === 'models') args.models = value.split(',').map((m) => m.trim()).filter(Boolean)
    if (key === 'limit') args.limit = Number(value)
    if (key === 'concurrency') args.concurrency = Number(value)
  }
  return args
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`
}

function printReport(taskName, model, report) {
  console.log(`\n--- ${taskName} :: ${model} (n=${report.n}) ---`)
  console.log(`accuracy: ${formatPercent(report.accuracy)}   macroF1: ${report.macroF1.toFixed(3)}   jsonValidity: ${formatPercent(report.jsonValidityRate)}`)
  console.log(`latency ms: mean=${report.latency.mean.toFixed(0)} p50=${report.latency.p50.toFixed(0)} p95=${report.latency.p95.toFixed(0)}`)

  console.log('per-class:')
  for (const [label, stats] of Object.entries(report.perClass)) {
    console.log(`  ${label.padEnd(14)} precision=${stats.precision.toFixed(2)} recall=${stats.recall.toFixed(2)} f1=${stats.f1.toFixed(2)} support=${stats.support}`)
  }

  if (report.calibration.length > 0) {
    console.log('confidence calibration:')
    for (const bucket of report.calibration) {
      console.log(`  ${bucket.range.padEnd(16)} n=${bucket.count} accuracy=${formatPercent(bucket.accuracy)} meanConfidence=${bucket.meanConfidence.toFixed(2)}`)
    }
  }

  if (report.errors.length > 0) {
    console.log(`errors: ${report.errors.length}`)
    for (const error of report.errors.slice(0, 5)) {
      console.log(`  [${error.id}] ${error.error}`)
    }
  }
}

function printLeaderboard(taskName, modelReports) {
  console.log(`\n=== ${taskName}: model leaderboard (by accuracy) ===`)
  const sorted = [...modelReports].sort((a, b) => b.report.accuracy - a.report.accuracy)
  for (const { model, report } of sorted) {
    console.log(
      `${model.padEnd(24)} accuracy=${formatPercent(report.accuracy)} macroF1=${report.macroF1.toFixed(3)} p50=${report.latency.p50.toFixed(0)}ms jsonValidity=${formatPercent(report.jsonValidityRate)}`,
    )
  }
}

function writeResultsFile(allResults) {
  const dir = path.join(__dirname, '..', 'eval', 'results')
  fs.mkdirSync(dir, { recursive: true })
  const filename = `eval-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, JSON.stringify(allResults, null, 2))
  return filePath
}

async function runTask(taskName, models, { limit, concurrency }) {
  const task = TASKS[taskName]
  const goldenSet = limit ? task.goldenSet.slice(0, limit) : task.goldenSet

  const modelReports = []
  for (const model of models) {
    const results = await evaluateModel({
      items: goldenSet,
      classify: task.classify,
      model,
      getExpected: task.getExpected,
      getPredicted: task.getPredicted,
      concurrency,
    })
    const report = buildReport(results)
    printReport(taskName, model, report)
    modelReports.push({ model, report, results })
  }

  printLeaderboard(taskName, modelReports)
  return modelReports
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const models = args.models || DEFAULT_CANDIDATE_MODELS
  const taskNames = args.task ? [args.task] : Object.keys(TASKS)

  const invalidTask = taskNames.find((name) => !TASKS[name])
  if (invalidTask) {
    console.error(`Unknown task "${invalidTask}". Valid tasks: ${Object.keys(TASKS).join(', ')}`)
    process.exitCode = 1
    return
  }

  console.log(`Evaluating task(s): ${taskNames.join(', ')}`)
  console.log(`Candidate models: ${models.join(', ')}`)

  const allResults = {}
  for (const taskName of taskNames) {
    allResults[taskName] = await runTask(taskName, models, { limit: args.limit, concurrency: args.concurrency })
  }

  const filePath = writeResultsFile(allResults)
  console.log(`\nFull results written to ${filePath}`)
}

run()
