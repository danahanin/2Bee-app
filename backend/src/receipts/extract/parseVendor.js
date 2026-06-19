const { splitLines } = require('./textUtils')

const SKIP_PATTERNS = [
  /^\d[\d\s./:-]+$/,
  /total|subtotal|סה["״']?כ|לתשלום|grand\s*total|amount\s*due|מע["״']?מ|vat/i,
  /^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}$/,
  /^\d{4}[/.\-]\d{1,2}[/.\-]\d{1,2}$/,
  /^(tel|phone|fax|טלפון|פקס)/i,
  /ח\.?\s*פ\.?|ע\.?\s*מ\.?|מס(?:'|\s)עוסק/i,
  /^receipt$|^invoice$|^קבלה$|^חשבונית$/i,
  /^www\.|^http/i,
]

/**
 * @param {string} rawText
 * @returns {{ value: string|null, confidence: number }}
 */
function parseVendor(rawText) {
  const lines = splitLines(rawText)

  for (let index = 0; index < Math.min(lines.length, 10); index += 1) {
    const line = lines[index]
    if (line.length < 3) continue
    if (SKIP_PATTERNS.some((pattern) => pattern.test(line))) continue
    if (!/[a-zA-Z\u0590-\u05FF]/.test(line)) continue
    if (/^\d+$/.test(line)) continue

    const confidence = index === 0 ? 0.88 : index <= 2 ? 0.72 : 0.55
    return { value: line, confidence }
  }

  return { value: null, confidence: 0 }
}

module.exports = { parseVendor }
