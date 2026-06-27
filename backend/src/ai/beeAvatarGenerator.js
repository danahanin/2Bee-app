const sharp = require('sharp')
const path = require('path')
const fs = require('fs/promises')

const BASE_URL = (process.env.LLM_BASE_URL || 'http://llm.cs.colman.ac.il').replace(/\/$/, '')
const USERNAME = process.env.LLM_USERNAME || ''
const PASSWORD = process.env.LLM_PASSWORD || ''
const IMAGE_ENDPOINT = process.env.LLM_IMAGE_ENDPOINT || '/api/generate'
const IMAGE_MODEL = process.env.LLM_IMAGE_MODEL || 'flux'

const BEE_PROMPT =
  'Professional fintech bee avatar portrait preserving facial likeness: warm honey palette, subtle antennae, elegant wings, honeycomb accents, polished not cartoonish, square portrait'

function authHeader() {
  const credentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')
  return { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' }
}

async function tryLlmImageGeneration(photoBuffer) {
  if (!USERNAME || !PASSWORD) return null

  const response = await fetch(`${BASE_URL}${IMAGE_ENDPOINT}`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: BEE_PROMPT,
      stream: false,
      images: [photoBuffer.toString('base64')],
    }),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null)

  if (!response?.ok) return null

  const data = await response.json().catch(() => null)
  if (data?.image) {
    return Buffer.from(data.image, 'base64')
  }
  if (typeof data?.response === 'string' && data.response.length > 100) {
    try {
      return Buffer.from(data.response, 'base64')
    } catch {
      return null
    }
  }
  return null
}

async function loadOverlaySvg() {
  const overlayPath = path.join(__dirname, '../../assets/bee-overlays/wings-frame.svg')
  try {
    return await fs.readFile(overlayPath)
  } catch {
    return null
  }
}

async function compositeBeeAvatar(photoBuffer) {
  const size = 512
  const face = await sharp(photoBuffer)
    .rotate()
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .webp()
    .toBuffer()

  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  )

  const maskedFace = await sharp(face)
    .composite([{ input: await sharp(circleMask).png().toBuffer(), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const honeyBorder = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 245, g: 166, b: 35, alpha: 1 },
    },
  })
    .png()
    .toBuffer()

  const stripeAccent = await sharp({
    create: {
      width: size,
      height: 48,
      channels: 4,
      background: { r: 61, g: 41, b: 20, alpha: 0.35 },
    },
  })
    .png()
    .toBuffer()

  const composites = [
    { input: honeyBorder, top: 0, left: 0 },
    { input: maskedFace, top: 8, left: 8 },
    { input: stripeAccent, top: size - 56, left: 0 },
  ]

  const overlay = await loadOverlaySvg()
  if (overlay) {
    const overlayPng = await sharp(overlay).resize(size, size).png().toBuffer()
    composites.push({ input: overlayPng, top: 0, left: 0 })
  }

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 248, b: 231, alpha: 1 },
    },
  })
    .composite(composites)
    .webp({ quality: 88 })
    .toBuffer()
}

async function generateBeeAvatar(photoBuffer) {
  const llmResult = await tryLlmImageGeneration(photoBuffer)
  if (llmResult) {
    return sharp(llmResult).resize(512, 512, { fit: 'cover' }).webp({ quality: 85 }).toBuffer()
  }
  return compositeBeeAvatar(photoBuffer)
}

module.exports = {
  generateBeeAvatar,
  compositeBeeAvatar,
}
