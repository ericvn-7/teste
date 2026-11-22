function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Banco de dados não configurado.');
  return { url: url.replace(/\/$/, ''), key };
}

async function dbRequest(path, options = {}) {
  const { url, key } = config();
  const headers = { apikey: key, Accept: 'application/json', ...(options.headers || {}) };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const detail = data && typeof data === 'object' ? (data.message || data.details || data.hint) : data;
    const error = new Error(detail || `Erro no banco de dados (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function query(params) { return new URLSearchParams(params).toString(); }

module.exports = { dbRequest, query };
