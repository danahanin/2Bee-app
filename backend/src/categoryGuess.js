function guessCategory(description) {
  const lower = (description || '').toLowerCase()
  if (lower.includes('supermarket') || lower.includes('grocery') || lower.includes('שופרסל') || lower.includes('רמי לוי')) return 'groceries'
  if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('מסעדה') || lower.includes('קפה')) return 'dining'
  if (lower.includes('electric') || lower.includes('water') || lower.includes('gas') || lower.includes('חשמל') || lower.includes('מים')) return 'utilities'
  if (lower.includes('rent') || lower.includes('שכירות')) return 'rent'
  if (lower.includes('uber') || lower.includes('taxi') || lower.includes('bus') || lower.includes('train') || lower.includes('fuel')) return 'transport'
  if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('subscription')) return 'subscriptions'
  if (lower.includes('pharmacy') || lower.includes('doctor') || lower.includes('medical') || lower.includes('בית מרקחת')) return 'health'
  if (lower.includes('hotel') || lower.includes('flight') || lower.includes('airline') || lower.includes('מלון')) return 'travel'
  if (lower.includes('cinema') || lower.includes('movie') || lower.includes('gym') || lower.includes('sport')) return 'entertainment'
  if (lower.includes('shop') || lower.includes('store') || lower.includes('amazon') || lower.includes('חנות')) return 'shopping'
  return null
}

module.exports = { guessCategory }
