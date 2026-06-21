/**
 * Shared RAG module — frozen public API for Phase 1, Phase 2, and feedback loop.
 *
 * embedText(text) -> Promise<number[]>
 * upsertExample({ text, metadata }) -> Promise<Document>  // metadata.type required
 * retrieveSimilar(text, { k, filter }) -> Promise<{ text, type, score }[]>
 * llmChat(messages, opts) -> Promise<string>
 * llmGenerate(prompt, opts) -> Promise<string>
 */

const { embedText } = require('./embeddings')
const { upsertExample, findAll, countBySource } = require('./exampleStore')
const { retrieveSimilar, cosineSimilarity } = require('./retriever')
const { fetchGenerate, fetchChatCompletions } = require('./llmClient')

async function llmGenerate(prompt, opts = {}) {
  return fetchGenerate(prompt, opts)
}

async function llmChat(messages, opts = {}) {
  return fetchChatCompletions(messages, opts)
}

module.exports = {
  embedText,
  upsertExample,
  retrieveSimilar,
  llmChat,
  llmGenerate,
  cosineSimilarity,
  findAll,
  countBySource,
}
