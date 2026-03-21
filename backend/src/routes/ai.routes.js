const express = require('express');
const aiController = require('../controllers/ai.controller');

const router = express.Router();

router.get('/insights', aiController.getInsights);
router.get('/forecast', aiController.getForecast);
router.get('/recommendations', aiController.getRecommendations);
router.post('/classify-expense', aiController.classifyExpense);
router.get('/imbalance', aiController.getImbalance);
router.get('/goal-suggestions', aiController.getGoalSuggestions);

module.exports = router;
