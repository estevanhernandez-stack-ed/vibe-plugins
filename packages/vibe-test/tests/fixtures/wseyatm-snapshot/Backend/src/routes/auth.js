const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'auth' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'auth', created: true }));

module.exports = router;
