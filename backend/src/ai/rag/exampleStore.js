const { embedText } = require('./embeddings')
const vectorStore = require('./vectorStore')

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

  const embedding = await embedText(text)
  return vectorStore.upsert({ text, embedding, type, source, metadata: rest })
}

/**
 * Load examples, optionally filtered by type.
 * @param {{ type?: 'personal'|'shared', source?: 'const'|'dynamic' }} [filter]
 * @returns {Promise<Array<{ _id: import('mongoose').Types.ObjectId, text: string, type: string, embedding: number[], source: string }>>}
 */
async function findAll(filter = {}) {
  return vectorStore.findMany(filter)
}

async function countBySource() {
  return vectorStore.countBySource()
}

module.exports = { upsertExample, findAll, countBySource }
