const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { aiChatLimiter } = require('../middlewares/rateLimiter');

router.post('/chat', aiChatLimiter, aiController.handleAIChat);

module.exports = router;