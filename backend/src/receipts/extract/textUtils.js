function splitLines(rawText) {
  return (rawText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseDecimal(value) {
  if (value == null || value === '') return null
  const cleaned = String(value).replace(/[,\s₪$]/g, '')
  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function formatIsoDate(year, month, day) {
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const fullYear = y < 100 ? 2000 + y : y
  const iso = `${String(fullYear).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return Number.isNaN(Date.parse(iso)) ? null : iso
}

module.exports = { splitLines, parseDecimal, formatIsoDate }
