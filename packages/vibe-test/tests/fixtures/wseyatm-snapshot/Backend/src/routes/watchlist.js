const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'watchlist' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'watchlist', created: true }));

module.exports = router;
