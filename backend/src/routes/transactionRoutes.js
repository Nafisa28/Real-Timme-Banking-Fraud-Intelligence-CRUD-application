const express = require('express');
const db = require('../db/dbManager');
const { evaluateTransaction } = require('../engine/fraudEngine');
const { broadcastAlert } = require('../services/websocket');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/transactions — List, Search, Filter transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { risk_level, status, search } = req.query;
    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];

    if (risk_level) {
      sql += ' AND risk_level = $1';
      params.push(risk_level);
    }
    if (status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (search) {
      const pIdx = params.length + 1;
      sql += ` AND (merchant_name LIKE $${pIdx} OR location LIKE $${pIdx} OR device_id LIKE $${pIdx})`;
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY id DESC';

    const transactions = await db.query(sql, params);

    const parsed = transactions.map(t => {
      let tr = [];
      try {
        tr = typeof t.triggered_rules === 'string' ? JSON.parse(t.triggered_rules) : (t.triggered_rules || []);
      } catch (e) {}
      return { ...t, triggered_rules: tr };
    });

    res.json(parsed);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/transactions/:id — Get Transaction by ID with Risk Breakdown
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const txns = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (!txns || txns.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const t = txns[0];
    let tr = [];
    try {
      tr = typeof t.triggered_rules === 'string' ? JSON.parse(t.triggered_rules) : (t.triggered_rules || []);
    } catch (e) {}

    const accounts = await db.query('SELECT * FROM accounts WHERE id = $1', [t.account_id]);
    const account = accounts[0] || null;

    res.json({ ...t, triggered_rules: tr, account });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transaction details' });
  }
});

// POST /api/transactions — Create new transaction & trigger Fraud Engine
router.post('/', authenticateToken, requireRole(['Bank Staff', 'Fraud Analyst', 'Admin']), async (req, res) => {
  try {
    const { account_id, amount, currency, transaction_type, merchant_name, location, device_id, ip_address, is_new_device } = req.body;
    if (!account_id || !amount || !transaction_type) {
      return res.status(400).json({ error: 'Account ID, amount, and transaction type are required' });
    }

    const numAmount = Number(amount);
    const curr = currency || 'USD';
    const merchant = merchant_name || 'Standard Retailer';
    const loc = location || 'Local In-Store';
    const dev = device_id || 'DEV-STANDARD-01';
    const ip = ip_address || '127.0.0.1';
    const now = new Date().toISOString();

    const accs = await db.query('SELECT balance FROM accounts WHERE id = $1', [account_id]);
    const balance = accs[0] ? Number(accs[0].balance) : 5000;

    const evalResult = await evaluateTransaction({
      account_id,
      amount: numAmount,
      currency: curr,
      transaction_type,
      merchant_name: merchant,
      location: loc,
      device_id: dev,
      ip_address: ip,
      balance,
      is_new_device
    });

    const txnStatus = evalResult.action_status; // COMPLETED, UNDER_REVIEW, or BLOCKED_SIMULATED
    const triggeredJson = JSON.stringify(evalResult.triggered_rules);

    await db.query(
      `INSERT INTO transactions (account_id, amount, currency, transaction_type, merchant_name, location, device_id, ip_address, rule_score, ml_probability, risk_score, risk_level, triggered_rules, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [account_id, numAmount, curr, transaction_type, merchant, loc, dev, ip, evalResult.rule_score, evalResult.ml_probability, evalResult.risk_score, evalResult.risk_level, triggeredJson, txnStatus, now]
    );

    const lastInserted = await db.query('SELECT * FROM transactions ORDER BY id DESC LIMIT 1');
    const insertedTxn = lastInserted[0];

    let createdAlert = null;
    if (evalResult.risk_level === 'Medium' || evalResult.risk_level === 'High') {
      await db.query(
        `INSERT INTO fraud_alerts (transaction_id, risk_score, risk_level, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [insertedTxn.id, evalResult.risk_score, evalResult.risk_level, 'OPEN', now, now]
      );

      const lastAlert = await db.query('SELECT * FROM fraud_alerts ORDER BY id DESC LIMIT 1');
      createdAlert = lastAlert[0];

      broadcastAlert('ALERT_CREATED', {
        ...createdAlert,
        transaction: insertedTxn,
        triggered_rules: evalResult.triggered_rules,
        behavioral_deviations: evalResult.behavioral_deviations
      });
    }

    db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'CREATE_TRANSACTION', 'TRANSACTION', String(insertedTxn.id), JSON.stringify({ risk_score: evalResult.risk_score, risk_level: evalResult.risk_level, status: txnStatus }), now]
    );

    res.status(201).json({
      message: 'Transaction successfully processed and screened',
      transaction: { ...insertedTxn, triggered_rules: evalResult.triggered_rules },
      fraud_analysis: evalResult,
      alert_generated: Boolean(createdAlert),
      alert: createdAlert
    });
  } catch (err) {
    console.error('Error creating transaction:', err);
    res.status(500).json({ error: 'Failed to evaluate and store transaction: ' + (err.message || err) });
  }
});

module.exports = router;
