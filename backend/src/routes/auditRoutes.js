const express = require('express');
const db = require('../db/dbManager');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit-logs — Exportable Audit Logs
router.get('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const logs = await db.query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
