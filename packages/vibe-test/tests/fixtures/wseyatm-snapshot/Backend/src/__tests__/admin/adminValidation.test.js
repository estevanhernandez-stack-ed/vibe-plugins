const { requireAdmin } = require('../../middleware/adminValidation.js');

describe('requireAdmin', () => {
  it('rejects missing authorization header with 401', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    requireAdmin(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects non-admin users with 403', () => {
    const req = { headers: { authorization: 'Bearer x' }, user: { admin: false } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    requireAdmin(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next() for admin users with valid token', () => {
    const next = jest.fn();
    const req = { headers: { authorization: 'Bearer x' }, user: { admin: true } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
