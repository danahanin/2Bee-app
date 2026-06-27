const { z } = require('zod')
const profileService = require('../../services/profileService')
const avatarService = require('../services/avatarService')
const { generateBeeAvatar } = require('../ai/beeAvatarGenerator')

const avatarUrlSchema = z.union([
  z.url(),
  z.string().regex(/^\/uploads\/avatars\/[a-zA-Z0-9._-]+$/),
  z.string().regex(/^\/avatars\/builtin\/[a-zA-Z0-9._-]+\.svg$/),
  z.null(),
])

const setAvatarSchema = z
  .object({
    avatarUrl: avatarUrlSchema,
    avatarType: z.enum(['gallery', 'upload', 'bee_self']).optional(),
  })
  .strict()

function userFallback(req) {
  return {
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    pairId: req.user.pairId,
    hiveId: req.user.hiveId,
  }
}

function validationErrorFromZod(err) {
  return err.issues?.map((issue) => issue.message).join('; ') || 'Invalid request payload.'
}

async function uploadAvatar(req, res, next) {
  try {
    const { avatarUrl } = await avatarService.saveUploadAvatar(req.file, req.user.userId)
    const user = await profileService.setAvatar(req.user.userId, {
      avatarUrl,
      avatarType: 'upload',
    }, userFallback(req))
    return res.status(201).json({ success: true, avatarUrl, avatarType: 'upload', user })
  } catch (error) {
    return next(error)
  }
}

async function generateBeeSelf(req, res, next) {
  try {
    avatarService.validateImageFile(req.file)
    const generatedBuffer = await generateBeeAvatar(req.file.buffer)
    const { avatarUrl } = await avatarService.saveGeneratedAvatar(generatedBuffer, req.user.userId)
    return res.status(201).json({
      success: true,
      avatarUrl,
      avatarType: 'bee_self',
      previewUrl: avatarUrl,
    })
  } catch (error) {
    return next(error)
  }
}

async function setAvatar(req, res, next) {
  const parsed = setAvatarSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: validationErrorFromZod(parsed.error) } })
  }

  try {
    const user = await profileService.setAvatar(req.user.userId, parsed.data, userFallback(req))
    return res.json({ success: true, user })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  uploadAvatar,
  generateBeeSelf,
  setAvatar,
  avatarUrlSchema,
}
