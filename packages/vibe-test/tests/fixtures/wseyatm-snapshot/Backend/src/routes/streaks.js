const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'streaks' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'streaks', created: true }));

module.exports = router;
