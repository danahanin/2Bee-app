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
 * @typedef {Object} Forecast
 * @property {string} id
 * @property {string} period
 * @property {number} predictedAmount
 * @property {number} confidence
 * @property {string} category
 * @property {string} createdAt
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
 * @typedef {Object} ImbalanceResult
 * @property {string} id
 * @property {string} hiveName
 * @property {Array<MemberContribution>} contributions
 * @property {number} imbalanceScore
 * @property {string} suggestion
 * @property {string} createdAt
 */

/**
 * @typedef {Object} MemberContribution
 * @property {string} memberId
 * @property {string} memberName
 * @property {number} contributionPercentage
 * @property {number} expectedPercentage
 * @property {number} deviation
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
