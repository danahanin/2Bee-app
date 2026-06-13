const path = require('path')
const fs = require('fs/promises')
const DefaultAvatar = require('../models/DefaultAvatar')
const profileService = require('./profileService')
const { AppError } = require('../utils/appError')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'avatars')

const DEFAULT_AVATARS = [
  { _id: 'bee-golden', label: 'Golden Bee', url: '/default-avatars/bee-golden.svg', sortOrder: 1 },
  { _id: 'bee-amber', label: 'Amber Bee', url: '/default-avatars/bee-amber.svg', sortOrder: 2 },
  { _id: 'bee-honey', label: 'Honey Bee', url: '/default-avatars/bee-honey.svg', sortOrder: 3 },
  { _id: 'bee-royal', label: 'Royal Bee', url: '/default-avatars/bee-royal.svg', sortOrder: 4 },
  { _id: 'bee-meadow', label: 'Meadow Bee', url: '/default-avatars/bee-meadow.svg', sortOrder: 5 },
  { _id: 'bee-sunset', label: 'Sunset Bee', url: '/default-avatars/bee-sunset.svg', sortOrder: 6 },
]

async function ensureDefaultAvatarsSeeded() {
  const count = await DefaultAvatar.countDocuments()
  if (count > 0) return

  await DefaultAvatar.insertMany(DEFAULT_AVATARS)
}

async function listDefaultAvatars() {
  await ensureDefaultAvatarsSeeded()
  return DefaultAvatar.find().sort({ sortOrder: 1 }).lean()
}

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
}

async function saveUploadedAvatar(userId, file, fallbackUser) {
  if (!file) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Avatar file is required.')
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.mimetype)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Avatar must be a JPEG, PNG, WebP, or GIF image.')
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Avatar must be 2 MB or smaller.')
  }

  await ensureUploadDir()

  const ext = path.extname(file.originalname) || '.jpg'
  const filename = `${userId}-${Date.now()}${ext}`
  const filepath = path.join(UPLOAD_DIR, filename)
  await fs.writeFile(filepath, file.buffer)

  const avatarUrl = `/uploads/avatars/${filename}`
  const user = await profileService.updateProfile(userId, { avatarUrl }, fallbackUser)

  return {
    id: user.id,
    avatarUrl: user.avatarUrl,
  }
}

function userPublicFields(user) {
  if (!user) return null
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl || null,
  }
}

async function getHiveMembers(hiveId, currentUserId) {
  const Hive = require('../models/Hive')
  const User = require('../models/User')
  const hive = await Hive.findById(hiveId).lean()
  if (!hive) return []

  const users = await User.find({ _id: { $in: hive.userIds } }).lean()
  return hive.userIds.map((userId) => {
    const user = users.find((entry) => entry._id === userId)
    return {
      ...userPublicFields(user),
      isCurrentUser: userId === currentUserId,
    }
  })
}

module.exports = {
  listDefaultAvatars,
  saveUploadedAvatar,
  getHiveMembers,
  ensureDefaultAvatarsSeeded,
}
