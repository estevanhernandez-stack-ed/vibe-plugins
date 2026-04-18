const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'theaters' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'theaters', created: true }));

module.exports = router;
