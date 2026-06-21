const { embedText } = require('./embeddings')
const { findAll } = require('./exampleStore')

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
 * Retrieve top-k similar labelled examples for a query string.
 * @param {string} text
 * @param {{ k?: number, filter?: { type?: 'personal'|'shared', source?: 'const'|'dynamic', [key: string]: unknown } }} [options]
 * @returns {Promise<Array<{ text: string, type: 'personal'|'shared', score: number, metadata?: object }>>}
 */
async function retrieveSimilar(text, { k = 5, filter = {} } = {}) {
  const queryEmbedding = await embedText(text)
  const candidates = await findAll(filter)

  const scored = candidates
    .filter((row) => Array.isArray(row.embedding) && row.embedding.length > 0)
    .map((row) => ({
      text: row.text,
      type: row.type,
      score: cosineSimilarity(queryEmbedding, row.embedding),
      metadata: row.metadata || null,
    }))
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, k)
}

module.exports = { cosineSimilarity, retrieveSimilar }
