/**
 * Rule-based category fallback used when the LLM is unavailable or returns
 * unparseable output. Deliberately simple keyword matching — good enough to keep the
 * app usable off-VPN, not meant to compete with the LLM's accuracy.
 */

const { CATEGORIES } = require('../../../models/Expense')

const CATEGORY_KEYWORDS = {
  groceries: ['supermarket', 'grocery', 'groceries', 'shufersal', 'rami levy', 'market'],
  dining: ['restaurant', 'cafe', 'coffee', 'diner', 'bar', 'pizza', 'lunch', 'dinner', 'starbucks', 'burger'],
  transport: ['taxi', 'uber', 'bus fare', 'train', 'fuel', 'gas station', 'parking', 'toll', 'car service'],
  utilities: ['electric', 'electricity', 'water bill', 'gas bill', 'internet', 'phone bill', 'utility'],
  rent: ['rent', 'mortgage', 'landlord'],
  entertainment: ['cinema', 'movie', 'concert', 'gym', 'theater', 'theatre', 'bowling'],
  health: ['pharmacy', 'doctor', 'clinic', 'hospital', 'dentist', 'medical', 'medicine'],
  shopping: ['clothing', 'apparel', 'mall', 'amazon', 'shoes', 'boutique', 'haircut', 'salon', 'barber', 'cosmetics'],
  subscriptions: ['netflix', 'spotify', 'subscription', 'membership', 'disney+'],
  travel: ['hotel', 'flight', 'airline', 'airbnb', 'vacation'],
  education: ['tuition', 'course', 'school', 'university', 'college', 'textbook'],
}

function containsKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
}

/**
 * @param {string} text Free text describing the expense (vendor, description, line items…).
 * @returns {{ value: string, confidence: number, reasoning: string }}
 */
function classifyCategoryRuleBased(text) {
  const normalized = text || ''

  for (const category of CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category] || []
    const matched = keywords.find((keyword) => containsKeyword(normalized, keyword))
    if (matched) {
      return {
        value: category,
        confidence: 0.65,
        reasoning: `Matched keyword "${matched}" for category "${category}"`,
      }
    }
  }

  return { value: 'other', confidence: 0.3, reasoning: 'No keyword matched a known category' }
}

module.exports = { CATEGORY_KEYWORDS, classifyCategoryRuleBased }
