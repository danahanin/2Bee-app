require('../loadEnv')

const mongoose = require('mongoose')
const ClassificationExample = require('../models/ClassificationExample')
const { embedText } = require('../src/ai/rag/embeddings')
const vectorStore = require('../src/ai/rag/vectorStore')
const { CLASSIFICATION_EXAMPLES } = require('./classificationExamplesData')

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/twobee'
const RATE_LIMIT_MS = parseInt(process.env.LLM_SEED_DELAY_MS || '13000', 10)

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function alreadySeededTexts() {
  const rows = await ClassificationExample.find({ source: 'const' }, { text: 1 }).lean()
  return new Set(rows.map((row) => row.text))
}

// Embedding each example is a slow, rate-limited network call, so a crash or restart
// shouldn't lose progress — skip whatever's already in the vector store instead of
// wiping and starting over.
async function seed() {
  await mongoose.connect(mongoUri)

  const seededTexts = await alreadySeededTexts()
  const remaining = CLASSIFICATION_EXAMPLES.filter((example) => !seededTexts.has(example.text))

  if (remaining.length === 0) {
    console.log(`Already seeded all ${CLASSIFICATION_EXAMPLES.length} const examples — skipping.`)
    await mongoose.disconnect()
    return
  }

  console.log(
    `${seededTexts.size}/${CLASSIFICATION_EXAMPLES.length} already seeded — embedding the remaining ${remaining.length}…`,
  )

  let inserted = seededTexts.size
  for (const example of remaining) {
    const embedding = await embedText(example.text)
    await vectorStore.upsert({
      text: example.text,
      type: example.type,
      embedding,
      source: 'const',
    })
    inserted += 1
    if (inserted % 5 === 0) {
      console.log(`  ${inserted}/${CLASSIFICATION_EXAMPLES.length}`)
    }
    await sleep(RATE_LIMIT_MS)
  }

  console.log(`Done — ${inserted}/${CLASSIFICATION_EXAMPLES.length} examples seeded.`)
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
