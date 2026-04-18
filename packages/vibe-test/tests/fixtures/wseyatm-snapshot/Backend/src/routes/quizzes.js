const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => res.json({ ok: true, route: 'quizzes' }));
router.post('/', (_req, res) => res.json({ ok: true, route: 'quizzes', created: true }));

module.exports = router;
