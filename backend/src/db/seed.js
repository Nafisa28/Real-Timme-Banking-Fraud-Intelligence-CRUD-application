const bcrypt = require('bcryptjs');
const db = require('./dbManager');
const { initSchema } = require('./schema');

/**
 * Startup initialization.
 * - Creates DB schema tables if they don't exist.
 * - Loads saved data from banking_fraud.json into memory (via schema.js -> loadPersistedData).
 * - Creates default login user accounts ONLY if no users exist yet.
 * - NEVER clears existing customer/account/transaction/alert data.
 */
async function seedCleanData() {
  await initSchema();

  // Only seed default users if the users table is empty (first-ever run)
  const usersCountRes = await db.query('SELECT COUNT(*) as cnt FROM users');
  const count = (usersCountRes[0] && (usersCountRes[0].cnt || usersCountRes[0]['COUNT(*)'])) || 0;

  if (Number(count) === 0) {
    console.log('First run detected — creating default login accounts...');
    const defaultPassword = await bcrypt.hash('Password123!', 10);
    const now = new Date().toISOString();

    const users = [
      { name: 'System Admin',   email: 'admin@bank.com',   password_hash: defaultPassword, role: 'Admin',          created_at: now, updated_at: now },
      { name: 'Sarah Analyst',  email: 'analyst@bank.com', password_hash: defaultPassword, role: 'Fraud Analyst',  created_at: now, updated_at: now },
      { name: 'John Teller',    email: 'staff@bank.com',   password_hash: defaultPassword, role: 'Bank Staff',     created_at: now, updated_at: now }
    ];

    for (const u of users) {
      await db.query(
        `INSERT INTO users (name, email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [u.name, u.email, u.password_hash, u.role, u.created_at, u.updated_at]
      );
    }

    db.persistData();
    console.log('Default login accounts created (admin / analyst / staff).');
  } else {
    console.log('Existing data loaded from banking_fraud.json — all customers, accounts, and transactions preserved.');
  }
}

/**
 * One-time hard reset — run this manually via: node backend/src/db/seed.js reset
 * Clears ALL data except users. Used when you want a truly fresh start.
 */
async function hardReset() {
  await initSchema();
  console.log('Performing hard reset — clearing all data tables...');
  await db.query('DELETE FROM investigations');
  await db.query('DELETE FROM fraud_alerts');
  await db.query('DELETE FROM transactions');
  await db.query('DELETE FROM accounts');
  await db.query('DELETE FROM customers');
  await db.query('DELETE FROM audit_logs');
  db.persistData();
  console.log('Hard reset complete. Database is now empty.');
}

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === 'reset') {
    hardReset().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
  } else {
    seedCleanData().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
  }
}

module.exports = { seedCleanData, hardReset };
