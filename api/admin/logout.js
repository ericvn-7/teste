const { clearSession, safeMethod } = require('../../lib/auth');
module.exports = function handler(req, res) {
  if (!safeMethod(req, res, ['POST'])) return;
  clearSession(res);
  return res.status(200).json({ ok: true });
};
