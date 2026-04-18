const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'notifications' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'notifications', created: true }));

module.exports = router;
