const fs = require('fs/promises')
const path = require('path')
const sharp = require('sharp')
const { AppError } = require('../../utils/appError')

const AVATAR_DIR = path.join(__dirname, '../../uploads/avatars')
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

async function ensureAvatarDir() {
  await fs.mkdir(AVATAR_DIR, { recursive: true })
}

function validateImageFile(file) {
  if (!file || !file.buffer) {
    throw new AppError(400, 'MISSING_IMAGE', 'Image file is required.')
  }
  if (file.size > MAX_BYTES) {
    throw new AppError(400, 'FILE_TOO_LARGE', 'Image must be 5MB or smaller.')
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new AppError(415, 'UNSUPPORTED_IMAGE', 'Only JPEG, PNG, and WebP images are supported.')
  }
}

async function processAndSaveAvatar(buffer, userId, prefix = '') {
  await ensureAvatarDir()
  const filename = `${prefix}${userId}-${Date.now()}.webp`
  const filepath = path.join(AVATAR_DIR, filename)

  await sharp(buffer)
    .rotate()
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toFile(filepath)

  return {
    filename,
    avatarUrl: `/uploads/avatars/${filename}`,
  }
}

async function saveUploadAvatar(file, userId) {
  validateImageFile(file)
  return processAndSaveAvatar(file.buffer, userId, 'upload-')
}

async function saveGeneratedAvatar(buffer, userId) {
  return processAndSaveAvatar(buffer, userId, 'bee-')
}

module.exports = {
  AVATAR_DIR,
  saveUploadAvatar,
  saveGeneratedAvatar,
  validateImageFile,
}
