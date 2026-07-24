/**
 * VectorStore — the only place that knows HOW embeddings are persisted and queried.
 * Today this wraps a plain MongoDB collection (`ClassificationExample`) and scores
 * candidates with in-app cosine similarity, which is plenty fast for the hundreds-to-low-
 * thousands of examples this app expects.
 *
 * To swap storage later (e.g. MongoDB Atlas `$vectorSearch` or pgvector), only this file
 * needs to change: `upsert`, `findMany`, and `query` are the entire contract callers rely
 * on (`exampleStore.js`, `retriever.js`). `query` would become an aggregation/SQL call
 * that does the nearest-neighbor search server-side instead of scoring in JS.
 *
 * upsert({ text, embedding, type, source?, metadata? }) -> Promise<Document>
 * findMany({ type?, source?, [metadataKey]: value }) -> Promise<Array<Row>>
 * query(embedding, { k?, filter? }) -> Promise<Array<{ text, type, score, metadata }>>
 * countBySource() -> Promise<Record<string, number>>
 */

const ClassificationExample = require('../../../models/ClassificationExample')

/**
 * Cosine similarity between two equal-length vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) {
    return 0
  }

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (denom === 0) return 0
  return dot / denom
}

/**
 * Insert or update a labelled, embedded example.
 * @param {{ text: string, embedding: number[], type: 'personal'|'shared', source?: 'const'|'dynamic', metadata?: object|null }} input
 * @returns {Promise<import('mongoose').Document>}
 */
async function upsert({ text, embedding, type, source = 'dynamic', metadata = null }) {
  if (!text || !type || !Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('vectorStore.upsert requires text, type, and a non-empty embedding vector')
  }

  const existing = await ClassificationExample.findOne({ text, type }).lean()
  if (existing) {
    return ClassificationExample.findByIdAndUpdate(
      existing._id,
      { embedding, source, metadata },
      { new: true },
    )
  }

  return ClassificationExample.create({ text, type, embedding, source, metadata })
}

/**
 * Load rows matching a filter, without any similarity scoring.
 * @param {{ type?: 'personal'|'shared', source?: 'const'|'dynamic', [key: string]: unknown }} [filter]
 * @returns {Promise<Array<{ _id: import('mongoose').Types.ObjectId, text: string, type: string, embedding: number[], source: string, metadata: object|null }>>}
 */
async function findMany(filter = {}) {
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

/**
 * Nearest-neighbor search: score every candidate matching `filter` against `embedding`
 * and return the top-k by cosine similarity, descending.
 * @param {number[]} embedding
 * @param {{ k?: number, filter?: object }} [options]
 * @returns {Promise<Array<{ text: string, type: string, score: number, metadata: object|null }>>}
 */
async function query(embedding, { k = 5, filter = {} } = {}) {
  const candidates = await findMany(filter)

  return candidates
    .filter((row) => Array.isArray(row.embedding) && row.embedding.length > 0)
    .map((row) => ({
      text: row.text,
      type: row.type,
      score: cosineSimilarity(embedding, row.embedding),
      metadata: row.metadata || null,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

async function countBySource() {
  const rows = await ClassificationExample.aggregate([
    { $group: { _id: '$source', count: { $sum: 1 } } },
  ])
  return Object.fromEntries(rows.map((row) => [row._id, row.count]))
}

module.exports = { cosineSimilarity, upsert, findMany, query, countBySource }
