const { dbRequest, query } = require('../../lib/db');
const { passwordMatches, setSession, safeMethod } = require('../../lib/auth');
const crypto = require('node:crypto');

module.exports = async function handler(req, res) {
  if (!safeMethod(req, res, ['POST'])) return;
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!username || !password || username.length > 50 || password.length > 200) return res.status(400).json({ error: 'Informe usuário e senha.' });
  try {
    const rows = await dbRequest(`site_admins?${query({ select: 'id,username,password_hash,slot,created_at', username: `eq.${username}`, active: 'eq.true', limit: '1' })}`);
    const admin = rows?.[0];
    if (!admin) {
      crypto.scryptSync(password, '00000000000000000000000000000000', 64);
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }
    if (!passwordMatches(password, admin.password_hash)) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    setSession(res, admin);
    return res.status(200).json({ ok: true, admin: { id: admin.id, username: admin.username, slot: admin.slot } });
  } catch (error) {
    console.error('Falha no login administrativo:', error);
    return res.status(503).json({ error: 'Não foi possível entrar. Confira a configuração do banco.' });
  }
};
