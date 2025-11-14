const { getDatabase, closeDatabase } = require('./database');

function runMigrations() {
  const db = getDatabase();

  console.log('Running database migrations...');

  try {
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        email_verified INTEGER DEFAULT 0
      );
    `);
    console.log('✓ Users table created');

    // Questions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        email TEXT NOT NULL,
        title TEXT NOT NULL,
        details TEXT NOT NULL,
        urgency TEXT NOT NULL,
        status TEXT DEFAULT 'received',
        price_cents INTEGER NOT NULL,
        stripe_payment_intent_id TEXT,
        payment_status TEXT,
        due_date DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        answered_at DATETIME,
        answer_text TEXT,
        admin_notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('✓ Questions table created');

    // Attachments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      );
    `);
    console.log('✓ Attachments table created');

    // Admin actions log
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_actions (
        id TEXT PRIMARY KEY,
        admin_id TEXT,
        action_type TEXT,
        question_id TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id),
        FOREIGN KEY (question_id) REFERENCES questions(id)
      );
    `);
    console.log('✓ Admin actions table created');

    // Email notifications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_notifications (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        question_id TEXT,
        notification_type TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT,
        FOREIGN KEY (question_id) REFERENCES questions(id)
      );
    `);
    console.log('✓ Email notifications table created');

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
      CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
      CREATE INDEX IF NOT EXISTS idx_questions_due_date ON questions(due_date);
      CREATE INDEX IF NOT EXISTS idx_attachments_question_id ON attachments(question_id);
      CREATE INDEX IF NOT EXISTS idx_admin_actions_question_id ON admin_actions(question_id);
    `);
    console.log('✓ Indexes created');

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
