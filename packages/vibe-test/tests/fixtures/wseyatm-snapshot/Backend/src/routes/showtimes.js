const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'showtimes' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'showtimes', created: true }));

module.exports = router;
