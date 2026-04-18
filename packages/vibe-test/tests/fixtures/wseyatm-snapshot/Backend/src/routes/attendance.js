const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'attendance' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'attendance', created: true }));

module.exports = router;
