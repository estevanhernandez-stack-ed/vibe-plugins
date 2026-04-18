const { errorHandler } = require('../../middleware/errorHandler.js');

describe('errorHandler', () => {
  it('returns status from err.status when present', () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    errorHandler({ status: 418, message: 'tea' }, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({ error: 'tea' });
  });

  it('defaults to 500 when err.status missing', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(new Error('boom'), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
