const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'admin' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'admin', created: true }));

module.exports = router;
