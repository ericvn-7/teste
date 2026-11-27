const { dbRequest, query } = require('../../lib/db');
const { requireAdmin, safeMethod } = require('../../lib/auth');
const ALLOWED = ['brand_name', 'tagline', 'whatsapp', 'whatsapp_secondary', 'instagram_url', 'contact_email'];

module.exports = requireAdmin(async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = await dbRequest(`site_settings?${query({ select: 'key,value' })}`);
    return res.status(200).json({ settings: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
  }
  if (req.method === 'PATCH') {
    const input = req.body || {};
    const rows = [];
    for (const key of ALLOWED) {
      if (input[key] === undefined) continue;
      let value = String(input[key] ?? '').trim();
      const max = key === 'tagline' ? 240 : 180;
      value = value.slice(0, max);
      if (key.startsWith('whatsapp') && value && !/^\+?[0-9 ()-]{10,24}$/.test(value)) return res.status(400).json({ error: 'Informe os WhatsApps com DDI e DDD, por exemplo +55 11 99999-9999.' });
      if (key === 'instagram_url' && value) {
        try { const url = new URL(value); if (url.protocol !== 'https:') throw new Error(); }
        catch { return res.status(400).json({ error: 'O link do Instagram deve começar com https://.' }); }
      }
      if (key === 'contact_email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return res.status(400).json({ error: 'Informe um e-mail válido.' });
      rows.push({ key, value });
    }
    if (!rows.length) return res.status(400).json({ error: 'Nenhuma configuração para salvar.' });
    const saved = await dbRequest(`site_settings?${query({ on_conflict: 'key' })}`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: rows });
    return res.status(200).json({ settings: Object.fromEntries(saved.map((row) => [row.key, row.value])) });
  }
  return safeMethod(req, res, ['GET', 'PATCH']);
});
