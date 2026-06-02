function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

function arithmeticMean(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function detectOverspend(categorySpendByMonth) {
  const patterns = [];
  
  for (const [category, monthlySpends] of Object.entries(categorySpendByMonth)) {
    if (!Array.isArray(monthlySpends) || monthlySpends.length < 2) {
      continue;
    }
    
    const latest = monthlySpends[monthlySpends.length - 1];
    const priorMonths = monthlySpends.slice(0, -1);
    const avgPrior = arithmeticMean(priorMonths);
    
    if (avgPrior === 0) {
      continue;
    }
    
    const increaseRatio = (latest - avgPrior) / avgPrior;
    
    if (increaseRatio >= 0.3) {
      const severity = increaseRatio >= 0.5 ? 'high' : 'medium';
      patterns.push({
        type: 'overspend',
        category,
        severity,
        data: {
          currentSpend: roundMoney(latest),
          averagePrior: roundMoney(avgPrior),
          increasePercent: roundMoney(increaseRatio * 100),
        },
      });
    }
  }
  
  return patterns;
}

function detectSpendingSpike(recentTransactions) {
  const patterns = [];
  const categoryTotals = {};
  const categoryCounts = {};
  
  for (const tx of recentTransactions) {
    const cat = tx.category;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }
  
  for (const tx of recentTransactions) {
    const cat = tx.category;
    const avgForCategory = categoryTotals[cat] / categoryCounts[cat];
    
    if (tx.amount > avgForCategory * 3) {
      patterns.push({
        type: 'spike',
        category: cat,
        severity: 'high',
        data: {
          amount: roundMoney(tx.amount),
          description: tx.description || '',
          date: tx.date,
          categoryAverage: roundMoney(avgForCategory),
        },
      });
    }
  }
  
  return patterns;
}

function detectRecurringCharges(recentTransactions) {
  const patterns = [];
  const chargeKey = (tx) => `${tx.description || ''}|${roundMoney(tx.amount)}`;
  const chargeGroups = {};
  
  for (const tx of recentTransactions) {
    const key = chargeKey(tx);
    if (!chargeGroups[key]) {
      chargeGroups[key] = [];
    }
    chargeGroups[key].push(tx);
  }
  
  for (const [key, txs] of Object.entries(chargeGroups)) {
    if (txs.length >= 2) {
      const [description] = key.split('|');
      if (!description) {
        continue;
      }
      
      const sortedDates = txs.map((tx) => new Date(tx.date).getTime()).sort((a, b) => a - b);
      const gaps = [];
      for (let i = 1; i < sortedDates.length; i++) {
        gaps.push(sortedDates[i] - sortedDates[i - 1]);
      }
      
      const avgGapDays = arithmeticMean(gaps) / (1000 * 60 * 60 * 24);
      if (avgGapDays >= 25 && avgGapDays <= 35) {
        patterns.push({
          type: 'recurring',
          category: txs[0].category,
          severity: 'low',
          data: {
            description,
            amount: roundMoney(txs[0].amount),
            occurrences: txs.length,
          },
        });
      }
    }
  }
  
  return patterns;
}

function detectBudgetOverrun(budgetStatus) {
  const patterns = [];
  
  for (const budget of budgetStatus) {
    if (budget.percentUsed >= 80) {
      const severity = budget.percentUsed >= 100 ? 'high' : 'medium';
      patterns.push({
        type: 'budget_warning',
        category: budget.category,
        severity,
        data: {
          limit: roundMoney(budget.limit),
          spent: roundMoney(budget.spent),
          percentUsed: roundMoney(budget.percentUsed),
        },
      });
    }
  }
  
  return patterns;
}

function detectForecastExceedance(categorySpendByMonth, forecast) {
  const patterns = [];
  
  for (const f of forecast) {
    if (f.category === 'total') {
      continue;
    }
    
    const monthlySpends = categorySpendByMonth[f.category];
    if (!Array.isArray(monthlySpends) || monthlySpends.length === 0) {
      continue;
    }
    
    const currentSpend = monthlySpends[monthlySpends.length - 1];
    
    if (currentSpend > f.predicted && f.predicted > 0) {
      const exceedancePercent = ((currentSpend - f.predicted) / f.predicted) * 100;
      patterns.push({
        type: 'forecast_exceeded',
        category: f.category,
        severity: exceedancePercent >= 50 ? 'high' : 'medium',
        data: {
          currentSpend: roundMoney(currentSpend),
          predicted: roundMoney(f.predicted),
          exceedancePercent: roundMoney(exceedancePercent),
        },
      });
    }
  }
  
  return patterns;
}

function analyzeSpendingBehavior({
  categorySpendByMonth = {},
  budgetStatus = [],
  forecast = [],
  recentTransactions = [],
}) {
  const patterns = [
    ...detectOverspend(categorySpendByMonth),
    ...detectSpendingSpike(recentTransactions),
    ...detectRecurringCharges(recentTransactions),
    ...detectBudgetOverrun(budgetStatus),
    ...detectForecastExceedance(categorySpendByMonth, forecast),
  ];
  
  return patterns;
}

module.exports = {
  detectOverspend,
  detectSpendingSpike,
  detectRecurringCharges,
  detectBudgetOverrun,
  detectForecastExceedance,
  analyzeSpendingBehavior,
};
