const { dbRequest, query } = require('../../lib/db');
const { passwordHash, setSession, safeMethod } = require('../../lib/auth');

function normalizedUser(value) { return String(value || '').trim().toLowerCase(); }
function validUser(value) { return /^[a-z0-9._-]{3,24}$/.test(value); }
function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && require('node:crypto').timingSafeEqual(left, right);
}

module.exports = async function handler(req, res) {
  if (!safeMethod(req, res, ['POST'])) return;
  const requiredKey = process.env.ADMIN_SETUP_KEY;
  if (!requiredKey || !safeEqual(req.body?.setupKey, requiredKey)) return res.status(403).json({ error: 'Chave de configuração inválida.' });
  const accounts = req.body?.admins;
  if (!Array.isArray(accounts) || accounts.length !== 2) return res.status(400).json({ error: 'Cadastre exatamente os dois administradores.' });
  const normalized = accounts.map((item) => ({ username: normalizedUser(item.username), password: String(item.password || '') }));
  if (normalized.some((item) => !validUser(item.username))) return res.status(400).json({ error: 'Use nomes de usuário com 3 a 24 letras, números, ponto, hífen ou sublinhado.' });
  if (normalized[0].username === normalized[1].username) return res.status(400).json({ error: 'Os dois nomes de usuário devem ser diferentes.' });
  if (normalized.some((item) => item.password.length < 12 || item.password.length > 200)) return res.status(400).json({ error: 'Cada senha deve ter pelo menos 12 caracteres.' });
  try {
    const existing = await dbRequest(`site_admins?${query({ select: 'id', limit: '1' })}`);
    if (existing.length) return res.status(409).json({ error: 'O painel já foi configurado. Entre com uma das contas administradoras.' });
    const rows = await dbRequest('site_admins', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: normalized.map((item, index) => ({ username: item.username, password_hash: passwordHash(item.password), slot: index + 1, active: true }))
    });
    setSession(res, rows[0]);
    return res.status(201).json({ ok: true, admin: { id: rows[0].id, username: rows[0].username, slot: rows[0].slot } });
  } catch (error) {
    console.error('Falha ao configurar administradores:', error);
    return res.status(503).json({ error: 'Não foi possível configurar as contas. Confira o banco e tente novamente.' });
  }
};
