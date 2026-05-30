const mongoose = require('mongoose')

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

const userSchema = new mongoose.Schema(
  {
    // The auth layer currently uses string IDs (e.g. user_demo_1), so this
    // collection keeps the same key type for compatibility.
    _id: { type: String, required: true },
    email: { type: String, required: true, trim: true, index: true },
    emailLower: { type: String, required: true, trim: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
    pairId: { type: String, default: null, index: true },
    hiveId: { type: String, default: null },
    pairCode: { type: String, default: null, index: true },
    pairCodeExpiresAt: { type: Date, default: null, index: true },
    pairCodeUsedAt: { type: Date, default: null },
    avatarUrl: { type: String, default: null },
    bio: { type: String, default: '', maxlength: 200 },
    bankAccount: {
      connected: { type: Boolean, default: false },
      bankName: { type: String, default: '' },
      lastSyncedAt: { type: Date, default: null },
      accountId: { type: String, default: null },
    },
    privacySettings: {
      hidePersonalIncome: { type: Boolean, default: DEFAULT_PRIVACY_SETTINGS.hidePersonalIncome },
      hidePersonalExpenses: { type: Boolean, default: DEFAULT_PRIVACY_SETTINGS.hidePersonalExpenses },
      hidePersonalBalance: { type: Boolean, default: DEFAULT_PRIVACY_SETTINGS.hidePersonalBalance },
    },
    notificationSettings: {
      budgetAlerts: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.budgetAlerts },
      imbalanceAlerts: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.imbalanceAlerts },
      newExpenseAlerts: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.newExpenseAlerts },
      weeklyDigest: { type: Boolean, default: DEFAULT_NOTIFICATION_SETTINGS.weeklyDigest },
    },
    sharedCategories: {
      type: [String],
      enum: AVAILABLE_SHARED_CATEGORIES,
      default: DEFAULT_SHARED_CATEGORIES,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    collection: 'users',
  }
)

userSchema.pre('save', function beforeSave() {
  this.updatedAt = new Date()
})

const User = mongoose.models.User || mongoose.model('User', userSchema)

module.exports = User
module.exports.AVAILABLE_SHARED_CATEGORIES = AVAILABLE_SHARED_CATEGORIES
module.exports.DEFAULT_PRIVACY_SETTINGS = DEFAULT_PRIVACY_SETTINGS
module.exports.DEFAULT_NOTIFICATION_SETTINGS = DEFAULT_NOTIFICATION_SETTINGS
module.exports.DEFAULT_SHARED_CATEGORIES = DEFAULT_SHARED_CATEGORIES
