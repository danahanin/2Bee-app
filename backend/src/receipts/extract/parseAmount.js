const { splitLines, parseDecimal } = require('./textUtils')

const TOTAL_LINE =
  /(?:total|סה["״']?כ|לתשלום|grand\s*total|amount\s*due|sum|יתרה|סכום\s*לתשלום)\s*[:\s]*[₪$]?\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/i

const CURRENCY_PATTERNS = [
  { regex: /₪|ils|nis|ש"ח|ש״ח/i, currency: 'ILS' },
  { regex: /\$|usd/i, currency: 'USD' },
  { regex: /€|eur/i, currency: 'EUR' },
]

const TRAILING_PRICE = /(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\s*(?:₪|ils|nis|\$|usd|€|eur)?\s*$/i

function detectCurrency(rawText) {
  for (const { regex, currency } of CURRENCY_PATTERNS) {
    if (regex.test(rawText)) return currency
  }
  return 'ILS'
}

function amountsFromLine(line) {
  const matches = [...line.matchAll(/(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/g)]
  return matches
    .map((match) => parseDecimal(match[1]))
    .filter((value) => value != null && value > 0)
}

/**
 * @param {string} rawText
 * @returns {{ value: number|null, currency: string|null, confidence: number }}
 */
function parseAmount(rawText) {
  const currency = detectCurrency(rawText)
  const lines = splitLines(rawText)

  for (const line of lines) {
    const match = line.match(TOTAL_LINE)
    if (match) {
      const value = parseDecimal(match[1])
      if (value != null && value > 0) {
        return { value, currency, confidence: 0.94 }
      }
    }
  }

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    if (!TRAILING_PRICE.test(line)) continue
    if (/item|qty|quantity|כמות|פריט/i.test(line)) continue

    const trailing = line.match(TRAILING_PRICE)
    if (!trailing) continue

    const value = parseDecimal(trailing[1])
    if (value != null && value > 0) {
      const nearBottom = index >= lines.length - 4
      return { value, currency, confidence: nearBottom ? 0.78 : 0.6 }
    }
  }

  const allAmounts = lines.flatMap(amountsFromLine)
  if (allAmounts.length > 0) {
    const value = Math.max(...allAmounts)
    return { value, currency, confidence: 0.45 }
  }

  return { value: null, currency: null, confidence: 0 }
}

module.exports = { parseAmount, detectCurrency }
