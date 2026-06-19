jest.mock('../embeddings', () => ({
  embedText: jest.fn(),
}))

jest.mock('../exampleStore', () => ({
  findAll: jest.fn(),
}))

const { embedText } = require('../embeddings')
const { findAll } = require('../exampleStore')
const { retrieveSimilar } = require('../retriever')

describe('retrieveSimilar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns top-k examples sorted by cosine score', async () => {
    embedText.mockResolvedValue([1, 0, 0])
    findAll.mockResolvedValue([
      { text: 'grocery run', type: 'shared', embedding: [1, 0, 0] },
      { text: 'coffee shop', type: 'personal', embedding: [0, 1, 0] },
      { text: 'supermarket bill', type: 'shared', embedding: [0.9, 0.1, 0] },
    ])

    const results = await retrieveSimilar('supermarket groceries', { k: 2 })

    expect(results).toHaveLength(2)
    expect(results[0].text).toBe('grocery run')
    expect(results[0].type).toBe('shared')
    expect(results[0].score).toBeCloseTo(1)
    expect(results[1].text).toBe('supermarket bill')
  })

  it('passes filter to findAll', async () => {
    embedText.mockResolvedValue([1])
    findAll.mockResolvedValue([])

    await retrieveSimilar('test', { k: 3, filter: { type: 'personal' } })

    expect(findAll).toHaveBeenCalledWith({ type: 'personal' })
  })

  it('skips candidates without embeddings', async () => {
    embedText.mockResolvedValue([1, 0])
    findAll.mockResolvedValue([
      { text: 'no vector', type: 'personal', embedding: [] },
      { text: 'valid', type: 'shared', embedding: [1, 0] },
    ])

    const results = await retrieveSimilar('test', { k: 5 })
    expect(results).toHaveLength(1)
    expect(results[0].text).toBe('valid')
  })
})
