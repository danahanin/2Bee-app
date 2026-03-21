/**
 * Profile & Settings controller — Dana Hanin
 *
 * PR 1: All handlers are stubs returning hardcoded mock data.
 * PR 3: Stubs will be replaced with real profileService calls and DB logic.
 *
 * Every handler receives req.user from authMiddleware (Bar's middleware),
 * which provides { userId, email, firstName, lastName, hiveId, pairId }.
 */

const {
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SHARED_CATEGORIES,
} = require('../models/User')

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * GET /profile
 * Returns the current user's profile.
 * TODO (PR 3): Replace with profileService.getProfile(req.user.userId)
 */
function getProfile(req, res) {
  res.json({
    id: req.user.userId,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    email: req.user.email,
    avatarUrl: null,
    bio: '',
    pairedWith: 'Jane',
    hiveId: req.user.hiveId,
  })
}

/**
 * PUT /profile
 * Updates the current user's profile fields.
 * TODO (PR 3): Replace with profileService.updateProfile(req.user.userId, req.body)
 */
function updateProfile(req, res) {
  const { firstName, lastName, avatarUrl, bio } = req.body || {}
  res.json({
    success: true,
    user: {
      id: req.user.userId,
      firstName: firstName ?? req.user.firstName,
      lastName: lastName ?? req.user.lastName,
      email: req.user.email,
      avatarUrl: avatarUrl ?? null,
      bio: bio ?? '',
    },
  })
}

// ---------------------------------------------------------------------------
// Privacy settings
// ---------------------------------------------------------------------------

/**
 * GET /settings/privacy
 * Returns the current user's privacy settings.
 * TODO (PR 3): Replace with profileService.getPrivacySettings(req.user.userId)
 */
function getPrivacySettings(_req, res) {
  res.json({ ...DEFAULT_PRIVACY_SETTINGS })
}

/**
 * PUT /settings/privacy
 * Updates one or more privacy setting flags.
 * TODO (PR 3): Replace with profileService.updatePrivacySettings(req.user.userId, req.body)
 */
function updatePrivacySettings(req, res) {
  const incoming = req.body || {}
  res.json({
    success: true,
    privacySettings: { ...DEFAULT_PRIVACY_SETTINGS, ...incoming },
  })
}

// ---------------------------------------------------------------------------
// Notification settings
// ---------------------------------------------------------------------------

/**
 * GET /settings/notifications
 * Returns the current user's notification preferences.
 * TODO (PR 3): Replace with profileService.getNotificationSettings(req.user.userId)
 */
function getNotificationSettings(_req, res) {
  res.json({ ...DEFAULT_NOTIFICATION_SETTINGS })
}

/**
 * PUT /settings/notifications
 * Updates one or more notification preference flags.
 * TODO (PR 3): Replace with profileService.updateNotificationSettings(req.user.userId, req.body)
 */
function updateNotificationSettings(req, res) {
  const incoming = req.body || {}
  res.json({
    success: true,
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS, ...incoming },
  })
}

// ---------------------------------------------------------------------------
// Shared categories
// ---------------------------------------------------------------------------

/**
 * PUT /settings/shared-categories
 * Replaces the user's shared expense category list.
 * TODO (PR 3): Replace with profileService.updateSharedCategories(req.user.userId, req.body.categories)
 */
function updateSharedCategories(req, res) {
  const { categories } = req.body || {}
  res.json({
    success: true,
    sharedCategories: Array.isArray(categories) ? categories : DEFAULT_SHARED_CATEGORIES,
  })
}

// ---------------------------------------------------------------------------
// Pairing management
// ---------------------------------------------------------------------------

/**
 * DELETE /pair
 * Disconnects the current user from their partner and archives the Hive.
 * TODO (PR 3): Replace with profileService.disconnectPair(req.user.userId)
 */
function disconnectPair(_req, res) {
  res.json({
    success: true,
    message: 'Pair disconnected',
  })
}

/**
 * POST /pair/reconnect
 * Re-pairs the current user with the same or a new partner.
 * TODO (PR 3): Replace with profileService.reconnectPair(req.user.userId, req.body)
 */
function reconnectPair(_req, res) {
  res.json({
    success: true,
    message: 'Reconnected',
    hiveId: 'hive_demo_1',
  })
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
