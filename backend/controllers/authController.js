const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const { rows: [user] } = await query(
      `SELECT * FROM users WHERE email = $1 AND is_active = TRUE`, [email]
    );
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.register = async (req, res) => {
  const { name, email, password, role = 'waiter' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const hashed = await bcrypt.hash(password, 12);
    const { rows: [user] } = await query(
      `INSERT INTO users (id, name, email, password, role) VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, email, role, created_at`,
      [uuidv4(), name, email, hashed, role]
    );
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.me = async (req, res) => {
  try {
    const { rows: [user] } = await query(
      `SELECT id, name, email, role, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};
