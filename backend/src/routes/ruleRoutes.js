const express = require('express');
const db = require('../db/dbManager');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/rules — List Configurable Fraud Rules
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rules = await db.query('SELECT * FROM fraud_rules ORDER BY id ASC');
    const parsed = rules.map(r => {
      let p = {};
      try {
        p = typeof r.parameters === 'string' ? JSON.parse(r.parameters) : (r.parameters || {});
      } catch (e) {}
      return { ...r, parameters: p };
    });
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fraud detection rules' });
  }
});

// PUT /api/rules/:id — Admin adjusts Rule Weight, Threshold, and Active state live
router.put('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const id = req.params.id;
    const { weight, threshold, is_active, description } = req.body;
    const now = new Date().toISOString();

    const existing = await db.query('SELECT * FROM fraud_rules WHERE id = $1', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const newWeight = weight !== undefined ? Number(weight) : existing[0].weight;
    const newThreshold = threshold !== undefined ? Number(threshold) : existing[0].threshold;
    const newActive = is_active !== undefined ? (is_active ? 1 : 0) : existing[0].is_active;
    const newDesc = description || existing[0].description;

    await db.query(
      `UPDATE fraud_rules SET weight = $1, threshold = $2, is_active = $3, description = $4, updated_at = $5 WHERE id = $6`,
      [newWeight, newThreshold, newActive, newDesc, now, id]
    );

    db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'UPDATE_FRAUD_RULE', 'FRAUD_RULE', String(id), JSON.stringify({ weight: newWeight, threshold: newThreshold, is_active: newActive }), now]
    );

    const updated = await db.query('SELECT * FROM fraud_rules WHERE id = $1', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating fraud rule:', err);
    res.status(500).json({ error: 'Failed to update fraud rule configuration' });
  }
});

module.exports = router;
