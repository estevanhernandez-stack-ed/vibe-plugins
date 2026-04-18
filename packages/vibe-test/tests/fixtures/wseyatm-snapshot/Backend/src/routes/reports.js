const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'reports' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'reports', created: true }));

module.exports = router;
