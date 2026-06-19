const PRESETS = [
  { id: 'this-month', label: 'This month', months: 1 },
  { id: '3-months', label: 'Last 3 months', months: 3 },
  { id: '6-months', label: 'Last 6 months', months: 6 },
]

function utcMonthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0))
}

function utcMonthEnd(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999))
}

export function buildPresetRange(presetId) {
  const preset = PRESETS.find((item) => item.id === presetId) ?? PRESETS[0]
  const end = utcMonthEnd()
  const startAnchor = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (preset.months - 1), 1, 0, 0, 0, 0),
  )
  return {
    presetId: preset.id,
    from: utcMonthStart(startAnchor).toISOString(),
    to: end.toISOString(),
    months: preset.months,
  }
}

export { PRESETS }
