/**
 * User schema definition — Dana Hanin (Profile & Settings domain)
 *
 * This file documents the fields Dana owns within the shared User document
 * and exports the default values and constants used across the Profile &
 * Settings domain. Mongoose model wiring happens in Sprint 3 (PR 3) once
 * the MongoDB connection is established.
 *
 * Fields owned by Bar Cohen (Auth domain):
 *   _id, email, passwordHash, firstName, lastName, createdAt, pairId, hiveId
 *
 * Fields owned by Dana Hanin (Profile & Settings domain):
 *   avatarUrl, bio, privacySettings, notificationSettings, sharedCategories
 */

const AVAILABLE_SHARED_CATEGORIES = [
  'groceries',
  'rent',
  'utilities',
  'dining',
  'transport',
  'entertainment',
  'travel',
  'health',
  'subscriptions',
  'shopping',
]

const DEFAULT_PRIVACY_SETTINGS = {
  hidePersonalIncome: false,
  hidePersonalExpenses: false,
  hidePersonalBalance: false,
}

const DEFAULT_NOTIFICATION_SETTINGS = {
  budgetAlerts: true,
  imbalanceAlerts: true,
  newExpenseAlerts: true,
  weeklyDigest: false,
}

const DEFAULT_SHARED_CATEGORIES = ['groceries', 'rent', 'utilities', 'dining']

/**
 * Full User document shape (for documentation and shared/types.ts alignment).
 *
 * {
 *   _id:                   string          — set by Bar (Auth)
 *   email:                 string          — set by Bar (Auth)
 *   passwordHash:          string          — set by Bar (Auth)
 *   firstName:             string          — set by Bar (Auth)
 *   lastName:              string          — set by Bar (Auth)
 *   pairId:                string | null   — set by Bar (Auth / Pairing)
 *   hiveId:                string | null   — set by Bar (Auth / Pairing)
 *   createdAt:             Date            — set by Bar (Auth)
 *   avatarUrl:             string | null   — owned by Dana
 *   bio:                   string          — owned by Dana
 *   privacySettings:       PrivacySettings — owned by Dana
 *   notificationSettings:  NotificationSettings — owned by Dana
 *   sharedCategories:      string[]        — owned by Dana
 * }
 */

module.exports = {
  AVAILABLE_SHARED_CATEGORIES,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SHARED_CATEGORIES,
}
