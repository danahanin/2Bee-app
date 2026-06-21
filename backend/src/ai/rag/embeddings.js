const { fetchEmbeddings } = require('./llmClient')

/**
 * Embed a text string via the college all-minilm model.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embedText(text) {
  const normalized = typeof text === 'string' ? text.trim() : ''
  if (!normalized) {
    throw new Error('embedText requires non-empty text')
  }
  return fetchEmbeddings(normalized)
}

module.exports = { embedText }
