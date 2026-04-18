const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'stats' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'stats', created: true }));

module.exports = router;
