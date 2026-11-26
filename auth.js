const crypto = require('node:crypto');
const { dbRequest, query } = require('./db');

function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function passwordMatches(password, stored) {
  const [algorithm, salt, hash] = String(stored || '').split(':');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
}

function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET precisa ter pelo menos 32 caracteres.');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verify(token) {
  try {
    const [body, signature] = String(token || '').split('.');
    if (!body || !signature) return null;
    const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET || '').update(body).digest();
    const received = Buffer.from(signature, 'base64url');
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.sub || payload.exp <= Date.now()) return null;
    return payload;
  } catch { return null; }
}

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? ['', ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function setSession(res, admin) {
  const token = sign({ sub: admin.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `studio_admin=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800${secure}`);
}

function clearSession(res) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `studio_admin=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`);
}

async function currentAdmin(req) {
  const payload = verify(cookies(req).studio_admin);
  if (!payload) return null;
  const rows = await dbRequest(`site_admins?${query({ select: 'id,username,slot,created_at', id: `eq.${payload.sub}`, active: 'eq.true', limit: '1' })}`);
  return rows?.[0] || null;
}

function requireAdmin(handler) {
  return async function protectedHandler(req, res) {
    try {
      const admin = await currentAdmin(req);
      if (!admin) return res.status(401).json({ error: 'Entre novamente para continuar.' });
      return await handler(req, res, admin);
    } catch (error) {
      console.error('Falha ao validar sessão:', error);
      return res.status(503).json({ error: 'Não foi possível validar o acesso. Confira a configuração do banco.' });
    }
  };
}

function safeMethod(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader('Allow', methods.join(', '));
  res.status(405).json({ error: 'Método não permitido.' });
  return false;
}

module.exports = { passwordHash, passwordMatches, sign, verify, setSession, clearSession, currentAdmin, requireAdmin, safeMethod };
