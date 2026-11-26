import { next } from '@vercel/functions';

const ADMIN_PATHS = new Set(['/admin', '/admin/', '/admin.html', '/admin.js', '/admin.css']);

function unauthorized(message = 'Acesso restrito.') {
  return new Response(message, {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Raiz Studio — Administração", charset="UTF-8"' }
  });
}

export default function middleware(request) {
  const { pathname } = new URL(request.url);
  if (!ADMIN_PATHS.has(pathname)) return;

  const username = process.env.ADMIN_GATE_USER;
  const password = process.env.ADMIN_GATE_PASSWORD;
  if (!username || !password) return new Response('A proteção do painel ainda não foi configurada.', { status: 503 });

  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Basic ')) return unauthorized();

  let credentials = '';
  try { credentials = Buffer.from(authorization.slice(6), 'base64').toString('utf8'); } catch { return unauthorized(); }
  if (credentials !== `${username}:${password}`) return unauthorized('Usuário ou senha da área restrita inválidos.');

  return next();
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/admin', '/admin/', '/admin.html', '/admin.js', '/admin.css']
};
