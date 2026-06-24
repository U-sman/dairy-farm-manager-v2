const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../db');

const SECRET = process.env.JWT_SECRET || 'usman_dairy_secret_2024';

// POST /api/auth/setup — first-time admin creation
router.post('/setup', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) return res.status(400).json({ error: 'Setup already done' });
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      _id: 'admin',
      username: req.body.username || 'admin',
      password: hash,
      role: 'admin',
      farmName: 'Usman Dairy Farm'
    });
    const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, SECRET, { expiresIn: '30d' });
    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, SECRET, { expiresIn: '30d' });
    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/add-viewer — admin adds viewer
router.post('/add-viewer', async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      _id: 'v' + Date.now(),
      username: req.body.username,
      password: hash,
      role: 'viewer'
    });
    res.json({ username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/check
router.get('/check', async (req, res) => {
  const count = await User.countDocuments();
  res.json({ setupDone: count > 0 });
});

module.exports = router;
