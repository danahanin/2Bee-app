jest.mock('../embeddings', () => ({
  embedText: jest.fn(),
}))

jest.mock('../vectorStore', () => ({
  upsert: jest.fn(),
  findMany: jest.fn(),
  countBySource: jest.fn(),
}))

const { embedText } = require('../embeddings')
const vectorStore = require('../vectorStore')
const { upsertExample, findAll, countBySource } = require('../exampleStore')

describe('upsertExample', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('embeds the text and stores it via the vector store', async () => {
    embedText.mockResolvedValue([1, 0, 0])
    vectorStore.upsert.mockResolvedValue({ _id: '1' })

    await upsertExample({ text: 'haircut', metadata: { type: 'personal', hiveId: 'hive-1' } })

    expect(embedText).toHaveBeenCalledWith('haircut')
    expect(vectorStore.upsert).toHaveBeenCalledWith({
      text: 'haircut',
      embedding: [1, 0, 0],
      type: 'personal',
      source: 'dynamic',
      metadata: { hiveId: 'hive-1' },
    })
  })

  it('defaults source to dynamic and requires type', async () => {
    await expect(upsertExample({ text: 'x', metadata: {} })).rejects.toThrow(
      'requires text and metadata.type',
    )
  })

  it('requires non-empty text', async () => {
    await expect(upsertExample({ text: '', metadata: { type: 'shared' } })).rejects.toThrow(
      'requires text and metadata.type',
    )
  })
})

describe('findAll', () => {
  it('delegates to the vector store', async () => {
    vectorStore.findMany.mockResolvedValue([{ text: 'x' }])
    const result = await findAll({ type: 'shared' })
    expect(vectorStore.findMany).toHaveBeenCalledWith({ type: 'shared' })
    expect(result).toEqual([{ text: 'x' }])
  })
})

describe('countBySource', () => {
  it('delegates to the vector store', async () => {
    vectorStore.countBySource.mockResolvedValue({ const: 200, dynamic: 5 })
    await expect(countBySource()).resolves.toEqual({ const: 200, dynamic: 5 })
  })
})
