/**
 * Profile & Settings routes — Dana Hanin
 *
 * All routes are protected by authMiddleware (Bar Cohen's middleware, currently
 * a placeholder in middleware/auth.js — will be the real JWT verifier in Sprint 3).
 *
 * Route summary:
 *   GET    /profile                      — get current user's profile
 *   PUT    /profile                      — update profile fields
 *   GET    /settings/privacy             — get privacy settings
 *   PUT    /settings/privacy             — update privacy settings
 *   GET    /settings/notifications       — get notification preferences
 *   PUT    /settings/notifications       — update notification preferences
 *   PUT    /settings/shared-categories   — replace shared category list
 *   DELETE /pair                         — disconnect from partner
 *   POST   /pair/reconnect               — re-pair with partner
 */

const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const {
  getProfile,
  updateProfile,
  getPrivacySettings,
  updatePrivacySettings,
  getNotificationSettings,
  updateNotificationSettings,
  updateSharedCategories,
  disconnectPair,
  reconnectPair,
} = require('../controllers/profileController')

const router = Router()

// Apply auth middleware to every route in this file
router.use(authMiddleware)

// Profile
router.get('/profile', getProfile)
router.put('/profile', updateProfile)

// Privacy settings
router.get('/settings/privacy', getPrivacySettings)
router.put('/settings/privacy', updatePrivacySettings)

// Notification settings
router.get('/settings/notifications', getNotificationSettings)
router.put('/settings/notifications', updateNotificationSettings)

// Shared categories
router.put('/settings/shared-categories', updateSharedCategories)

// Pairing management
router.delete('/pair', disconnectPair)
router.post('/pair/reconnect', reconnectPair)

module.exports = router
