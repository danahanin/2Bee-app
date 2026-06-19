const express = require('express');
const authMiddleware = require('../../middleware/auth');
const privacyFilterMiddleware = require('../../middleware/privacyFilter');
const aiController = require('../controllers/ai.controller');

const router = express.Router();

router.get('/insights', authMiddleware, privacyFilterMiddleware, aiController.getInsights);
router.get('/forecast', authMiddleware, aiController.getForecast);
router.get('/recommendations', authMiddleware, aiController.getRecommendations);
router.post('/classify-expense', aiController.classifyExpense);
router.post('/classify-from-receipt', authMiddleware, aiController.classifyFromReceipt);
router.get('/imbalance', authMiddleware, aiController.getImbalance);
router.get('/goal-suggestions', authMiddleware, aiController.getGoalSuggestions);

module.exports = router;
