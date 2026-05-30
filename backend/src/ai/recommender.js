const crypto = require('crypto');

function generateId() {
  return crypto.randomUUID();
}

function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

const RECOMMENDATION_TEMPLATES = {
  overspend: {
    dining: {
      title: 'Reduce dining out expenses',
      description: (data, userData) =>
        `Try cooking at home a few more times per week to bring your dining spending back to your average of ${formatCurrency(data.data.averagePrior)}.`,
      cta: 'Set a meal plan',
    },
    groceries: {
      title: 'Optimize grocery spending',
      description: (data) =>
        `Consider making a shopping list and sticking to it. Your recent groceries spending is ${data.data.increasePercent}% above average.`,
      cta: 'Create shopping list',
    },
    entertainment: {
      title: 'Cut back on entertainment',
      description: (data) =>
        `Look for free or low-cost entertainment options this month to reduce your ${data.data.increasePercent}% increase.`,
      cta: 'Find free activities',
    },
    default: {
      title: (category) => `Review ${category} spending`,
      description: (data) =>
        `Your ${data.category} spending has increased by ${data.data.increasePercent}%. Consider reviewing recent purchases.`,
      cta: 'Review expenses',
    },
  },
  budget_warning: {
    title: (data) => `Adjust your ${data.category} budget`,
    description: (data) =>
      `You've used ${data.data.percentUsed}% of your budget. Consider increasing your limit or reducing spending.`,
    cta: 'Adjust budget',
  },
  recurring: {
    title: 'Review subscription',
    description: (data) =>
      `"${data.data.description}" charges you ${formatCurrency(data.data.amount)}/month. Consider if you're still using this service.`,
    cta: 'Review subscriptions',
  },
  forecast_exceeded: {
    title: (data) => `Reduce ${data.category} spending`,
    description: (data) => {
      const reduction = roundMoney(data.data.currentSpend - data.data.predicted);
      return `Cut back by ${formatCurrency(reduction)} to stay on track with your forecast.`;
    },
    cta: 'View spending breakdown',
  },
  spike: {
    title: 'Watch for unusual purchases',
    description: (data) =>
      `Your ${formatCurrency(data.data.amount)} purchase${data.data.description ? ` at ${data.data.description}` : ''} was significantly higher than your usual spending.`,
    cta: 'Review transaction',
  },
};

function calculatePotentialSavings(pattern) {
  switch (pattern.type) {
    case 'overspend': {
      const reduction = pattern.data.currentSpend - pattern.data.averagePrior;
      return roundMoney(Math.max(0, reduction * 0.5));
    }
    case 'recurring': {
      return roundMoney(pattern.data.amount);
    }
    case 'forecast_exceeded': {
      return roundMoney(pattern.data.currentSpend - pattern.data.predicted);
    }
    case 'budget_warning': {
      const overage = pattern.data.spent - pattern.data.limit;
      return roundMoney(Math.max(0, overage));
    }
    case 'spike': {
      return 0;
    }
    default:
      return 0;
  }
}

function assignPriority(pattern) {
  if (pattern.severity === 'high') {
    return 1;
  }
  if (pattern.severity === 'medium') {
    return 2;
  }
  return 3;
}

function getRecommendationContent(pattern, userData = {}) {
  const template = RECOMMENDATION_TEMPLATES[pattern.type];
  if (!template) {
    return {
      title: `Take action on ${pattern.category}`,
      description: `Review your ${pattern.category} spending and consider adjustments.`,
      cta: 'Review',
    };
  }

  if (pattern.type === 'overspend') {
    const categoryTemplate = template[pattern.category] || template.default;
    const title =
      typeof categoryTemplate.title === 'function'
        ? categoryTemplate.title(pattern.category)
        : categoryTemplate.title;
    const description = categoryTemplate.description(pattern, userData);
    return { title, description, cta: categoryTemplate.cta };
  }

  const title =
    typeof template.title === 'function'
      ? template.title(pattern)
      : template.title;
  const description = template.description(pattern, userData);
  return { title, description, cta: template.cta };
}

function generateRecommendations(patterns, userData = {}) {
  const now = new Date().toISOString();

  return patterns.map((pattern) => {
    const { title, description, cta } = getRecommendationContent(pattern, userData);
    const potentialSavings = calculatePotentialSavings(pattern);
    const priority = assignPriority(pattern);

    return {
      id: generateId(),
      type: pattern.type,
      title,
      description,
      potentialSavings,
      priority,
      category: pattern.category,
      cta,
      createdAt: now,
    };
  });
}

module.exports = {
  generateRecommendations,
  calculatePotentialSavings,
  assignPriority,
};
