const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'badges' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'badges', created: true }));

module.exports = router;
