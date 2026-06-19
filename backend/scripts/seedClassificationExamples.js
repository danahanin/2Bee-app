require('../loadEnv')

const mongoose = require('mongoose')
const ClassificationExample = require('../models/ClassificationExample')
const { embedText } = require('../src/ai/rag/embeddings')
const { CLASSIFICATION_EXAMPLES } = require('./classificationExamplesData')

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/twobee'
const RATE_LIMIT_MS = parseInt(process.env.LLM_SEED_DELAY_MS || '13000', 10)

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function seed() {
  await mongoose.connect(mongoUri)

  const existing = await ClassificationExample.countDocuments({ source: 'const' })
  if (existing >= CLASSIFICATION_EXAMPLES.length) {
    console.log(`Already seeded ${existing} const examples — skipping.`)
    await mongoose.disconnect()
    return
  }

  await ClassificationExample.deleteMany({ source: 'const' })
  console.log(`Seeding ${CLASSIFICATION_EXAMPLES.length} classification examples…`)

  let inserted = 0
  for (const example of CLASSIFICATION_EXAMPLES) {
    const embedding = await embedText(example.text)
    await ClassificationExample.create({
      text: example.text,
      type: example.type,
      embedding,
      source: 'const',
    })
    inserted += 1
    if (inserted % 5 === 0) {
      console.log(`  ${inserted}/${CLASSIFICATION_EXAMPLES.length}`)
    }
    if (inserted < CLASSIFICATION_EXAMPLES.length) {
      await sleep(RATE_LIMIT_MS)
    }
  }

  console.log(`Done — inserted ${inserted} examples.`)
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
