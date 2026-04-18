const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'tickets' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'tickets', created: true }));

module.exports = router;
