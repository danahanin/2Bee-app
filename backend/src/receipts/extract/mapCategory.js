const { CATEGORIES } = require('../../../models/Expense')
const { guessCategory } = require('../../categoryGuess')

/**
 * @param {string} rawText
 * @param {string|null} vendor
 * @param {Array<{ description: string, amount: number }>} lineItems
 * @returns {{ value: string, confidence: number }}
 */
function mapCategory(rawText, vendor, lineItems) {
  const parts = [vendor, ...lineItems.map((item) => item.description), rawText.slice(0, 400)]
  const haystack = parts.filter(Boolean).join(' ')

  const guessed = guessCategory(haystack)
  if (guessed && CATEGORIES.includes(guessed)) {
    return { value: guessed, confidence: 0.78 }
  }

  return { value: 'other', confidence: 0.35 }
}

module.exports = { mapCategory }
