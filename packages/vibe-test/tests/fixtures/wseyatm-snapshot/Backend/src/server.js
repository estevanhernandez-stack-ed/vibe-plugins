const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler.js');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use(errorHandler);

module.exports = { app };
