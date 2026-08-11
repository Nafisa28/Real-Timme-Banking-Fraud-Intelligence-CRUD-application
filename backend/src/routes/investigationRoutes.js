const express = require('express');
const db = require('../db/dbManager');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { broadcastAlert } = require('../services/websocket');

const router = express.Router();

// POST /api/investigations — Submit Investigation Note & Outcome Resolution
router.post('/', authenticateToken, requireRole(['Fraud Analyst', 'Admin']), async (req, res) => {
  try {
    const { alert_id, notes, outcome } = req.body;
    if (!alert_id || !outcome) {
      return res.status(400).json({ error: 'Alert ID and outcome resolution are required' });
    }

    if (!['CONFIRMED_FRAUD', 'FALSE_POSITIVE'].includes(outcome)) {
      return res.status(400).json({ error: "Outcome must be 'CONFIRMED_FRAUD' or 'FALSE_POSITIVE'" });
    }

    const numAlertId = Number(alert_id);
    const finalNotes = (notes && notes.trim()) ? notes.trim() : (
      outcome === 'CONFIRMED_FRAUD' 
        ? 'Confirmed unauthorized high-risk fraudulent transaction. Transaction blocked and case closed.'
        : 'Customer verified and confirmed transaction is legitimate. Case marked as false positive.'
    );

    const now = new Date().toISOString();
    const analystId = req.user.id;

    await db.query(
      `INSERT INTO investigations (alert_id, analyst_id, notes, outcome, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [numAlertId, analystId, finalNotes, outcome, now]
    );

    const notesRes = await db.query('SELECT * FROM investigations WHERE alert_id = $1 ORDER BY id DESC LIMIT 1', [numAlertId]);
    const insertedNote = notesRes[0];

    await db.query(
      `UPDATE fraud_alerts SET status = 'RESOLVED', assigned_to = $1, updated_at = $2 WHERE id = $3`,
      [analystId, now, numAlertId]
    );

    const alerts = await db.query('SELECT * FROM fraud_alerts WHERE id = $1', [numAlertId]);
    const alert = alerts[0];
    if (alert && alert.transaction_id) {
      const newTxnStatus = outcome === 'CONFIRMED_FRAUD' ? 'REJECTED' : 'APPROVED';
      await db.query('UPDATE transactions SET status = $1 WHERE id = $2', [newTxnStatus, Number(alert.transaction_id)]);
    }

    db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [analystId, 'RESOLVE_INVESTIGATION', 'FRAUD_ALERT', String(numAlertId), JSON.stringify({ outcome, notes: finalNotes }), now]
    );

    broadcastAlert('ALERT_RESOLVED', { id: numAlertId, status: 'RESOLVED', outcome, updated_at: now });

    res.status(201).json({
      message: `Alert successfully resolved as ${outcome}`,
      investigation: insertedNote,
      alert: { id: numAlertId, status: 'RESOLVED', outcome }
    });
  } catch (err) {
    console.error('Error submitting investigation:', err);
    res.status(500).json({ error: 'Failed to record investigation decision: ' + (err.message || err) });
  }
});

module.exports = router;
