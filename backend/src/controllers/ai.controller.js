const mongoose = require('mongoose');
const aiService = require('../services/ai.service');
const hiveService = require('../../services/hiveService');
const { makeExtractedReceipt } = require('../receipts/contracts');
const { classifyPersonalShared } = require('../ai/phase1/classifyPersonalShared');
const { classifyExpense: classifyExpenseSignal, fromManualExpense } = require('../ai/classification');
const { listNeedsReview, resolveNeedsReview } = require('../ai/classification/reviewService');
const { CATEGORIES } = require('../../models/Expense');

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

/**
 * Preview endpoint for the manual-add form: runs the full multi-task classifier
 * (category, personal/shared, hive) and returns suggestions only. Nothing is saved —
 * the user reviews and accepts/edits before the expense is actually created.
 */
async function classifyExpense(req, res) {
  try {
    const { description, amount, vendor, category, currency, date, lineItems, hiveId: hiveIdOverride } =
      req.body || {};

    if (description === undefined || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'description is required' } });
    }
    if (amount === undefined || typeof amount !== 'number' || Number.isNaN(amount)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'amount must be a number' } });
    }

    let hiveId = req.user.hiveId || null;
    if (hiveIdOverride) {
      if (!isValidHiveObjectId(hiveIdOverride)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'hiveId must be a valid Mongo id' } });
      }
      const allowed = await assertUserInHive(req.user.userId, hiveIdOverride);
      if (!allowed) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } });
      }
      hiveId = hiveIdOverride;
    }

    const signal = fromManualExpense({
      description,
      amount,
      category: category ?? null,
      currency: currency ?? null,
      date: date ?? null,
      vendor: vendor ?? null,
      lineItems: Array.isArray(lineItems) ? lineItems : [],
    });

    const data = await classifyExpenseSignal(signal, { userId: req.user.userId, hiveId });
    return res.json({ data });
  } catch (err) {
    console.error('classifyExpense:', err);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    });
  }
}

/**
 * List expenses (currently only from bank sync) whose AI-derived classification is
 * still a pending suggestion awaiting user confirmation or correction.
 */
async function getNeedsReview(req, res) {
  try {
    const data = await listNeedsReview(req.user.userId);
    return res.json({ data });
  } catch (err) {
    console.error('getNeedsReview:', err);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    });
  }
}

function validateReviewCorrections(body) {
  const errors = [];
  if (body.category !== undefined && !CATEGORIES.includes(body.category)) {
    errors.push(`category must be one of: ${CATEGORIES.join(', ')}`);
  }
  if (body.type !== undefined && body.type !== 'personal' && body.type !== 'shared') {
    errors.push('type must be personal or shared');
  }
  if (body.hiveId !== undefined && body.hiveId !== null && !isValidHiveObjectId(body.hiveId)) {
    errors.push('hiveId must be a valid Mongo id');
  }
  if (body.expenseGroupId !== undefined && body.expenseGroupId !== null && !isValidHiveObjectId(body.expenseGroupId)) {
    errors.push('expenseGroupId must be a valid Mongo id');
  }
  return errors;
}

/**
 * Confirm (or correct) a pending AI suggestion. An empty body accepts the suggestion
 * as-is; any provided field overrides what the AI suggested.
 */
async function resolveNeedsReviewItem(req, res) {
  try {
    const body = req.body || {};
    const errors = validateReviewCorrections(body);
    if (errors.length > 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: errors.join('; ') } });
    }

    if (body.type === 'shared' || body.hiveId) {
      const hiveId = body.hiveId || req.user.hiveId;
      if (!hiveId || !(await assertUserInHive(req.user.userId, hiveId))) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Hive not found' } });
      }
    }

    const expense = await resolveNeedsReview(req.user.userId, req.params.expenseId, body);
    if (!expense) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pending suggestion not found' } });
    }

    return res.json({ data: expense });
  } catch (err) {
    console.error('resolveNeedsReviewItem:', err);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    });
  }
}

async function classifyFromReceipt(req, res) {
  try {
    const body = req.body || {};
    const rawText = typeof body.rawText === 'string' ? body.rawText : '';

    const extracted = makeExtractedReceipt({
      vendor: body.vendor ?? null,
      amount: typeof body.amount === 'number' ? body.amount : null,
      currency: body.currency ?? null,
      date: body.date ?? null,
      category: body.category ?? null,
      lineItems: Array.isArray(body.lineItems) ? body.lineItems : [],
      rawText,
    });

    if (!extracted.vendor && !extracted.rawText) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'vendor or rawText is required' },
      });
    }

    const data = await classifyPersonalShared(extracted);
    return res.json({ data });
  } catch (err) {
    console.error('classifyFromReceipt:', err);
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    });
  }
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
  classifyFromReceipt,
  getNeedsReview,
  resolveNeedsReviewItem,
  getImbalance,
  getGoalSuggestions,
};
