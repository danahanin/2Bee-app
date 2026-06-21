const crypto = require('crypto')

const BASE_URL = (process.env.LLM_BASE_URL || 'http://llm.cs.colman.ac.il').replace(/\/$/, '')
const USERNAME = process.env.LLM_USERNAME || ''
const PASSWORD = process.env.LLM_PASSWORD || ''
const CHAT_MODEL = process.env.LLM_CHAT_MODEL || 'llama3.1:8b'
const EMBED_MODEL = process.env.LLM_EMBED_MODEL || 'all-minilm'
const MAX_RETRIES = 3
const BACKOFF_MS = [1000, 2000, 4000]

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
    const response = await fetch(url, options)

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
  const { format, temperature = 0.2, num_predict = 500 } = opts
  const body = {
    model: CHAT_MODEL,
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
  const { temperature = 0.2, max_tokens = 500 } = opts

  const response = await fetchWithBackoff(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({
      model: 'gpt-oss-120b',
      messages,
      temperature,
      max_tokens,
    }),
  })

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('Invalid chat completion response')
  }
  return content
}

module.exports = {
  fetchEmbeddings,
  fetchGenerate,
  fetchChatCompletions,
  clearEmbedCache,
  EMBED_MODEL,
  CHAT_MODEL,
}
