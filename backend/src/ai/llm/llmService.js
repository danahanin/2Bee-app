/**
 * Public LLM facade — the one place the rest of the app should talk to the
 * college LLM service through. Transport details (auth, retry/backoff, embed
 * cache) live in `llmClient.js`; this module adds task-friendly helpers
 * (JSON-safe parsing, health/model discovery) on top.
 *
 * chat(messages, opts) -> Promise<string>
 * generate(prompt, opts) -> Promise<string>
 * embed(text) -> Promise<number[]>
 * chatJSON(messages, opts) -> Promise<object>
 * generateJSON(prompt, opts) -> Promise<object>
 * listModels() -> Promise<{ models: Array<{ name: string }> }>
 * health() -> Promise<{ ok: boolean, status: number, body: string }>
 */

const {
  TASK_MODELS,
  EMBED_MODEL,
  CHAT_MODEL,
  CHAT_COMPLETIONS_MODEL,
  fetchEmbeddings,
  fetchGenerate,
  fetchChatCompletions,
  fetchListModels,
  fetchHealth,
  clearEmbedCache,
} = require('./llmClient')

/**
 * Extract and parse a JSON object from raw LLM text, tolerating extra prose
 * around the object (models sometimes wrap JSON in explanations).
 * @param {string} raw
 * @returns {object}
 */
function parseJsonResponse(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Cannot parse JSON from empty LLM response')
  }
  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('LLM response did not contain a JSON object')
    }
    return JSON.parse(match[0])
  }
}

async function chat(messages, opts = {}) {
  return fetchChatCompletions(messages, opts)
}

async function generate(prompt, opts = {}) {
  return fetchGenerate(prompt, opts)
}

async function embed(text) {
  return fetchEmbeddings(text)
}

async function chatJSON(messages, opts = {}) {
  const raw = await chat(messages, opts)
  return parseJsonResponse(raw)
}

async function generateJSON(prompt, opts = {}) {
  const raw = await generate(prompt, { ...opts, format: opts.format || 'json' })
  return parseJsonResponse(raw)
}

async function listModels() {
  return fetchListModels()
}

async function health() {
  return fetchHealth()
}

module.exports = {
  chat,
  generate,
  embed,
  chatJSON,
  generateJSON,
  parseJsonResponse,
  listModels,
  health,
  clearEmbedCache,
  TASK_MODELS,
  EMBED_MODEL,
  CHAT_MODEL,
  CHAT_COMPLETIONS_MODEL,
}
