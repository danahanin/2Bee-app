const DEFAULT_SHARED_CATEGORIES = [
  'rent',
  'mortgage',
  'utilities',
  'groceries',
  'household',
];

const DEFAULT_PERSONAL_CATEGORIES = [
  'salary',
  'personal_care',
  'clothing',
];

const DEFAULT_KEYWORD_MAP = {
  shared: ['supermarket', 'electric bill', 'water', 'internet'],
  personal: ['coffee', 'lunch', 'spotify', 'gym'],
};

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function isSharedCategory(category, configuredSharedCategories = DEFAULT_SHARED_CATEGORIES) {
  const normalizedCategory = normalizeText(category);
  const normalizedSharedCategories = configuredSharedCategories.map((item) => normalizeText(item));

  return normalizedSharedCategories.includes(normalizedCategory);
}

function scoreKeywordMatches(description, keywordMap = DEFAULT_KEYWORD_MAP) {
  const normalizedDescription = normalizeText(description);
  const sharedKeywords = keywordMap.shared || [];
  const personalKeywords = keywordMap.personal || [];

  const sharedScore = sharedKeywords.reduce((score, keyword) => {
    return score + (normalizedDescription.includes(normalizeText(keyword)) ? 1 : 0);
  }, 0);

  const personalScore = personalKeywords.reduce((score, keyword) => {
    return score + (normalizedDescription.includes(normalizeText(keyword)) ? 1 : 0);
  }, 0);

  return { sharedScore, personalScore };
}

function classifyExpenseRuleBased({
  description,
  amount,
  category,
  sharedCategories = DEFAULT_SHARED_CATEGORIES,
  keywordMap = DEFAULT_KEYWORD_MAP,
}) {
  const normalizedCategory = normalizeText(category);

  if (isSharedCategory(normalizedCategory, sharedCategories)) {
    return {
      label: 'shared',
      confidence: 0.92,
      reasoning: `Matched shared category: ${normalizedCategory}`,
      amount,
      category: normalizedCategory,
    };
  }

  const normalizedPersonalCategories = DEFAULT_PERSONAL_CATEGORIES.map((item) => normalizeText(item));
  if (normalizedPersonalCategories.includes(normalizedCategory)) {
    return {
      label: 'personal',
      confidence: 0.9,
      reasoning: `Matched personal category: ${normalizedCategory}`,
      amount,
      category: normalizedCategory,
    };
  }

  const { sharedScore, personalScore } = scoreKeywordMatches(description, keywordMap);

  if (sharedScore > personalScore && sharedScore > 0) {
    return {
      label: 'shared',
      confidence: 0.8,
      reasoning: `Matched shared keywords in description (${sharedScore})`,
      amount,
      category: normalizedCategory,
    };
  }

  if (personalScore > sharedScore && personalScore > 0) {
    return {
      label: 'personal',
      confidence: 0.8,
      reasoning: `Matched personal keywords in description (${personalScore})`,
      amount,
      category: normalizedCategory,
    };
  }

  return {
    label: 'personal',
    confidence: 0.5,
    reasoning: 'No category or keyword rule matched; defaulted to personal',
    amount,
    category: normalizedCategory,
  };
}

module.exports = {
  DEFAULT_SHARED_CATEGORIES,
  DEFAULT_PERSONAL_CATEGORIES,
  DEFAULT_KEYWORD_MAP,
  normalizeText,
  isSharedCategory,
  scoreKeywordMatches,
  classifyExpenseRuleBased,
};
