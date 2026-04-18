const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'movies' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'movies', created: true }));

module.exports = router;
