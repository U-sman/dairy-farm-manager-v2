const router = require('express').Router();
const { Health } = require('../db');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.cowId) filter.cowId = req.query.cowId;
    if (req.query.type) filter.type = req.query.type;
    res.json(await Health.find(filter).sort({ date: -1 }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get upcoming/overdue records
router.get('/upcoming', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const in30ISO = in30.toISOString().slice(0,10);
    const records = await Health.find({
      nextDueDate: { $lte: in30ISO },
      nextDueDate: { $exists: true, $ne: '' }
    }).sort({ nextDueDate: 1 });
    res.json(records);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const id = 'h' + Date.now();
    const record = await Health.create({ ...req.body, _id: id });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const record = await Health.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Health.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
