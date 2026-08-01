const { embedText } = require('./embeddings')
const vectorStore = require('./vectorStore')

/**
 * Retrieve top-k similar labelled examples for a query string.
 * @param {string} text
 * @param {{ k?: number, filter?: { type?: 'personal'|'shared', source?: 'const'|'dynamic', [key: string]: unknown } }} [options]
 * @returns {Promise<Array<{ text: string, type: 'personal'|'shared', score: number, metadata?: object }>>}
 */
async function retrieveSimilar(text, { k = 5, filter = {} } = {}) {
  const queryEmbedding = await embedText(text)
  return vectorStore.query(queryEmbedding, { k, filter })
}

module.exports = { cosineSimilarity: vectorStore.cosineSimilarity, retrieveSimilar }
