const aiService = require('../services/ai.service');

function getInsights(_req, res) {
  const insights = aiService.getInsights();
  res.json({ data: insights });
}

function getForecast(_req, res) {
  const forecast = aiService.getForecast();
  res.json({ data: forecast });
}

function getRecommendations(_req, res) {
  const recommendations = aiService.getRecommendations();
  res.json({ data: recommendations });
}

function classifyExpense(req, res) {
  const { description, amount, category } = req.body || {};

  if (description === undefined) {
    return res.status(400).json({ error: 'description is required' });
  }
  if (typeof description !== 'string') {
    return res.status(400).json({ error: 'description must be a string' });
  }
  if (description.trim() === '') {
    return res.status(400).json({ error: 'description cannot be empty' });
  }

  if (amount === undefined) {
    return res.status(400).json({ error: 'amount is required' });
  }
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return res.status(400).json({ error: 'amount must be a number' });
  }

  if (category === undefined) {
    return res.status(400).json({ error: 'category is required' });
  }
  if (typeof category !== 'string') {
    return res.status(400).json({ error: 'category must be a string' });
  }
  if (category.trim() === '') {
    return res.status(400).json({ error: 'category cannot be empty' });
  }

  const result = aiService.classifyExpense({ description, amount, category });
  res.json({ data: result });
}

function getImbalance(_req, res) {
  const imbalance = aiService.getImbalance();
  res.json({ data: imbalance });
}

function getGoalSuggestions(_req, res) {
  const suggestions = aiService.getGoalSuggestions();
  res.json({ data: suggestions });
}

module.exports = {
  getInsights,
  getForecast,
  getRecommendations,
  classifyExpense,
  getImbalance,
  getGoalSuggestions,
};
