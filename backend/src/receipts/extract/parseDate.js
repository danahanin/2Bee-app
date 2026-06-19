const { splitLines, formatIsoDate } = require('./textUtils')

const DATE_PATTERNS = [
  {
    regex: /\b(\d{4})[/.\-](\d{1,2})[/.\-](\d{1,2})\b/,
    map: (m) => formatIsoDate(m[1], m[2], m[3]),
    confidence: 0.92,
  },
  {
    regex: /\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/,
    map: (m) => formatIsoDate(m[3], m[2], m[1]),
    confidence: 0.9,
  },
]

const DATE_LABEL =
  /(?:date|תאריך)\s*[:\s]*(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/i

/**
 * @param {string} rawText
 * @returns {{ value: string|null, confidence: number }}
 */
function parseDate(rawText) {
  const labelMatch = rawText.match(DATE_LABEL)
  if (labelMatch) {
    const iso = formatIsoDate(labelMatch[3], labelMatch[2], labelMatch[1])
    if (iso) return { value: iso, confidence: 0.95 }
  }

  for (const line of splitLines(rawText)) {
    for (const pattern of DATE_PATTERNS) {
      const match = line.match(pattern.regex)
      if (!match) continue
      const iso = pattern.map(match)
      if (iso) return { value: iso, confidence: pattern.confidence }
    }
  }

  const today = new Date().toISOString().split('T')[0]
  return { value: today, confidence: 0.25 }
}

module.exports = { parseDate }
