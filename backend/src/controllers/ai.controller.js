const mongoose = require('mongoose');
const aiService = require('../services/ai.service');
const hiveService = require('../../services/hiveService');

function isValidHiveObjectId(raw) {
  return typeof raw === 'string' && mongoose.Types.ObjectId.isValid(raw);
}

function normalizedScope(scopeParam) {
  if (scopeParam === undefined || scopeParam === '') {
    return 'personal';
  }
  if (scopeParam === 'personal' || scopeParam === 'shared') {
    return scopeParam;
  }
  return null;
}

async function assertUserInHive(userId, hiveId) {
  const hive = await hiveService.getHiveById(hiveId, userId);
  return hive !== null;
}

async function getInsights(req, res) {
  try {
    const scope = normalizedScope(req.query.scope);
    if (!scope) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'scope must be personal or shared',
        },
      });
    }

    const userId = req.user.userId;

    if (scope === 'personal') {
      const data = await aiService.getInsights({ scope: 'personal', userId });
      return res.json({ data });
    }

    const hiveIdRaw = req.query.hiveId;
    if (hiveIdRaw === undefined || hiveIdRaw === '') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hiveId is required when scope is shared',
        },
      });
    }
    if (!isValidHiveObjectId(hiveIdRaw)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hiveId must be a valid Mongo id',
        },
      });
    }

    const allowed = await assertUserInHive(userId, hiveIdRaw);
    if (!allowed) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Hive not found' },
      });
    }

    const data = await aiService.getInsights({ scope: 'shared', userId, hiveId: hiveIdRaw });
    return res.json({ data });
  } catch (err) {
    console.error('getInsights:', err);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    });
  }
}

async function getForecast(req, res) {
  try {
    const scope = normalizedScope(req.query.scope);
    if (!scope) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'scope must be personal or shared',
        },
      });
    }

    const userId = req.user.userId;

    if (scope === 'personal') {
      const data = await aiService.getForecast({ scope: 'personal', userId });
      return res.json({ data });
    }

    const hiveIdRaw = req.query.hiveId;
    if (hiveIdRaw === undefined || hiveIdRaw === '') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hiveId is required when scope is shared',
        },
      });
    }
    if (!isValidHiveObjectId(hiveIdRaw)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hiveId must be a valid Mongo id',
        },
      });
    }

    const allowed = await assertUserInHive(userId, hiveIdRaw);
    if (!allowed) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Hive not found' },
      });
    }

    const data = await aiService.getForecast({ scope: 'shared', hiveId: hiveIdRaw });
    return res.json({ data });
  } catch (err) {
    console.error('getForecast:', err);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    });
  }
}

async function getRecommendations(req, res) {
  try {
    const scope = normalizedScope(req.query.scope);
    if (!scope) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'scope must be personal or shared',
        },
      });
    }

    const userId = req.user.userId;
    const userData = { firstName: req.user.firstName };

    if (scope === 'personal') {
      const data = await aiService.getRecommendations({ scope: 'personal', userId, userData });
      return res.json({ data });
    }

    const hiveIdRaw = req.query.hiveId;
    if (hiveIdRaw === undefined || hiveIdRaw === '') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hiveId is required when scope is shared',
        },
      });
    }
    if (!isValidHiveObjectId(hiveIdRaw)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hiveId must be a valid Mongo id',
        },
      });
    }

    const allowed = await assertUserInHive(userId, hiveIdRaw);
    if (!allowed) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Hive not found' },
      });
    }

    const data = await aiService.getRecommendations({ scope: 'shared', userId, hiveId: hiveIdRaw, userData });
    return res.json({ data });
  } catch (err) {
    console.error('getRecommendations:', err);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    });
  }
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

async function getImbalance(req, res) {
  try {
    const userId = req.user.userId;
    const hiveIdRaw = req.query.hiveId;

    if (hiveIdRaw === undefined || hiveIdRaw === '') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hiveId is required',
        },
      });
    }
    if (!isValidHiveObjectId(hiveIdRaw)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hiveId must be a valid Mongo id',
        },
      });
    }

    const allowed = await assertUserInHive(userId, hiveIdRaw);
    if (!allowed) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Hive not found' },
      });
    }

    const data = await aiService.getImbalance({ hiveId: hiveIdRaw });
    return res.json({ data });
  } catch (err) {
    console.error('getImbalance:', err);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    });
  }
}

async function getGoalSuggestions(req, res) {
  try {
    const scope = normalizedScope(req.query.scope);
    if (!scope) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'scope must be personal or shared',
        },
      });
    }

    const userId = req.user.userId;

    if (scope === 'personal') {
      const data = await aiService.getGoalSuggestions({ scope: 'personal', userId });
      return res.json({ data });
    }

    const hiveIdRaw = req.query.hiveId;
    if (hiveIdRaw === undefined || hiveIdRaw === '') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hiveId is required when scope is shared',
        },
      });
    }
    if (!isValidHiveObjectId(hiveIdRaw)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'hiveId must be a valid Mongo id',
        },
      });
    }

    const allowed = await assertUserInHive(userId, hiveIdRaw);
    if (!allowed) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Hive not found' },
      });
    }

    const data = await aiService.getGoalSuggestions({ scope: 'shared', userId, hiveId: hiveIdRaw });
    return res.json({ data });
  } catch (err) {
    console.error('getGoalSuggestions:', err);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    });
  }
}

module.exports = {
  getInsights,
  getForecast,
  getRecommendations,
  classifyExpense,
  getImbalance,
  getGoalSuggestions,
};
