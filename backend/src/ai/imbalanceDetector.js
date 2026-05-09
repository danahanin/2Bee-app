const {
  IMBALANCE_RELATIVE_THRESHOLD,
  IMBALANCE_TREND_EPSILON,
  IMBALANCE_TREND,
} = require('../constants/ai.constants');

function roundShare(value) {
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value) {
  return Math.round(value * 100);
}

function toTotalsMap(input) {
  if (!input || typeof input !== 'object') {
    return {};
  }

  return Object.entries(input).reduce((acc, [userId, total]) => {
    if (typeof userId !== 'string' || userId === '__proto__' || userId === 'constructor') {
      return acc;
    }
    const numeric = typeof total === 'number' && Number.isFinite(total) ? total : 0;
    acc[userId] = Math.max(0, numeric);
    return acc;
  }, {});
}

function sumValues(map) {
  return Object.values(map).reduce((sum, v) => sum + v, 0);
}

function shareForUser(total, sumTotal) {
  if (sumTotal <= 0) {
    return 0;
  }
  return total / sumTotal;
}

function deltaFromShares(shares) {
  if (shares.length <= 1) {
    return 0;
  }
  const fairShare = 1 / shares.length;
  return shares.reduce((max, s) => Math.max(max, Math.abs(s - fairShare)), 0);
}

function severityFromShares(shares) {
  if (shares.length <= 1) {
    return 0;
  }
  const fairShare = 1 / shares.length;
  return deltaFromShares(shares) / fairShare;
}

function trendBetween(currentSeverity, previousSeverity, epsilon = IMBALANCE_TREND_EPSILON) {
  const diff = currentSeverity - previousSeverity;
  if (diff > epsilon) {
    return IMBALANCE_TREND.INCREASING;
  }
  if (diff < -epsilon) {
    return IMBALANCE_TREND.DECREASING;
  }
  return IMBALANCE_TREND.STABLE;
}

function collectUserIds(currentMap, previousMap) {
  const ids = new Set([...Object.keys(currentMap), ...Object.keys(previousMap)]);
  return Array.from(ids).sort();
}

function buildContributions(userIds, currentMap, previousMap) {
  const currentSum = sumValues(currentMap);
  const previousSum = sumValues(previousMap);

  return userIds.map((userId) => {
    const currentTotal = currentMap[userId] || 0;
    const previousTotal = previousMap[userId] || 0;
    return {
      userId,
      current: {
        total: roundMoney(currentTotal),
        share: roundShare(shareForUser(currentTotal, currentSum)),
      },
      previous: {
        total: roundMoney(previousTotal),
        share: roundShare(shareForUser(previousTotal, previousSum)),
      },
    };
  });
}

function formatSplit(contributions, windowKey) {
  return contributions
    .map((c) => `${roundPercent(c[windowKey].share)}%`)
    .join(' / ');
}

function buildMessage({ contributions, isImbalanced, trend }) {
  if (contributions.length === 0) {
    return 'No shared expenses recorded in the last two windows.';
  }

  const currentSplit = formatSplit(contributions, 'current');
  const previousSplit = formatSplit(contributions, 'previous');

  if (!isImbalanced) {
    return `Shared spend is balanced this window (${currentSplit}, previously ${previousSplit}).`;
  }

  return `Shared spend is imbalanced this window (${currentSplit}, previously ${previousSplit}); trend ${trend}.`;
}

function pickThreshold(input) {
  if (input && typeof input.threshold === 'number' && Number.isFinite(input.threshold)) {
    return input.threshold;
  }
  return IMBALANCE_RELATIVE_THRESHOLD;
}

function pickEpsilon(input) {
  if (input && typeof input.trendEpsilon === 'number' && Number.isFinite(input.trendEpsilon)) {
    return input.trendEpsilon;
  }
  return IMBALANCE_TREND_EPSILON;
}

function detectImbalance(input) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const currentMap = toTotalsMap(safeInput.current);
  const previousMap = toTotalsMap(safeInput.previous);
  const threshold = pickThreshold(safeInput);
  const epsilon = pickEpsilon(safeInput);

  const userIds = collectUserIds(currentMap, previousMap);
  const currentSum = sumValues(currentMap);
  const previousSum = sumValues(previousMap);

  const rawCurrentShares = userIds.map((u) => shareForUser(currentMap[u] || 0, currentSum));
  const rawPreviousShares = userIds.map((u) => shareForUser(previousMap[u] || 0, previousSum));

  const delta = deltaFromShares(rawCurrentShares);
  const currentSeverity = severityFromShares(rawCurrentShares);
  const previousSeverity = severityFromShares(rawPreviousShares);

  const contributions = buildContributions(userIds, currentMap, previousMap);
  const isImbalanced = currentSeverity > threshold;
  const trend = trendBetween(currentSeverity, previousSeverity, epsilon);
  const message = buildMessage({ contributions, isImbalanced, trend });

  return {
    isImbalanced,
    delta: roundShare(delta),
    severity: roundShare(currentSeverity),
    trend,
    message,
    contributions,
    windows: {
      current: {
        total: roundMoney(currentSum),
        userCount: Object.keys(currentMap).length,
      },
      previous: {
        total: roundMoney(previousSum),
        userCount: Object.keys(previousMap).length,
      },
    },
  };
}

module.exports = {
  detectImbalance,
  shareForUser,
  deltaFromShares,
  severityFromShares,
  trendBetween,
};
