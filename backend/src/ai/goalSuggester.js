const { generateId, roundMoney, formatCurrency } = require('./format');

function calculateSuggestedContribution(targetAmount, months) {
  if (months <= 0) {
    return targetAmount;
  }
  return roundMoney(targetAmount / months);
}

function getRemainingMonthsInYear() {
  const now = new Date();
  return 12 - now.getMonth();
}

function suggestGoals(categorySpendByMonth, forecast, options = {}) {
  const goals = [];
  const minSuggestion = options.minSuggestion ?? 10;
  const remainingMonths = options.remainingMonths ?? getRemainingMonthsInYear();
  const now = options.timestamp || new Date().toISOString();

  for (const f of forecast) {
    if (f.category === 'total' || f.predicted === 0) {
      continue;
    }

    const monthlySpends = categorySpendByMonth[f.category];
    if (!Array.isArray(monthlySpends) || monthlySpends.length === 0) {
      continue;
    }

    const currentSpend = monthlySpends[monthlySpends.length - 1];

    if (currentSpend > f.predicted) {
      const excess = currentSpend - f.predicted;
      const targetAmount = roundMoney(excess * 0.5);

      if (targetAmount < minSuggestion) {
        continue;
      }

      const suggestedMonthlyContribution = calculateSuggestedContribution(
        targetAmount,
        remainingMonths
      );

      goals.push({
        id: generateId(),
        type: 'savings_goal',
        title: `Save on ${f.category}`,
        description: `Reduce ${f.category} spending to save ${formatCurrency(targetAmount)} over the next ${remainingMonths} months.`,
        targetAmount,
        suggestedMonthlyContribution,
        confidence: f.confidence,
        category: f.category,
        reasoning: `Your ${f.category} spending (${formatCurrency(currentSpend)}) exceeds the forecast (${formatCurrency(f.predicted)}) by ${formatCurrency(roundMoney(excess))}.`,
        createdAt: now,
      });
    }
  }

  return goals.sort((a, b) => b.targetAmount - a.targetAmount);
}

module.exports = {
  suggestGoals,
  calculateSuggestedContribution,
};
