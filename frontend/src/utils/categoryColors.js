const CATEGORY_COLORS = {
  groceries: '#22c55e',
  dining: '#f97316',
  transport: '#3b82f6',
  utilities: '#eab308',
  rent: '#8b5cf6',
  entertainment: '#ec4899',
  health: '#14b8a6',
  shopping: '#6366f1',
  subscriptions: '#64748b',
  travel: '#06b6d4',
  education: '#a855f7',
  other: '#94a3b8',
}

export function colorForCategory(category, index = 0) {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category]
  }
  const fallback = ['#6366f1', '#f97316', '#22c55e', '#ec4899', '#14b8a6']
  return fallback[index % fallback.length]
}
