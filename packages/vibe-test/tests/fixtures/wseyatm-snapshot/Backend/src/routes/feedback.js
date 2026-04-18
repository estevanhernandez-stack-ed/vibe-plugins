const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'feedback' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'feedback', created: true }));

module.exports = router;
