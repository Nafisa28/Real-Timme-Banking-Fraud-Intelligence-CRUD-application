const express = require('express');
const db = require('../db/dbManager');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/accounts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const accounts = await db.query('SELECT * FROM accounts ORDER BY id DESC');
    res.json(accounts);
  } catch (err) {
    console.error('Error fetching bank accounts:', err);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

// POST /api/accounts — Create Bank Account
router.post('/', authenticateToken, requireRole(['Bank Staff', 'Fraud Analyst', 'Admin']), async (req, res) => {
  try {
    const { customer_id, account_type, initial_balance, currency } = req.body;
    if (!customer_id || !account_type) {
      return res.status(400).json({ error: 'Customer ID and Account Type are required' });
    }

    const accNum = `ACC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const balance = Number(initial_balance || 0);
    const curr = currency || 'USD';
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO accounts (customer_id, account_number, account_type, balance, currency, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [Number(customer_id), accNum, account_type, balance, curr, 'ACTIVE', now]
    );

    const created = await db.query('SELECT * FROM accounts WHERE account_number = $1', [accNum]);
    res.status(201).json(created[0] || { customer_id, account_number: accNum, account_type, balance, currency: curr, status: 'ACTIVE' });
  } catch (err) {
    console.error('Error creating bank account:', err);
    res.status(500).json({ error: 'Failed to create bank account: ' + (err.message || err) });
  }
});

module.exports = router;
