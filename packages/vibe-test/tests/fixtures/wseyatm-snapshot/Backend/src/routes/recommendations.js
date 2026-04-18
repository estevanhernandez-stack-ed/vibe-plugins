const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'recommendations' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'recommendations', created: true }));

module.exports = router;
