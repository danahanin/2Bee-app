const ClassificationExample = require('../../../models/ClassificationExample')

/**
 * Insert or update a labelled example with its embedding.
 * @param {{ text: string, metadata: { type: 'personal'|'shared', source?: 'const'|'dynamic', [key: string]: unknown } }} input
 * @returns {Promise<import('mongoose').Document>}
 */
async function upsertExample({ text, metadata }) {
  const { type, source = 'dynamic', ...rest } = metadata || {}
  if (!text || !type) {
    throw new Error('upsertExample requires text and metadata.type')
  }

  const { embedText } = require('./embeddings')
  const embedding = await embedText(text)

  const existing = await ClassificationExample.findOne({ text, type }).lean()
  if (existing) {
    return ClassificationExample.findByIdAndUpdate(
      existing._id,
      { embedding, source, metadata: rest },
      { new: true },
    )
  }

  return ClassificationExample.create({
    text,
    type,
    embedding,
    source,
    metadata: rest,
  })
}

/**
 * Load examples, optionally filtered by type.
 * @param {{ type?: 'personal'|'shared', source?: 'const'|'dynamic' }} [filter]
 * @returns {Promise<Array<{ _id: import('mongoose').Types.ObjectId, text: string, type: string, embedding: number[], source: string }>>}
 */
async function findAll(filter = {}) {
  const query = {}
  if (filter.type) query.type = filter.type
  if (filter.source) query.source = filter.source
  for (const [key, value] of Object.entries(filter)) {
    if (!['type', 'source'].includes(key) && value !== undefined) {
      query[`metadata.${key}`] = value
    }
  }
  return ClassificationExample.find(query).lean()
}

async function countBySource() {
  const rows = await ClassificationExample.aggregate([
    { $group: { _id: '$source', count: { $sum: 1 } } },
  ])
  return Object.fromEntries(rows.map((row) => [row._id, row.count]))
}

module.exports = { upsertExample, findAll, countBySource }
