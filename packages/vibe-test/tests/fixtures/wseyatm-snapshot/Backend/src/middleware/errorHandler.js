function errorHandler(err, _req, res, _next) {
  const status = typeof err.status === 'number' ? err.status : 500;
  const message = typeof err.message === 'string' ? err.message : 'Internal error';
  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
