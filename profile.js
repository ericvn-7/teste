const { dbRequest, query } = require('../../lib/db');
const { passwordHash, requireAdmin, safeMethod } = require('../../lib/auth');

module.exports = requireAdmin(async function handler(req, res, admin) {
  if (!safeMethod(req, res, ['PATCH'])) return;
  const displayName = String(req.body?.displayName || '').trim().slice(0, 60);
  const changePassword = req.body?.changePassword === true;
  const newPassword = String(req.body?.newPassword || '');
  const confirmPassword = String(req.body?.confirmPassword || '');
  if (displayName.length < 2) return res.status(400).json({ error: 'Informe um nome de atendimento com pelo menos 2 caracteres.' });
  if (changePassword && newPassword.length < 12) return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 12 caracteres.' });
  if (changePassword && newPassword !== confirmPassword) return res.status(400).json({ error: 'As duas senhas não são iguais.' });

  try {
    const key = `admin_name_${admin.slot}`;
    await dbRequest(`site_settings?${query({ on_conflict: 'key' })}`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: [{ key, value: displayName }]
    });
    if (changePassword) {
      await dbRequest(`site_admins?${query({ id: `eq.${admin.id}` })}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: { password_hash: passwordHash(newPassword) }
      });
    }
    return res.status(200).json({ admin: { id: admin.id, username: admin.username, slot: admin.slot, displayName }, passwordChanged: changePassword });
  } catch (error) {
    console.error('Falha ao salvar nome de atendimento:', error);
    return res.status(503).json({ error: 'Não foi possível salvar o nome de atendimento.' });
  }
});
