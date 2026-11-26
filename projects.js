const { dbRequest, query } = require('../../lib/db');
const { requireAdmin, safeMethod } = require('../../lib/auth');
const CATEGORIES = ['Institucional', 'Loja virtual', 'Landing page'];

function safeUrl(value, required = false) {
  const input = String(value || '').trim();
  if (!input) return required ? null : '';
  try {
    const url = new URL(input);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch { return null; }
}
function makeSlug(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}
function payload(body, partial = false) {
  const output = {};
  const fields = ['title', 'category', 'description', 'price_label', 'badge', 'mock_title', 'accent'];
  for (const field of fields) {
    if (partial && body[field] === undefined) continue;
    output[field] = String(body[field] || '').trim().slice(0, field === 'description' ? 500 : 160);
  }
  if (!partial || body.slug !== undefined) output.slug = makeSlug(body.slug || body.title);
  if (!partial || body.demo_url !== undefined) {
    output.demo_url = safeUrl(body.demo_url);
    if (output.demo_url === null) throw new Error('O link de demonstração deve começar com https://.');
  }
  if (!partial || body.image_url !== undefined) {
    output.image_url = safeUrl(body.image_url);
    if (output.image_url === null) throw new Error('O link da imagem deve começar com https://.');
  }
  if (!partial || body.is_visible !== undefined) output.is_visible = body.is_visible === true || body.is_visible === 'on';
  if (!partial || body.sort_order !== undefined) output.sort_order = Math.max(0, Math.min(999, Number(body.sort_order) || 0));
  if (!partial) output.created_at = new Date().toISOString();
  return output;
}
function validate(project, partial = false) {
  if (!partial && (!project.title || !project.description || !project.slug)) throw new Error('Preencha título e descrição do projeto.');
  if (project.category && !CATEGORIES.includes(project.category)) throw new Error('Escolha uma categoria válida.');
  if (project.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) throw new Error('Use letras, números e hífens no identificador.');
}

module.exports = requireAdmin(async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = await dbRequest(`projects?${query({ select: '*', order: 'sort_order.asc,created_at.desc' })}`);
    return res.status(200).json({ projects: rows });
  }
  if (req.method === 'POST') {
    try {
      const project = payload(req.body || {});
      validate(project);
      const rows = await dbRequest('projects', { method: 'POST', headers: { Prefer: 'return=representation' }, body: project });
      return res.status(201).json({ project: rows[0] });
    } catch (error) { return res.status(400).json({ error: error.message || 'Não foi possível salvar o projeto.' }); }
  }
  if (req.method === 'PATCH') {
    const id = String(req.body?.id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Projeto inválido.' });
    try {
      const project = payload(req.body || {}, true);
      validate(project, true);
      const rows = await dbRequest(`projects?${query({ id: `eq.${id}` })}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: project });
      if (!rows?.length) return res.status(404).json({ error: 'Projeto não encontrado.' });
      return res.status(200).json({ project: rows[0] });
    } catch (error) { return res.status(400).json({ error: error.message || 'Não foi possível atualizar o projeto.' }); }
  }
  if (req.method === 'DELETE') {
    const id = String(req.query.id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Projeto inválido.' });
    await dbRequest(`projects?${query({ id: `eq.${id}` })}`, { method: 'DELETE' });
    return res.status(204).end();
  }
  return safeMethod(req, res, ['GET', 'POST', 'PATCH', 'DELETE']);
});
