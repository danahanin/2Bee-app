const CATEGORY_COLORS = {
  groceries: '#84cc16',
  dining: '#f59e0b',
  transport: '#d97706',
  utilities: '#eab308',
  rent: '#b45309',
  entertainment: '#f97316',
  health: '#059669',
  shopping: '#c97a08',
  subscriptions: '#78716c',
  travel: '#0d9488',
  education: '#a16207',
  other: '#a8a29e',
}

export function colorForCategory(category, index = 0) {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category]
  }
  const fallback = ['#f5a623', '#e8940f', '#c97a08', '#84cc16', '#059669']
  return fallback[index % fallback.length]
}
