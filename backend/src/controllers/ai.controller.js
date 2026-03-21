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
  const { description, amount } = req.body || {};
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }
  if (typeof description !== 'string') {
    return res.status(400).json({ error: 'description must be a string' });
  }
  if (amount !== undefined && typeof amount !== 'number') {
    return res.status(400).json({ error: 'amount must be a number' });
  }
  const result = aiService.classifyExpense({ description, amount });
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
