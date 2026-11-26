const { dbRequest, query } = require('../../lib/db');
const { currentAdmin, safeMethod } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (!safeMethod(req, res, ['GET'])) return;
  try {
    const rows = await dbRequest(`site_admins?${query({ select: 'id,username,slot,created_at', order: 'slot.asc' })}`);
    const admin = await currentAdmin(req);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ authenticated: Boolean(admin), admin: admin || null, setupRequired: rows.length === 0 });
  } catch (error) {
    console.error('Falha ao carregar sessão:', error);
    return res.status(503).json({ error: 'Configure o banco de dados antes de acessar o painel.' });
  }
};
