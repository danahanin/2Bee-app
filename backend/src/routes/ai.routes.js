const express = require('express');
const authMiddleware = require('../../middleware/auth');
const aiController = require('../controllers/ai.controller');

const router = express.Router();

router.get('/insights', aiController.getInsights);
router.get('/forecast', authMiddleware, aiController.getForecast);
router.get('/recommendations', aiController.getRecommendations);
router.post('/classify-expense', aiController.classifyExpense);
router.get('/imbalance', authMiddleware, aiController.getImbalance);
router.get('/goal-suggestions', aiController.getGoalSuggestions);

module.exports = router;
