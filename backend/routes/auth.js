import express from 'express';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

// Simple in-memory user store (in production, use a proper database)
const users = new Map([
  ['admin', { password: 'admin123', role: 'admin' }],
  ['user', { password: 'user123', role: 'user' }]
]);

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users.get(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ 
      username, 
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    });

    res.json({
      token,
      user: { username, role: user.role },
      expiresIn: '24h'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (users.has(username)) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    users.set(username, { password, role });

    const token = generateToken({ 
      username, 
      role,
      iat: Math.floor(Date.now() / 1000)
    });

    res.status(201).json({
      token,
      user: { username, role },
      expiresIn: '24h'
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;
