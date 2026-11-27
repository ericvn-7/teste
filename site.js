const { dbRequest, query } = require('../lib/db');
const demoProjects = require('../data/demo-projects.json');

const defaults = {
  brand_name: 'Raiz Estúdio',
  tagline: 'Criamos sites rápidos, bonitos e pensados para transformar visitas em conversas.',
  whatsapp: '',
  instagram_url: '',
  contact_email: ''
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  try {
    const [projectRows, settingsRows] = await Promise.all([
      dbRequest(`projects?${query({ select: '*', is_visible: 'eq.true', order: 'sort_order.asc,created_at.desc' })}`),
      dbRequest(`site_settings?${query({ select: 'key,value' })}`)
    ]);
    const settings = { ...defaults };
    for (const item of settingsRows || []) settings[item.key] = item.value;
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=30');
    return res.status(200).json({ projects: projectRows?.length ? projectRows : demoProjects, settings });
  } catch (error) {
    console.error('Falha ao carregar vitrine:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ projects: demoProjects, settings: defaults, setupRequired: true });
  }
};
