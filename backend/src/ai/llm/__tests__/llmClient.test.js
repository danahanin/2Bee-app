const {
  fetchEmbeddings,
  fetchGenerate,
  fetchChatCompletions,
  fetchListModels,
  fetchHealth,
  clearEmbedCache,
  CHAT_MODEL,
  CHAT_COMPLETIONS_MODEL,
} = require('../llmClient')

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

describe('llmClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
    clearEmbedCache()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('fetchEmbeddings', () => {
    it('returns the embedding vector and caches it', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ embedding: [0.1, 0.2, 0.3] }))

      const first = await fetchEmbeddings('hello world')
      const second = await fetchEmbeddings('hello world')

      expect(first).toEqual([0.1, 0.2, 0.3])
      expect(second).toEqual([0.1, 0.2, 0.3])
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('throws on a malformed response', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ notEmbedding: true }))
      await expect(fetchEmbeddings('unique text with no cache hit')).rejects.toThrow(
        'Invalid embeddings response',
      )
    })
  })

  describe('fetchGenerate', () => {
    it('uses the default chat model and returns the response text', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ response: 'hi there' }))

      const result = await fetchGenerate('say hi')

      expect(result).toBe('hi there')
      const [, options] = global.fetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.model).toBe(CHAT_MODEL)
      expect(body.prompt).toBe('say hi')
    })

    it('honors a per-call model override', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ response: 'ok' }))

      await fetchGenerate('say hi', { model: 'gemma2:9b' })

      const [, options] = global.fetch.mock.calls[0]
      expect(JSON.parse(options.body).model).toBe('gemma2:9b')
    })

    it('throws on a malformed response', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ notResponse: true }))
      await expect(fetchGenerate('say hi')).rejects.toThrow('Invalid generate response')
    })
  })

  describe('fetchChatCompletions', () => {
    it('uses the default chat-completions model and extracts message content', async () => {
      global.fetch.mockResolvedValue(
        jsonResponse({ choices: [{ message: { content: 'hello' } }] }),
      )

      const result = await fetchChatCompletions([{ role: 'user', content: 'hi' }])

      expect(result).toBe('hello')
      const [, options] = global.fetch.mock.calls[0]
      expect(JSON.parse(options.body).model).toBe(CHAT_COMPLETIONS_MODEL)
    })

    it('honors a per-call model override', async () => {
      global.fetch.mockResolvedValue(
        jsonResponse({ choices: [{ message: { content: 'hi' } }] }),
      )

      await fetchChatCompletions([{ role: 'user', content: 'hi' }], { model: 'llama3.1:8b' })

      const [, options] = global.fetch.mock.calls[0]
      expect(JSON.parse(options.body).model).toBe('llama3.1:8b')
    })
  })

  describe('fetchListModels', () => {
    it('returns the parsed model list', async () => {
      global.fetch.mockResolvedValue(jsonResponse({ models: [{ name: 'llama3.1:8b' }] }))
      const result = await fetchListModels()
      expect(result.models).toHaveLength(1)
    })
  })

  describe('fetchHealth', () => {
    it('reports ok:true for a healthy response', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, text: async () => 'healthy' })
      const result = await fetchHealth()
      expect(result).toEqual({ ok: true, status: 200, body: 'healthy' })
    })

    it('reports ok:false without throwing when the request fails', async () => {
      global.fetch.mockRejectedValue(new Error('connect timeout'))
      const result = await fetchHealth()
      expect(result.ok).toBe(false)
      expect(result.status).toBe(0)
      expect(result.body).toMatch(/connect timeout/)
    })
  })

  describe('retry behavior', () => {
    it('retries once on 429 then succeeds', async () => {
      jest.useFakeTimers()
      global.fetch
        .mockResolvedValueOnce({ status: 429, ok: false, headers: { get: () => null } })
        .mockResolvedValueOnce(jsonResponse({ response: 'ok after retry' }))

      const promise = fetchGenerate('say hi')
      await jest.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(result).toBe('ok after retry')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('retries on a 5xx then succeeds', async () => {
      jest.useFakeTimers()
      global.fetch
        .mockResolvedValueOnce({ status: 503, ok: false, headers: { get: () => null }, text: async () => 'busy' })
        .mockResolvedValueOnce(jsonResponse({ response: 'ok' }))

      const promise = fetchGenerate('say hi')
      await jest.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(result).toBe('ok')
    })

    it('throws immediately on a 4xx (non-429) without retrying', async () => {
      global.fetch.mockResolvedValue({
        status: 400,
        ok: false,
        headers: { get: () => null },
        text: async () => 'bad request',
      })

      await expect(fetchGenerate('say hi')).rejects.toThrow(/HTTP 400/)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('retries a network-level failure (no HTTP response) then succeeds', async () => {
      jest.useFakeTimers()
      global.fetch
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce(jsonResponse({ response: 'ok after network retry' }))

      const promise = fetchGenerate('say hi')
      await jest.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(result).toBe('ok after network retry')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('gives up after exhausting retries on repeated network failures', async () => {
      jest.useFakeTimers()
      global.fetch.mockImplementation(() => Promise.reject(new TypeError('fetch failed')))

      const promise = fetchGenerate('say hi')
      const assertion = expect(promise).rejects.toThrow('fetch failed')

      await jest.advanceTimersByTimeAsync(1000)
      await jest.advanceTimersByTimeAsync(2000)
      await jest.advanceTimersByTimeAsync(4000)

      await assertion
      expect(global.fetch).toHaveBeenCalledTimes(4)
    })
  })
})
