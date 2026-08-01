require('../loadEnv')

const { health, listModels, embed, generate, chat } = require('../src/ai/llm')

async function timed(name, fn) {
  const start = Date.now()
  try {
    const value = await fn()
    return { name, pass: true, ms: Date.now() - start, value }
  } catch (err) {
    return { name, pass: false, ms: Date.now() - start, error: err.message }
  }
}

function preview(value) {
  if (Array.isArray(value)) return `vector[${value.length}]`
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').slice(0, 120)
  return JSON.stringify(value).slice(0, 120)
}

// /api/health is documented as always-on, but is not exposed on every deployment
// (observed 404 on the live server) — treat it as informational, not a pass/fail gate.
const INFORMATIONAL_CHECKS = new Set(['health'])

async function run() {
  console.log(`Testing LLM connection at ${process.env.LLM_BASE_URL || '(default base url)'}\n`)

  const checks = [
    () => timed('health', () => health()),
    () => timed('listModels', () => listModels()),
    () => timed('embed', () => embed('hello world')),
    () => timed('generate', () => generate('Reply with the single word: hi', { num_predict: 20 })),
    // No max_tokens override here: the chat-completions model may be a "thinking" model
    // that needs headroom for its reasoning trace before it writes the final answer.
    () => timed('chat', () => chat([{ role: 'user', content: 'Reply with the single word: hi' }])),
  ]

  const results = []
  for (const check of checks) {
    results.push(await check())
  }

  for (const result of results) {
    const informational = INFORMATIONAL_CHECKS.has(result.name)
    const status = result.pass ? (informational ? 'INFO' : 'PASS') : informational ? 'INFO' : 'FAIL'
    console.log(`[${status}] ${result.name} (${result.ms}ms)`)
    console.log(`   -> ${result.pass ? preview(result.value) : result.error}`)
  }

  const failed = results.filter((result) => !result.pass && !INFORMATIONAL_CHECKS.has(result.name))
  if (failed.length > 0) {
    console.error(`\n${failed.length} check(s) failed.`)
    process.exitCode = 1
    return
  }
  console.log('\nAll required checks passed (health is informational only).')
}

run()
