function requireAdmin(req, res, next) {
  const token = req.headers?.authorization;
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  if (!req.user || req.user.admin !== true) {
    return res.status(403).json({ error: 'Admin required' });
  }
  return next();
}

module.exports = { requireAdmin };
