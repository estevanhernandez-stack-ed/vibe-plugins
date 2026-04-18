const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'search' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'search', created: true }));

module.exports = router;
