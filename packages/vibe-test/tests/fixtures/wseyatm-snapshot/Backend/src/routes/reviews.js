const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'reviews' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'reviews', created: true }));

module.exports = router;
