/**
 * @typedef {Object} Insight
 * @property {string} id
 * @property {string} type
 * @property {string} title
 * @property {string} description
 * @property {number} confidence
 * @property {string} createdAt
 */

/**
 * One row from `GET /ai/forecast` (`data` array). Built from a 1–3 month moving
 * average per category; `category` is `"total"` for the sum of per-category predictions.
 * @typedef {Object} Forecast
 * @property {string} id
 * @property {'weekly'|'monthly'|'quarterly'} period
 * @property {number} predictedAmount Monthly predicted spend for this row (maps from internal `predicted`).
 * @property {number} confidence 0.35–0.95 from sample size and stability of month buckets.
 * @property {string} category Expense category label, or `"total"` for the aggregate row.
 * @property {string} createdAt ISO 8601 timestamp for the response snapshot.
 */

/**
 * @typedef {Object} Recommendation
 * @property {string} id
 * @property {string} type
 * @property {string} title
 * @property {string} description
 * @property {number} potentialSavings
 * @property {number} priority
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ClassificationResult
 * @property {string} label
 * @property {number} confidence
 * @property {string} category
 */

/**
 * Per-user shared spend in one rolling window (UTC days), as returned under `contributions`.
 * @typedef {Object} ImbalanceUserWindow
 * @property {number} total Rounded currency total for that user in the window.
 * @property {number} share Fraction of joint window total (0–1), three decimal places.
 */

/**
 * One partner’s split across the two rolling windows compared by the detector.
 * @typedef {Object} ImbalanceContribution
 * @property {string} userId
 * @property {ImbalanceUserWindow} current Most recent ~30 UTC days.
 * @property {ImbalanceUserWindow} previous Prior ~30 UTC days.
 */

/**
 * Hive-level totals for one rolling window (all shared spend in that window).
 * @typedef {Object} ImbalanceWindowRollup
 * @property {number} total Rounded joint spend in the window.
 * @property {number} userCount Distinct users with spend in the underlying map (may differ from partners in hive).
 */

/**
 * `GET /ai/imbalance` payload (`data` object): rolling-window contribution split and detector output.
 * @typedef {Object} ImbalanceResult
 * @property {string} id
 * @property {string} createdAt ISO 8601 timestamp for the response snapshot.
 * @property {boolean} isImbalanced True when relative severity exceeds the configured threshold.
 * @property {number} delta Max absolute gap between each partner’s share and fair share (0–1).
 * @property {number} severity Relative imbalance vs fair split for the current window (detector metric).
 * @property {'increasing'|'stable'|'decreasing'} trend Change in severity from previous window to current.
 * @property {string} message Human-readable summary for UI.
 * @property {ImbalanceContribution[]} contributions Per-user current vs previous window breakdown.
 * @property {{ current: ImbalanceWindowRollup, previous: ImbalanceWindowRollup }} windows Joint totals per window.
 */

/**
 * @typedef {Object} GoalSuggestion
 * @property {string} id
 * @property {string} type
 * @property {string} title
 * @property {string} description
 * @property {number} targetAmount
 * @property {number} suggestedMonthlyContribution
 * @property {number} confidence
 * @property {string} createdAt
 */

module.exports = {};
