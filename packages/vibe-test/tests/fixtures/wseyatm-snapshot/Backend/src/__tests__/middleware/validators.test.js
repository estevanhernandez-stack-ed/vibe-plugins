const { validateEmail, validateUserId, validateMovieId } = require('../../middleware/validators.js');

describe('validators', () => {
  it('validateEmail accepts strings with @', () => {
    expect(validateEmail('a@b.c')).toBe(true);
    expect(validateEmail('nope')).toBe(false);
  });

  it('validateUserId rejects empty + overlong ids', () => {
    expect(validateUserId('')).toBe(false);
    expect(validateUserId('x')).toBe(true);
    expect(validateUserId('y'.repeat(200))).toBe(false);
  });

  it('validateMovieId matches allowed chars', () => {
    expect(validateMovieId('dune-2')).toBe(true);
    expect(validateMovieId('has spaces')).toBe(false);
  });
});
