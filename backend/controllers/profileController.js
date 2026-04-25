const { z } = require('zod')
const profileService = require('../services/profileService')
const { AVAILABLE_SHARED_CATEGORIES } = require('../models/User')
const { AppError } = require('../utils/appError')

const profileUpdateSchema = z
  .object({
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    avatarUrl: z.union([z.url(), z.null()]).optional(),
    bio: z.string().max(200).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one profile field is required.',
  })

const privacySettingsSchema = z
  .object({
    hidePersonalIncome: z.boolean().optional(),
    hidePersonalExpenses: z.boolean().optional(),
    hidePersonalBalance: z.boolean().optional(),
  })
  .strict()

const notificationSettingsSchema = z
  .object({
    budgetAlerts: z.boolean().optional(),
    imbalanceAlerts: z.boolean().optional(),
    newExpenseAlerts: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
  })
  .strict()

const sharedCategoriesSchema = z
  .object({
    categories: z.array(z.enum(AVAILABLE_SHARED_CATEGORIES)).min(0).max(20),
  })
  .strict()

const reconnectSchema = z
  .object({
    partnerCode: z.string().regex(/^[A-Za-z0-9]{6}$/).optional(),
    partnerId: z
      .string()
      .regex(/^(?:[a-fA-F0-9]{24}|user_[A-Za-z0-9\-_]+)$/)
      .optional(),
  })
  .strict()
  .refine((data) => Boolean(data.partnerId) !== Boolean(data.partnerCode), {
    message: 'Provide either partnerId or partnerCode.',
  })

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

async function getProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.userId, userFallback(req))
    return res.json(profile)
  } catch (error) {
    return next(error)
  }
}

async function updateProfile(req, res, next) {
  const parsed = profileUpdateSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: validationErrorFromZod(parsed.error) } })
  }

  try {
    const user = await profileService.updateProfile(req.user.userId, parsed.data, userFallback(req))
    return res.json({ success: true, user })
  } catch (error) {
    return next(error)
  }
}

async function getPrivacySettings(req, res, next) {
  try {
    const privacySettings = await profileService.getPrivacySettings(req.user.userId, userFallback(req))
    return res.json(privacySettings)
  } catch (error) {
    return next(error)
  }
}

async function updatePrivacySettings(req, res, next) {
  const parsed = privacySettingsSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: validationErrorFromZod(parsed.error) } })
  }

  try {
    const privacySettings = await profileService.updatePrivacySettings(
      req.user.userId,
      parsed.data,
      userFallback(req)
    )
    return res.json({ success: true, privacySettings })
  } catch (error) {
    return next(error)
  }
}

async function getNotificationSettings(req, res, next) {
  try {
    const notificationSettings = await profileService.getNotificationSettings(
      req.user.userId,
      userFallback(req)
    )
    return res.json(notificationSettings)
  } catch (error) {
    return next(error)
  }
}

async function updateNotificationSettings(req, res, next) {
  const parsed = notificationSettingsSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: validationErrorFromZod(parsed.error) } })
  }

  try {
    const notificationSettings = await profileService.updateNotificationSettings(
      req.user.userId,
      parsed.data,
      userFallback(req)
    )
    return res.json({ success: true, notificationSettings })
  } catch (error) {
    return next(error)
  }
}

async function updateSharedCategories(req, res, next) {
  const parsed = sharedCategoriesSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: validationErrorFromZod(parsed.error) } })
  }

  try {
    const sharedCategories = await profileService.updateSharedCategories(
      req.user.userId,
      parsed.data.categories,
      userFallback(req)
    )
    return res.json({ success: true, sharedCategories })
  } catch (error) {
    return next(error)
  }
}

async function disconnectPair(req, res, next) {
  try {
    const result = await profileService.disconnectPair(req.user.userId, userFallback(req))
    return res.json(result)
  } catch (error) {
    return next(error)
  }
}

async function reconnectPair(req, res, next) {
  const parsed = reconnectSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: validationErrorFromZod(parsed.error) } })
  }

  try {
    const result = await profileService.reconnectPair(req.user.userId, parsed.data, userFallback(req))
    return res.json(result)
  } catch (error) {
    if (error instanceof AppError) {
      return next(error)
    }
    return next(error)
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getPrivacySettings,
  updatePrivacySettings,
  getNotificationSettings,
  updateNotificationSettings,
  updateSharedCategories,
  disconnectPair,
  reconnectPair,
}
