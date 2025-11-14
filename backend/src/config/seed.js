const { getDatabase, closeDatabase } = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedDatabase() {
  const db = getDatabase();

  console.log('Seeding database...');

  try {
    // Create admin user
    const adminId = uuidv4();
    const adminPassword = 'admin123'; // Change this in production!
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@yaguy.com');

    if (!existingAdmin) {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, email_verified)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(adminId, 'admin@yaguy.com', hashedPassword, 'Admin User', 'admin', 1);

      console.log('✓ Admin user created');
      console.log('  Email: admin@yaguy.com');
      console.log('  Password: admin123');
    } else {
      console.log('✓ Admin user already exists');
    }

    // Create a test regular user
    const userId = uuidv4();
    const userPassword = 'user123';
    const hashedUserPassword = await bcrypt.hash(userPassword, 12);

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('user@example.com');

    if (!existingUser) {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, email_verified)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, 'user@example.com', hashedUserPassword, 'Test User', 'user', 1);

      console.log('✓ Test user created');
      console.log('  Email: user@example.com');
      console.log('  Password: user123');
    } else {
      console.log('✓ Test user already exists');
    }

    console.log('\n✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
