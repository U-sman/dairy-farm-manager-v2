const router = require('express').Router();
const { Cow, Milk, Expense, Rate, Health, Buyer } = require('../db');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/backup — download full database as JSON
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const [cows, milk, expenses, rates, health, buyers] = await Promise.all([
      Cow.find(), Milk.find(), Expense.find(), Rate.find(), Health.find(), Buyer.find()
    ]);
    const backup = {
      exportDate: new Date().toISOString(),
      farmName: 'Usman Dairy Farm',
      cows, milk, expenses, rates, health, buyers
    };
    res.setHeader('Content-Disposition', `attachment; filename=usman-dairy-backup-${new Date().toISOString().slice(0,10)}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/backup/restore — restore from JSON backup
router.post('/restore', protect, adminOnly, async (req, res) => {
  try {
    const { cows, milk, expenses, rates, health, buyers } = req.body;
    if (cows?.length) { await Cow.deleteMany({}); await Cow.insertMany(cows); }
    if (milk?.length) { await Milk.deleteMany({}); await Milk.insertMany(milk); }
    if (expenses?.length) { await Expense.deleteMany({}); await Expense.insertMany(expenses); }
    if (rates?.length) { await Rate.deleteMany({}); await Rate.insertMany(rates); }
    if (health?.length) { await Health.deleteMany({}); await Health.insertMany(health); }
    if (buyers?.length) { await Buyer.deleteMany({}); await Buyer.insertMany(buyers); }
    res.json({ success: true, message: 'Data restored successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
