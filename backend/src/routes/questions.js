const express = require('express');
const {
  submitQuestion,
  confirmPayment,
  getMyQuestions,
  getQuestion,
  getAllQuestions,
  updateQuestionStatus,
  publishAnswer,
  getDashboardStats
} = require('../controllers/questionController');
const { optionalAuth, authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public/user routes
router.post('/', optionalAuth, submitQuestion);
router.post('/confirm-payment', confirmPayment);
router.get('/my-questions', authenticate, getMyQuestions);
router.get('/:id', optionalAuth, getQuestion);

// Admin routes
router.get('/', authenticate, requireAdmin, getAllQuestions);
router.patch('/:id/status', authenticate, requireAdmin, updateQuestionStatus);
router.post('/:id/publish-answer', authenticate, requireAdmin, publishAnswer);
router.get('/admin/stats', authenticate, requireAdmin, getDashboardStats);

module.exports = router;
