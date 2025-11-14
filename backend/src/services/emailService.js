const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../config/database');

const EMAILS_DIR = path.join(__dirname, '../../emails_sent');

// Ensure emails directory exists
async function ensureEmailsDir() {
  try {
    await fs.mkdir(EMAILS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create emails directory:', error);
  }
}

/**
 * Mock email sender - saves emails to files instead of sending
 */
async function sendEmail({ to, subject, html, text }) {
  await ensureEmailsDir();

  const db = getDatabase();
  const emailId = uuidv4();
  const timestamp = new Date().toISOString();

  // Save email to file
  const emailData = {
    id: emailId,
    to,
    subject,
    html,
    text,
    timestamp
  };

  const filename = `${timestamp.replace(/:/g, '-')}_${emailId}.json`;
  const filepath = path.join(EMAILS_DIR, filename);

  try {
    await fs.writeFile(filepath, JSON.stringify(emailData, null, 2));
    console.log(`📧 Email saved to: ${filename}`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);

    return { success: true, emailId, filepath };
  } catch (error) {
    console.error('Failed to save email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send question confirmation email
 */
async function sendQuestionConfirmation(question) {
  const dueDate = new Date(question.due_date).toLocaleString();
  const price = (question.price_cents / 100).toFixed(2);

  const html = `
    <h1>Question Received!</h1>
    <p>Thank you for submitting your question to Ask YaGuy.</p>

    <h2>Question Details:</h2>
    <p><strong>Title:</strong> ${question.title}</p>
    <p><strong>Urgency:</strong> ${question.urgency === 'urgent' ? 'Urgent (6 hours)' : 'Standard (24 hours)'}</p>
    <p><strong>Due Date:</strong> ${dueDate}</p>
    <p><strong>Price:</strong> $${price}</p>

    <p>You will receive an email when your answer is ready.</p>

    <p><a href="${process.env.FRONTEND_URL}/question.html?id=${question.id}">View Question</a></p>
  `;

  const text = `
Question Received!

Thank you for submitting your question to Ask YaGuy.

Question Details:
Title: ${question.title}
Urgency: ${question.urgency === 'urgent' ? 'Urgent (6 hours)' : 'Standard (24 hours)'}
Due Date: ${dueDate}
Price: $${price}

You will receive an email when your answer is ready.

View Question: ${process.env.FRONTEND_URL}/question.html?id=${question.id}
  `;

  const result = await sendEmail({
    to: question.email,
    subject: `Question Received - ${question.title}`,
    html,
    text
  });

  // Log email notification
  if (result.success) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO email_notifications (id, user_email, question_id, notification_type, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), question.email, question.id, 'confirmation', 'sent');
  }

  return result;
}

/**
 * Send answer delivered email
 */
async function sendAnswerDelivered(question) {
  const html = `
    <h1>Your Answer is Ready!</h1>
    <p>Great news! Your question has been answered.</p>

    <h2>Question:</h2>
    <p><strong>${question.title}</strong></p>

    <p><a href="${process.env.FRONTEND_URL}/question.html?id=${question.id}">View Full Answer</a></p>

    <p><em>You have 24 hours to submit a follow-up question if needed.</em></p>
  `;

  const text = `
Your Answer is Ready!

Great news! Your question has been answered.

Question: ${question.title}

View Full Answer: ${process.env.FRONTEND_URL}/question.html?id=${question.id}

You have 24 hours to submit a follow-up question if needed.
  `;

  const result = await sendEmail({
    to: question.email,
    subject: `Answer Ready - ${question.title}`,
    html,
    text
  });

  // Log email notification
  if (result.success) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO email_notifications (id, user_email, question_id, notification_type, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), question.email, question.id, 'answer_delivered', 'sent');
  }

  return result;
}

/**
 * Send SLA reminder to admin
 */
async function sendSLAReminder(question, hoursRemaining) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@yaguy.com';

  const html = `
    <h1>⚠️ SLA Reminder</h1>
    <p>Question due in ${hoursRemaining} hours!</p>

    <h2>Question Details:</h2>
    <p><strong>ID:</strong> ${question.id}</p>
    <p><strong>Title:</strong> ${question.title}</p>
    <p><strong>Urgency:</strong> ${question.urgency}</p>
    <p><strong>Status:</strong> ${question.status}</p>
    <p><strong>Due:</strong> ${new Date(question.due_date).toLocaleString()}</p>

    <p><a href="${process.env.FRONTEND_URL}/admin.html#question-${question.id}">Answer Now</a></p>
  `;

  const text = `
⚠️ SLA Reminder

Question due in ${hoursRemaining} hours!

Question Details:
ID: ${question.id}
Title: ${question.title}
Urgency: ${question.urgency}
Status: ${question.status}
Due: ${new Date(question.due_date).toLocaleString()}

Answer Now: ${process.env.FRONTEND_URL}/admin.html#question-${question.id}
  `;

  return await sendEmail({
    to: adminEmail,
    subject: `⚠️ SLA Alert: Question due in ${hoursRemaining}h`,
    html,
    text
  });
}

module.exports = {
  sendEmail,
  sendQuestionConfirmation,
  sendAnswerDelivered,
  sendSLAReminder
};
