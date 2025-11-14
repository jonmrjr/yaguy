const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../config/database');
const { createCheckoutSession, getCheckoutSession } = require('../services/stripeService');
const { sendQuestionConfirmation, sendAnswerDelivered } = require('../services/emailService');

/**
 * Submit a new question (creates pending question, returns Stripe checkout URL)
 */
async function submitQuestion(req, res) {
  const { email, title, details, urgency } = req.body;

  if (!email || !title || !details || !urgency) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['standard', 'urgent'].includes(urgency)) {
    return res.status(400).json({ error: 'Urgency must be "standard" or "urgent"' });
  }

  const db = getDatabase();

  try {
    // Calculate price and due date
    const priceCents = urgency === 'urgent'
      ? parseInt(process.env.URGENT_PRICE_CENTS || '9900')
      : parseInt(process.env.STANDARD_PRICE_CENTS || '4900');

    const slaHours = urgency === 'urgent'
      ? parseInt(process.env.URGENT_SLA_HOURS || '6')
      : parseInt(process.env.STANDARD_SLA_HOURS || '24');

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + slaHours);

    // Create question
    const questionId = uuidv4();
    const userId = req.user ? req.user.id : null;

    db.prepare(`
      INSERT INTO questions (id, user_id, email, title, details, urgency, status, price_cents, payment_status, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(questionId, userId, email, title, details, urgency, 'pending_payment', priceCents, 'pending', dueDate.toISOString());

    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);

    // Create Stripe checkout session
    const stripeResult = await createCheckoutSession(question);

    if (!stripeResult.success) {
      return res.status(500).json({ error: 'Failed to create payment session' });
    }

    // Update question with payment intent
    db.prepare('UPDATE questions SET stripe_payment_intent_id = ? WHERE id = ?')
      .run(stripeResult.session.id, questionId);

    res.status(201).json({
      message: 'Question created, proceed to payment',
      questionId,
      checkoutUrl: stripeResult.session.url,
      sessionId: stripeResult.session.id
    });
  } catch (error) {
    console.error('Submit question error:', error);
    res.status(500).json({ error: 'Failed to submit question' });
  }
}

/**
 * Handle successful payment (called from frontend after Stripe redirect)
 */
async function confirmPayment(req, res) {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const db = getDatabase();

  try {
    // Verify payment with Stripe
    const stripeResult = await getCheckoutSession(sessionId);

    if (!stripeResult.success) {
      return res.status(500).json({ error: 'Failed to verify payment' });
    }

    const session = stripeResult.session;

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Update question status
    const questionId = session.metadata.question_id;

    db.prepare(`
      UPDATE questions
      SET status = 'received', payment_status = 'succeeded'
      WHERE id = ?
    `).run(questionId);

    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);

    // Send confirmation email
    await sendQuestionConfirmation(question);

    res.json({
      message: 'Payment confirmed',
      question
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
}

/**
 * Get user's questions
 */
function getMyQuestions(req, res) {
  const db = getDatabase();

  try {
    const questions = db.prepare(`
      SELECT id, title, urgency, status, price_cents, due_date, created_at, answered_at
      FROM questions
      WHERE user_id = ? OR email = ?
      ORDER BY created_at DESC
    `).all(req.user ? req.user.id : null, req.user ? req.user.email : '');

    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
}

/**
 * Get a single question by ID
 */
function getQuestion(req, res) {
  const { id } = req.params;
  const db = getDatabase();

  try {
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check authorization (user owns question or is admin)
    const isOwner = req.user && (question.user_id === req.user.id || question.email === req.user.email);
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get attachments
    const attachments = db.prepare('SELECT * FROM attachments WHERE question_id = ?').all(id);

    res.json({
      question,
      attachments
    });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
}

/**
 * Admin: Get all questions with filters
 */
function getAllQuestions(req, res) {
  const { status, urgency } = req.query;
  const db = getDatabase();

  try {
    let query = 'SELECT * FROM questions WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (urgency) {
      query += ' AND urgency = ?';
      params.push(urgency);
    }

    query += ' ORDER BY created_at DESC';

    const questions = db.prepare(query).all(...params);

    res.json({ questions });
  } catch (error) {
    console.error('Get all questions error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
}

/**
 * Admin: Update question status
 */
function updateQuestionStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['received', 'in_progress', 'answered', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const db = getDatabase();

  try {
    db.prepare('UPDATE questions SET status = ? WHERE id = ?').run(status, id);

    // Log admin action
    db.prepare(`
      INSERT INTO admin_actions (id, admin_id, action_type, question_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user.id, 'status_change', id, JSON.stringify({ new_status: status }));

    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);

    res.json({ message: 'Status updated', question });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
}

/**
 * Admin: Publish answer to a question
 */
async function publishAnswer(req, res) {
  const { id } = req.params;
  const { answer_text } = req.body;

  if (!answer_text) {
    return res.status(400).json({ error: 'Answer text is required' });
  }

  const db = getDatabase();

  try {
    db.prepare(`
      UPDATE questions
      SET answer_text = ?, status = 'answered', answered_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(answer_text, id);

    // Log admin action
    db.prepare(`
      INSERT INTO admin_actions (id, admin_id, action_type, question_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user.id, 'answer_published', id, JSON.stringify({ answer_length: answer_text.length }));

    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);

    // Send email notification
    await sendAnswerDelivered(question);

    res.json({ message: 'Answer published', question });
  } catch (error) {
    console.error('Publish answer error:', error);
    res.status(500).json({ error: 'Failed to publish answer' });
  }
}

/**
 * Admin: Get dashboard statistics
 */
function getDashboardStats(req, res) {
  const db = getDatabase();

  try {
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM questions').get().count,
      received: db.prepare("SELECT COUNT(*) as count FROM questions WHERE status = 'received'").get().count,
      in_progress: db.prepare("SELECT COUNT(*) as count FROM questions WHERE status = 'in_progress'").get().count,
      answered: db.prepare("SELECT COUNT(*) as count FROM questions WHERE status = 'answered'").get().count,
      revenue: db.prepare("SELECT SUM(price_cents) as total FROM questions WHERE payment_status = 'succeeded'").get().total || 0,
      avg_response_time: db.prepare(`
        SELECT AVG(
          (julianday(answered_at) - julianday(created_at)) * 24
        ) as hours
        FROM questions
        WHERE answered_at IS NOT NULL
      `).get().hours || 0
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}

module.exports = {
  submitQuestion,
  confirmPayment,
  getMyQuestions,
  getQuestion,
  getAllQuestions,
  updateQuestionStatus,
  publishAnswer,
  getDashboardStats
};
