const crypto = require('crypto');

function generateId() {
  return crypto.randomUUID();
}

const INSIGHT_TEMPLATES = {
  overspend: {
    title: (data, category) => `Spending up in ${category}`,
    description: (data) =>
      `Your ${data.category} spending increased by ${data.data.increasePercent}% compared to your average.`,
  },
  spike: {
    title: (data, category) => `Unusual purchase in ${category}`,
    description: (data) =>
      `You made a $${data.data.amount} purchase${data.data.description ? ` (${data.data.description})` : ''}, which is significantly higher than your usual spending in this category.`,
  },
  recurring: {
    title: (data, category) => `Recurring charge detected`,
    description: (data) =>
      `"${data.data.description}" appears to be a monthly subscription at $${data.data.amount}.`,
  },
  budget_warning: {
    title: (data, category) => `Budget alert for ${category}`,
    description: (data) =>
      `You've used ${data.data.percentUsed}% of your ${data.category} budget ($${data.data.spent} of $${data.data.limit}).`,
  },
  forecast_exceeded: {
    title: (data, category) => `${category} spending above forecast`,
    description: (data) =>
      `You've spent $${data.data.currentSpend} in ${data.category}, ${data.data.exceedancePercent}% above the predicted $${data.data.predicted}.`,
  },
};

function formatInsightMessage(pattern) {
  const template = INSIGHT_TEMPLATES[pattern.type];
  if (!template) {
    return {
      title: `${pattern.type} in ${pattern.category}`,
      description: `A ${pattern.type} pattern was detected in ${pattern.category}.`,
    };
  }

  return {
    title: template.title(pattern, pattern.category),
    description: template.description(pattern),
  };
}

function severityToConfidence(severity) {
  switch (severity) {
    case 'high':
      return 0.9;
    case 'medium':
      return 0.75;
    case 'low':
      return 0.6;
    default:
      return 0.5;
  }
}

function generateInsights(patterns, options = {}) {
  const now = options.timestamp || new Date().toISOString();

  return patterns.map((pattern) => {
    const { title, description } = formatInsightMessage(pattern);

    return {
      id: generateId(),
      type: pattern.type,
      title,
      description,
      confidence: severityToConfidence(pattern.severity),
      category: pattern.category,
      createdAt: now,
    };
  });
}

function prioritizeInsights(insights, limit = 5) {
  const sorted = [...insights].sort((a, b) => {
    const confDiff = b.confidence - a.confidence;
    if (confDiff !== 0) {
      return confDiff;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return sorted.slice(0, limit);
}

module.exports = {
  generateInsights,
  prioritizeInsights,
  formatInsightMessage,
};
