const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database.sqlite');

let db;

function getDatabase() {
  if (!db) {
    db = new Database(dbPath, { verbose: console.log });
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDatabase,
  closeDatabase
};
