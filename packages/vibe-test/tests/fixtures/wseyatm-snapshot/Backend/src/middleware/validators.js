function validateEmail(email) {
  return typeof email === 'string' && /@/.test(email);
}

function validateUserId(userId) {
  return typeof userId === 'string' && userId.length > 0 && userId.length < 128;
}

function validateMovieId(movieId) {
  return typeof movieId === 'string' && /^[a-z0-9-]{1,64}$/i.test(movieId);
}

module.exports = { validateEmail, validateUserId, validateMovieId };
