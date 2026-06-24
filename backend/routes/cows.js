const router = require('express').Router();
const { Cow } = require('../db');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try { res.json(await Cow.find().sort({ name: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const cow = await Cow.findById(req.params.id);
    if (!cow) return res.status(404).json({ error: 'Not found' });
    res.json(cow);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const id = req.body.id || String(Date.now());
    const cow = await Cow.create({ ...req.body, _id: id });
    res.status(201).json(cow);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const cow = await Cow.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cow) return res.status(404).json({ error: 'Not found' });
    res.json(cow);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Cow.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
