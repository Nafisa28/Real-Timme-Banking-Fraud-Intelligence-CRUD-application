const express = require('express');
const db = require('../db/dbManager');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { broadcastAlert } = require('../services/websocket');

const router = express.Router();

// GET /api/alerts — List Fraud Alerts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, risk_level } = req.query;
    let sql = 'SELECT * FROM fraud_alerts WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = $1';
      params.push(status);
    }
    if (risk_level) {
      sql += ` AND risk_level = $${params.length + 1}`;
      params.push(risk_level);
    }

    sql += ' ORDER BY id DESC';

    const alerts = await db.query(sql, params);

    const populated = await Promise.all(
      alerts.map(async (alert) => {
        const txns = await db.query('SELECT * FROM transactions WHERE id = $1', [Number(alert.transaction_id)]);
        const txn = txns[0] || null;
        let triggered = [];
        if (txn && txn.triggered_rules) {
          try {
            triggered = typeof txn.triggered_rules === 'string' ? JSON.parse(txn.triggered_rules) : txn.triggered_rules;
          } catch (e) {}
        }
        return {
          ...alert,
          transaction: txn ? { ...txn, triggered_rules: triggered } : null
        };
      })
    );

    res.json(populated);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ error: 'Failed to fetch fraud alerts' });
  }
});

// GET /api/alerts/:id — Get Alert Detail with full Transaction & Investigation History
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const alertId = Number(req.params.id);
    const alerts = await db.query('SELECT * FROM fraud_alerts WHERE id = $1', [alertId]);
    if (!alerts || alerts.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    const alert = alerts[0];

    const txns = await db.query('SELECT * FROM transactions WHERE id = $1', [Number(alert.transaction_id)]);
    const txn = txns[0] || null;

    let account = null;
    let customer = null;

    if (txn) {
      try {
        txn.triggered_rules = typeof txn.triggered_rules === 'string' ? JSON.parse(txn.triggered_rules) : (txn.triggered_rules || []);
      } catch (e) {}

      const accs = await db.query('SELECT * FROM accounts WHERE id = $1', [Number(txn.account_id)]);
      account = accs[0] || null;

      if (account) {
        const custs = await db.query('SELECT * FROM customers WHERE id = $1', [Number(account.customer_id)]);
        customer = custs[0] || null;
      }
    }

    const investigations = await db.query('SELECT * FROM investigations WHERE alert_id = $1 ORDER BY id ASC', [alertId]);

    res.json({
      alert,
      transaction: txn,
      account,
      customer,
      investigations
    });
  } catch (err) {
    console.error('Error fetching alert detail:', err);
    res.status(500).json({ error: 'Failed to fetch alert details: ' + (err.message || err) });
  }
});

// PATCH /api/alerts/:id/status
router.patch('/:id/status', authenticateToken, requireRole(['Fraud Analyst', 'Admin']), async (req, res) => {
  try {
    const alertId = Number(req.params.id);
    const { status, assigned_to } = req.body;
    const now = new Date().toISOString();

    await db.query(
      `UPDATE fraud_alerts SET status = COALESCE($1, status), assigned_to = COALESCE($2, assigned_to), updated_at = $3 WHERE id = $4`,
      [status, assigned_to ? Number(assigned_to) : null, now, alertId]
    );

    const updated = await db.query('SELECT * FROM fraud_alerts WHERE id = $1', [alertId]);
    const alertData = updated[0];

    broadcastAlert('ALERT_UPDATED', alertData);

    res.json(alertData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update alert status' });
  }
});

module.exports = router;
