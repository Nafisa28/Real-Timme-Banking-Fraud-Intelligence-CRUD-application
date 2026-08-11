const express = require('express');
const db = require('../db/dbManager');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const customers = await db.query('SELECT * FROM customers ORDER BY id DESC');
    res.json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// POST /api/customers — Create new Customer Profile
router.post('/', authenticateToken, requireRole(['Bank Staff', 'Fraud Analyst', 'Admin']), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, risk_rating } = req.body;
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    const now = new Date().toISOString();
    const rating = risk_rating || 'LOW';

    await db.query(
      `INSERT INTO customers (first_name, last_name, email, phone, kyc_status, risk_rating, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [first_name, last_name, email, phone || '', 'VERIFIED', rating, now]
    );

    const created = await db.query('SELECT * FROM customers WHERE email = $1 ORDER BY id DESC LIMIT 1', [email]);
    res.status(201).json(created[0] || { first_name, last_name, email, phone, created_at: now });
  } catch (err) {
    console.error('Error creating customer profile:', err);
    res.status(500).json({ error: 'Failed to create customer profile: ' + (err.message || err) });
  }
});

module.exports = router;
