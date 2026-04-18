// Firebase Functions entry. The real WSYATM lazy-imports route groups; this
// fixture keeps it minimal (+ deliberately does not import most of
// src/routes/*, reinforcing the cherry-picked-denominator shape at the static
// level too).
const functions = require('firebase-functions');
const { app } = require('./server.js');

exports.api = functions.https.onRequest(app);
