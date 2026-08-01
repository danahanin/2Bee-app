jest.mock('../embeddings', () => ({
  embedText: jest.fn(),
}))

jest.mock('../vectorStore', () => ({
  query: jest.fn(),
}))

const { embedText } = require('../embeddings')
const vectorStore = require('../vectorStore')
const { retrieveSimilar } = require('../retriever')

describe('retrieveSimilar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('embeds the query text and delegates scoring to the vector store', async () => {
    embedText.mockResolvedValue([1, 0, 0])
    vectorStore.query.mockResolvedValue([{ text: 'grocery run', type: 'shared', score: 1 }])

    const results = await retrieveSimilar('supermarket groceries', { k: 2 })

    expect(embedText).toHaveBeenCalledWith('supermarket groceries')
    expect(vectorStore.query).toHaveBeenCalledWith([1, 0, 0], { k: 2, filter: {} })
    expect(results).toEqual([{ text: 'grocery run', type: 'shared', score: 1 }])
  })

  it('passes the filter through to the vector store', async () => {
    embedText.mockResolvedValue([1])
    vectorStore.query.mockResolvedValue([])

    await retrieveSimilar('test', { k: 3, filter: { type: 'personal' } })

    expect(vectorStore.query).toHaveBeenCalledWith([1], { k: 3, filter: { type: 'personal' } })
  })

  it('defaults k and filter when not provided', async () => {
    embedText.mockResolvedValue([1])
    vectorStore.query.mockResolvedValue([])

    await retrieveSimilar('test')

    expect(vectorStore.query).toHaveBeenCalledWith([1], { k: 5, filter: {} })
  })
})
