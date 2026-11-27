const { dbRequest, query } = require('../../lib/db');
const { requireAdmin, safeMethod } = require('../../lib/auth');
const STATUSES = ['novo', 'em_conversa', 'em_andamento', 'concluido', 'arquivado'];

module.exports = requireAdmin(async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = await dbRequest(`orders?${query({ select: '*', order: 'created_at.desc' })}`);
    return res.status(200).json({ orders: rows });
  }
  if (req.method === 'PATCH') {
    const id = String(req.body?.id || '');
    const status = String(req.body?.status || '');
    if (!/^[0-9a-f-]{36}$/i.test(id) || !STATUSES.includes(status)) return res.status(400).json({ error: 'Pedido ou situação inválidos.' });
    const rows = await dbRequest(`orders?${query({ id: `eq.${id}` })}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { status, updated_at: new Date().toISOString() } });
    if (!rows?.length) return res.status(404).json({ error: 'Pedido não encontrado.' });
    return res.status(200).json({ order: rows[0] });
  }
  return safeMethod(req, res, ['GET', 'PATCH']);
});
