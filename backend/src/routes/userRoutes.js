const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/dbManager');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users (Admin only)
router.get('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const users = await db.query('SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY id DESC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users (Admin creates staff or analyst accounts)
router.post('/', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing && existing.length > 0 && existing[0].id) {
      return res.status(400).json({ error: 'User email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO users (name, email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, email, password_hash, role, now, now]
    );

    const users = await db.query('SELECT id, name, email, role, created_at FROM users WHERE email = $1', [email]);
    res.status(201).json(users[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
