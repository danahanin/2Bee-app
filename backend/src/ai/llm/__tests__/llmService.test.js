jest.mock('../llmClient', () => ({
  fetchEmbeddings: jest.fn(),
  fetchGenerate: jest.fn(),
  fetchChatCompletions: jest.fn(),
  fetchListModels: jest.fn(),
  fetchHealth: jest.fn(),
  clearEmbedCache: jest.fn(),
  TASK_MODELS: { category: 'llama3.1:8b', classify: 'llama3.1:8b', hive: 'gpt-oss-120b' },
  EMBED_MODEL: 'all-minilm',
  CHAT_MODEL: 'llama3.1:8b',
  CHAT_COMPLETIONS_MODEL: 'gpt-oss-120b',
}))

const llmClient = require('../llmClient')
const {
  chat,
  generate,
  embed,
  chatJSON,
  generateJSON,
  parseJsonResponse,
  listModels,
  health,
  TASK_MODELS,
} = require('../llmService')

describe('llmService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('delegates chat/generate/embed/listModels/health to the transport layer', async () => {
    llmClient.fetchChatCompletions.mockResolvedValue('chat reply')
    llmClient.fetchGenerate.mockResolvedValue('generate reply')
    llmClient.fetchEmbeddings.mockResolvedValue([1, 2, 3])
    llmClient.fetchListModels.mockResolvedValue({ models: [] })
    llmClient.fetchHealth.mockResolvedValue({ ok: true, status: 200, body: 'healthy' })

    await expect(chat([{ role: 'user', content: 'hi' }])).resolves.toBe('chat reply')
    await expect(generate('hi')).resolves.toBe('generate reply')
    await expect(embed('hi')).resolves.toEqual([1, 2, 3])
    await expect(listModels()).resolves.toEqual({ models: [] })
    await expect(health()).resolves.toEqual({ ok: true, status: 200, body: 'healthy' })
  })

  it('exposes per-task model defaults for downstream classification code', () => {
    expect(TASK_MODELS).toEqual({ category: 'llama3.1:8b', classify: 'llama3.1:8b', hive: 'gpt-oss-120b' })
  })

  describe('parseJsonResponse', () => {
    it('parses clean JSON', () => {
      expect(parseJsonResponse('{"a":1}')).toEqual({ a: 1 })
    })

    it('extracts JSON embedded in surrounding prose', () => {
      expect(parseJsonResponse('Sure, here you go: {"a":1} — hope that helps!')).toEqual({ a: 1 })
    })

    it('throws when no JSON object is present', () => {
      expect(() => parseJsonResponse('no json here')).toThrow()
    })

    it('throws on empty input', () => {
      expect(() => parseJsonResponse('')).toThrow()
    })
  })

  describe('chatJSON / generateJSON', () => {
    it('chatJSON parses the chat completion content as JSON', async () => {
      llmClient.fetchChatCompletions.mockResolvedValue('{"type":"shared","confidence":0.9}')
      const result = await chatJSON([{ role: 'user', content: 'classify' }])
      expect(result).toEqual({ type: 'shared', confidence: 0.9 })
    })

    it('generateJSON requests JSON format and parses the result', async () => {
      llmClient.fetchGenerate.mockResolvedValue('{"category":"dining"}')
      const result = await generateJSON('classify this')
      expect(result).toEqual({ category: 'dining' })
      expect(llmClient.fetchGenerate).toHaveBeenCalledWith('classify this', expect.objectContaining({ format: 'json' }))
    })
  })
})
