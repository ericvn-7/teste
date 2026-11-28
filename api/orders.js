const { dbRequest, query } = require('../lib/db');

function clean(value, max) { return String(value || '').trim().slice(0, max); }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  const name = clean(req.body?.name, 100);
  const whatsapp = clean(req.body?.whatsapp, 30);
  const recipient = req.body?.whatsappRecipient === 'secondary' ? 'secondary' : 'primary';
  const projectTitle = clean(req.body?.projectTitle, 120) || 'Ainda estou pensando';
  const brief = clean(req.body?.brief, 2000);
  if (name.length < 2 || whatsapp.replace(/\D/g, '').length < 10 || brief.length < 12 || req.body?.consent !== 'on') {
    return res.status(400).json({ error: 'Confira seu nome, WhatsApp e descrição do projeto.' });
  }
  try {
    const settingsRows = await dbRequest(`site_settings?${query({ select: 'key,value', key: 'in.(whatsapp,whatsapp_secondary)' })}`);
    const settings = Object.fromEntries((settingsRows || []).map((row) => [row.key, row.value]));
    const number = String(recipient === 'secondary' ? settings.whatsapp_secondary : (settings.whatsapp || process.env.WHATSAPP_NUMBER || '')).replace(/\D/g, '');
    if (number.length < 10) return res.status(503).json({ error: 'O WhatsApp do estúdio ainda não foi configurado. Tente novamente mais tarde.' });
    const rows = await dbRequest('orders', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: { customer_name: name, customer_whatsapp: whatsapp, project_title: projectTitle, brief, status: 'novo' }
    });
    const message = [
      'Olá! Quero conversar sobre um projeto de site.',
      `Nome: ${name}`,
      `Meu WhatsApp: ${whatsapp}`,
      `Projeto: ${projectTitle}`,
      `Minha ideia: ${brief}`,
      `Protocolo: ${rows?.[0]?.id || 'novo pedido'}`
    ].join('\n');
    return res.status(201).json({ ok: true, whatsappUrl: `https://wa.me/${number}?text=${encodeURIComponent(message)}` });
  } catch (error) {
    console.error('Falha ao registrar pedido:', error);
    return res.status(503).json({ error: 'Não foi possível registrar o pedido agora. Tente novamente em instantes.' });
  }
};
