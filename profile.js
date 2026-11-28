const { dbRequest, query } = require('../../lib/db');
const { passwordHash, passwordMatches, requireAdmin, safeMethod } = require('../../lib/auth');

module.exports = requireAdmin(async function handler(req, res, admin) {
  if (!safeMethod(req, res, ['PATCH'])) return;
  const currentPassword = String(req.body?.currentPassword || '');
  const username = String(req.body?.username || admin.username).trim().toLowerCase();
  const newPassword = String(req.body?.newPassword || '');
  const displayName = String(req.body?.displayName || '').trim().slice(0, 60);
  if (username !== admin.username && !/^[a-z0-9._-]{3,24}$/.test(username)) return res.status(400).json({ error: 'O usuário deve ter de 3 a 24 letras, números, ponto, hífen ou sublinhado.' });
  if (!displayName) return res.status(400).json({ error: 'Informe o nome que será mostrado aos clientes.' });
  if (!currentPassword) return res.status(400).json({ error: 'Informe sua senha atual para confirmar a alteração.' });
  if (newPassword && (newPassword.length < 12 || newPassword.length > 200)) return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 12 caracteres.' });
  try {
    const current = await dbRequest(`site_admins?${query({ select: 'id,username,password_hash', id: `eq.${admin.id}`, active: 'eq.true', limit: '1' })}`);
    if (!current[0] || !passwordMatches(currentPassword, current[0].password_hash)) return res.status(401).json({ error: 'Sua senha atual está incorreta.' });
    const update = { username };
    if (newPassword) update.password_hash = passwordHash(newPassword);
    const rows = await dbRequest(`site_admins?${query({ id: `eq.${admin.id}` })}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: update });
    const key = `admin_name_${admin.slot}`;
    await dbRequest(`site_settings?${query({ on_conflict: 'key' })}`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: [{ key, value: displayName }] });
    return res.status(200).json({ admin: { id: rows[0].id, username: rows[0].username, slot: rows[0].slot, displayName } });
  } catch (error) {
    if (error.status === 409 || error.code === '23505') return res.status(409).json({ error: 'Esse nome de usuário já está em uso.' });
    console.error('Falha ao atualizar perfil:', error);
    return res.status(503).json({ error: 'Não foi possível salvar suas alterações.' });
  }
});
