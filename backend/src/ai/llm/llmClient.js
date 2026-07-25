const crypto = require('crypto')

const BASE_URL = (process.env.LLM_BASE_URL || 'http://llm.cs.colman.ac.il').replace(/\/$/, '')
const USERNAME = process.env.LLM_USERNAME || ''
const PASSWORD = process.env.LLM_PASSWORD || ''

const EMBED_MODEL = process.env.LLM_EMBED_MODEL || 'all-minilm'
const CHAT_MODEL = process.env.LLM_CHAT_MODEL || 'llama3.1:8b'
// The integration guide's "gpt-oss-120b" is not actually installed on the live server
// (verified via /api/tags: 404 on chat completions). The closest available high-capability
// model is the "thinking" model below; see the max_tokens note in fetchChatCompletions.
const CHAT_COMPLETIONS_MODEL = process.env.LLM_CHAT_COMPLETIONS_MODEL || 'qwen3.6:27b-capped'

// Reasoned per-task defaults (see plan "Per-task model selection"). Overridable per
// deployment without touching code, and swappable again once the eval harness (Step 4) runs.
const TASK_MODELS = {
  category: process.env.LLM_CATEGORY_MODEL || 'llama3.1:8b',
  classify: process.env.LLM_CLASSIFY_MODEL || 'llama3.1:8b',
  hive: process.env.LLM_HIVE_MODEL || 'qwen3.6:27b-capped',
}

// "Thinking" models (e.g. qwen3.6:27b-capped) spend completion tokens on an internal
// reasoning trace before writing the final answer to message.content. With a small
// max_tokens budget the response gets cut off mid-reasoning and content comes back empty
// (finish_reason: "length"), even though the request "succeeded". Give chat completions
// enough headroom by default; callers on fast, non-reasoning models can lower it.
const DEFAULT_CHAT_COMPLETIONS_MAX_TOKENS = 1200

const MAX_RETRIES = 3
const BACKOFF_MS = [1000, 2000, 4000]
const HEALTH_TIMEOUT_MS = 10000
const TAGS_TIMEOUT_MS = 15000

const embedCache = new Map()
const EMBED_CACHE_TTL_MS = 24 * 60 * 60 * 1000

function authHeader() {
  const credentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')
  return { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' }
}

function cacheKey(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function getCachedEmbedding(text) {
  const entry = embedCache.get(cacheKey(text))
  if (!entry) return null
  if (Date.now() - entry.at > EMBED_CACHE_TTL_MS) {
    embedCache.delete(cacheKey(text))
    return null
  }
  return entry.embedding
}

function setCachedEmbedding(text, embedding) {
  embedCache.set(cacheKey(text), { embedding, at: Date.now() })
}

function clearEmbedCache() {
  embedCache.clear()
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithBackoff(url, options) {
  let lastError

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response
    try {
      response = await fetch(url, options)
    } catch (err) {
      // Network-level failure (DNS, connection reset, timeout) — no HTTP response to
      // inspect, but still worth retrying the same way as a 5xx.
      lastError = err
      if (attempt < MAX_RETRIES) {
        await sleep(BACKOFF_MS[attempt])
        continue
      }
      throw lastError
    }

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) {
        throw new Error('LLM rate limit exceeded after retries')
      }
      const retryAfter = parseInt(response.headers.get('Retry-After') || '0', 10)
      const delay = retryAfter > 0 ? retryAfter * 1000 : BACKOFF_MS[attempt]
      await sleep(delay)
      continue
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      lastError = new Error(`LLM request failed: HTTP ${response.status}${body ? ` — ${body.slice(0, 200)}` : ''}`)
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        await sleep(BACKOFF_MS[attempt])
        continue
      }
      throw lastError
    }

    return response
  }

  throw lastError || new Error('LLM request failed')
}

async function fetchEmbeddings(text) {
  const cached = getCachedEmbedding(text)
  if (cached) return cached

  const response = await fetchWithBackoff(`${BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  })

  const data = await response.json()
  if (!Array.isArray(data.embedding)) {
    throw new Error('Invalid embeddings response')
  }

  setCachedEmbedding(text, data.embedding)
  return data.embedding
}

async function fetchGenerate(prompt, opts = {}) {
  const { format, temperature = 0.2, num_predict = 500, model } = opts
  const body = {
    model: model || CHAT_MODEL,
    prompt,
    stream: false,
    options: { temperature, num_predict },
  }
  if (format) body.format = format

  const response = await fetchWithBackoff(`${BASE_URL}/api/generate`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (typeof data.response !== 'string') {
    throw new Error('Invalid generate response')
  }
  return data.response
}

async function fetchChatCompletions(messages, opts = {}) {
  const { temperature = 0.2, max_tokens = DEFAULT_CHAT_COMPLETIONS_MAX_TOKENS, model } = opts

  const response = await fetchWithBackoff(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({
      model: model || CHAT_COMPLETIONS_MODEL,
      messages,
      temperature,
      max_tokens,
    }),
  })

  const data = await response.json()
  const message = data?.choices?.[0]?.message
  const content = message?.content
  if (typeof content !== 'string') {
    throw new Error('Invalid chat completion response')
  }
  if (!content.trim() && data?.choices?.[0]?.finish_reason === 'length' && message?.reasoning) {
    throw new Error(
      'Chat completion truncated before writing content — a "thinking" model ran out of ' +
        'max_tokens on its reasoning trace. Increase max_tokens or use a non-reasoning model.',
    )
  }
  return content
}

async function fetchListModels() {
  const response = await fetchWithBackoff(`${BASE_URL}/api/tags`, {
    method: 'GET',
    headers: authHeader(),
  })
  return response.json()
}

async function fetchHealth() {
  try {
    // The docs describe /api/health as open, but the live nginx proxy gates every path
    // (including health) behind Basic auth, so we send credentials here too.
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      headers: authHeader(),
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    })
    const body = await response.text().catch(() => '')
    return { ok: response.ok, status: response.status, body }
  } catch (err) {
    return { ok: false, status: 0, body: err.message }
  }
}

module.exports = {
  BASE_URL,
  EMBED_MODEL,
  CHAT_MODEL,
  CHAT_COMPLETIONS_MODEL,
  TASK_MODELS,
  TAGS_TIMEOUT_MS,
  fetchEmbeddings,
  fetchGenerate,
  fetchChatCompletions,
  fetchListModels,
  fetchHealth,
  clearEmbedCache,
}
