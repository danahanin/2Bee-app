jest.mock('../../../../models/ClassificationExample', () => ({
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  aggregate: jest.fn(),
}))

const ClassificationExample = require('../../../../models/ClassificationExample')
const vectorStore = require('../vectorStore')

function withLean(value) {
  return { lean: () => Promise.resolve(value) }
}

describe('vectorStore.cosineSimilarity', () => {
  it('returns 1 for identical vectors and 0 for mismatched lengths', () => {
    expect(vectorStore.cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1)
    expect(vectorStore.cosineSimilarity([1, 2], [1])).toBe(0)
  })
})

describe('vectorStore.upsert', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a new document when none exists', async () => {
    ClassificationExample.findOne.mockReturnValue(withLean(null))
    ClassificationExample.create.mockResolvedValue({ _id: '1' })

    await vectorStore.upsert({ text: 'haircut', embedding: [1, 0], type: 'personal' })

    expect(ClassificationExample.create).toHaveBeenCalledWith({
      text: 'haircut',
      type: 'personal',
      embedding: [1, 0],
      source: 'dynamic',
      metadata: null,
    })
  })

  it('updates the existing document when a text+type match exists', async () => {
    ClassificationExample.findOne.mockReturnValue(withLean({ _id: 'existing-id' }))
    ClassificationExample.findByIdAndUpdate.mockResolvedValue({ _id: 'existing-id' })

    await vectorStore.upsert({
      text: 'haircut',
      embedding: [1, 0],
      type: 'personal',
      source: 'const',
      metadata: { note: 'seed' },
    })

    expect(ClassificationExample.findByIdAndUpdate).toHaveBeenCalledWith(
      'existing-id',
      { embedding: [1, 0], source: 'const', metadata: { note: 'seed' } },
      { new: true },
    )
  })

  it('rejects a missing or empty embedding', async () => {
    await expect(vectorStore.upsert({ text: 'x', embedding: [], type: 'personal' })).rejects.toThrow(
      'requires text, type, and a non-empty embedding',
    )
  })
})

describe('vectorStore.findMany', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('builds a query from type, source, and metadata keys', async () => {
    ClassificationExample.find.mockReturnValue(withLean([]))

    await vectorStore.findMany({ type: 'personal', source: 'dynamic', hiveId: 'hive-1' })

    expect(ClassificationExample.find).toHaveBeenCalledWith({
      type: 'personal',
      source: 'dynamic',
      'metadata.hiveId': 'hive-1',
    })
  })
})

describe('vectorStore.query', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the top-k candidates sorted by cosine score', async () => {
    ClassificationExample.find.mockReturnValue(
      withLean([
        { text: 'grocery run', type: 'shared', embedding: [1, 0, 0] },
        { text: 'coffee shop', type: 'personal', embedding: [0, 1, 0] },
        { text: 'supermarket bill', type: 'shared', embedding: [0.9, 0.1, 0] },
      ]),
    )

    const results = await vectorStore.query([1, 0, 0], { k: 2 })

    expect(results).toHaveLength(2)
    expect(results[0].text).toBe('grocery run')
    expect(results[0].score).toBeCloseTo(1)
    expect(results[1].text).toBe('supermarket bill')
  })

  it('skips candidates without a usable embedding', async () => {
    ClassificationExample.find.mockReturnValue(
      withLean([
        { text: 'no vector', type: 'personal', embedding: [] },
        { text: 'valid', type: 'shared', embedding: [1, 0] },
      ]),
    )

    const results = await vectorStore.query([1, 0], { k: 5 })
    expect(results).toHaveLength(1)
    expect(results[0].text).toBe('valid')
  })

  it('passes the filter through to findMany', async () => {
    ClassificationExample.find.mockReturnValue(withLean([]))

    await vectorStore.query([1], { k: 3, filter: { type: 'personal' } })

    expect(ClassificationExample.find).toHaveBeenCalledWith({ type: 'personal' })
  })
})

describe('vectorStore.countBySource', () => {
  it('maps aggregate rows to a source -> count record', async () => {
    ClassificationExample.aggregate.mockResolvedValue([
      { _id: 'const', count: 180 },
      { _id: 'dynamic', count: 12 },
    ])

    await expect(vectorStore.countBySource()).resolves.toEqual({ const: 180, dynamic: 12 })
  })
})
