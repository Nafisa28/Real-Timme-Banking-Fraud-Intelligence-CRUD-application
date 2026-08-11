const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/dbManager');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { upsertRow } = require('../db/supabaseSync');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing && existing.length > 0 && existing[0].id) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const assignedRole = ['Admin', 'Fraud Analyst', 'Bank Staff'].includes(role) ? role : 'Bank Staff';
    const now = new Date().toISOString();

    // Save to local AlaSQL DB
    await db.query(
      `INSERT INTO users (name, email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, email, password_hash, assignedRole, now, now]
    );

    // Fetch saved user with ID
    const users = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = users[0];

    // Sync to Supabase cloud immediately (non-blocking)
    if (user) {
      upsertRow('users', user).catch(err =>
        console.error('[Supabase] Failed to sync new user:', err.message)
      );
    }

    // Return success without token — user must verify email before logging in
    res.status(201).json({
      message: 'Account created. Please verify your email before logging in.',
      email
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = users[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userData = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = generateToken(userData);

    // Sync latest user record to Supabase on every login (keeps it up-to-date)
    upsertRow('users', user).catch(() => {});

    res.json({ token, user: userData });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
