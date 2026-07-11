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

module.exports = {
  generateId,
  roundMoney,
  formatCurrency,
};
