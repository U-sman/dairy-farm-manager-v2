require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/cows',     require('./routes/cows'));
app.use('/api/milk',     require('./routes/milk'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/rates',    require('./routes/rates'));
app.use('/api/health',   require('./routes/health'));
app.use('/api/buyers',   require('./routes/buyers'));
app.use('/api/backup',   require('./routes/backup'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ 
  status: 'Usman Dairy Farm API running', 
  version: '2.0.0',
  time: new Date().toISOString()
}));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
