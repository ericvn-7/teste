const state = { admin: null, orders: [], projects: [], settings: {}, orderFilter: 'todos', editingProject: null };
const $ = (selector, root = document) => root.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function dateLabel(value) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)).replace('.', '');
}
function statusLabel(value) {
  return ({ novo: 'Novo pedido', em_conversa: 'Em conversa', em_andamento: 'Em produção', concluido: 'Concluído', arquivado: 'Arquivado' })[value] || value;
}
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir esta ação.');
  return data;
}
function toast(message, error = false) {
  const node = $('#toast');
  node.textContent = message;
  node.className = `toast show${error ? ' error' : ''}`;
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => { node.className = 'toast'; }, 3200);
}
function formMessage(form, message, success = false) {
  const node = $('.form-message', form);
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('success', success);
}
function showAuth(which) {
  $('#auth-screen').hidden = false;
  $('#admin-app').hidden = true;
  $('#login-card').hidden = which !== 'login';
  $('#setup-card').hidden = which !== 'setup';
  $('#setup-error').hidden = which !== 'error';
}
function showDashboard(admin) {
  state.admin = admin;
  $('#auth-screen').hidden = true;
  $('#admin-app').hidden = false;
  $('#admin-name').textContent = admin.username;
  $('#admin-avatar').textContent = admin.username.slice(0, 1).toUpperCase();
  $('#admin-seat').textContent = `Acesso ${String(admin.slot).padStart(2, '0')}`;
  $('#profile-form').elements.username.value = admin.username;
}
async function checkSession() {
  try {
    const result = await api('/api/admin/session');
    if (result.authenticated) {
      showDashboard(result.admin);
      await loadDashboard();
    } else showAuth(result.setupRequired ? 'setup' : 'login');
  } catch (error) {
    showAuth('error');
    $('#setup-error-text').textContent = error.message;
  }
}
async function loadDashboard() {
  try {
    const [orderData, projectData, settingsData] = await Promise.all([
      api('/api/admin/orders'), api('/api/admin/projects'), api('/api/admin/settings')
    ]);
    state.orders = orderData.orders || [];
    state.projects = projectData.projects || [];
    state.settings = settingsData.settings || {};
    renderOrders();
    renderProjects();
    fillSettings();
    renderMetrics();
  } catch (error) { toast(error.message, true); }
}
function renderMetrics() {
  const fresh = state.orders.filter((order) => order.status === 'novo').length;
  const active = state.orders.filter((order) => ['em_conversa', 'em_andamento'].includes(order.status)).length;
  const done = state.orders.filter((order) => order.status === 'concluido').length;
  $('#metric-new').textContent = fresh;
  $('#metric-active').textContent = active;
  $('#metric-done').textContent = done;
  $('#nav-new-count').textContent = fresh;
}
function orderHtml(order) {
  const digits = String(order.customer_whatsapp || '').replace(/\D/g, '');
  const options = ['novo', 'em_conversa', 'em_andamento', 'concluido', 'arquivado'].map((status) => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('');
  return `<article class="order-row"><div class="order-customer"><strong>${escapeHtml(order.customer_name)}</strong><small>${escapeHtml(order.customer_whatsapp)}</small></div><div class="order-brief"><strong>${escapeHtml(order.project_title)}</strong><small>${escapeHtml(order.brief)}</small></div><time class="order-date">${dateLabel(order.created_at)}</time><div class="order-actions"><select aria-label="Situação de ${escapeHtml(order.customer_name)}" data-status-id="${escapeHtml(order.id)}">${options}</select>${digits ? `<a class="whatsapp-button" href="https://wa.me/${digits}?text=${encodeURIComponent(`Olá ${order.customer_name}, aqui é do Raiz Studio. Vi seu pedido sobre ${order.project_title}.`)}" target="_blank" rel="noopener">WhatsApp ↗</a>` : ''}</div></article>`;
}
function renderOrders() {
  const filtered = state.orderFilter === 'todos' ? state.orders : state.orders.filter((order) => order.status === state.orderFilter);
  const html = filtered.length ? filtered.map(orderHtml).join('') : '<p class="empty-message">Nenhum pedido por aqui ainda. Quando alguém enviar o formulário, ele aparecerá nesta lista.</p>';
  $('#recent-orders').innerHTML = state.orders.slice(0, 4).map(orderHtml).join('') || '<p class="empty-message">Ainda não chegaram pedidos.</p>';
  $('#all-orders').innerHTML = html;
  renderMetrics();
}
function accentFrom(project) {
  return ['mint', 'sun', 'rose', 'blue', 'ink'].includes(project.accent) ? project.accent : 'mint';
}
function renderProjects() {
  $('#admin-projects').innerHTML = state.projects.length ? state.projects.map((project) => `<article class="admin-project"><span class="project-swatch" data-accent="${accentFrom(project)}">✳</span><div class="admin-project-info"><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.category)} · ${escapeHtml(project.price_label || 'Sob consulta')}</small></div><span class="visibility-badge${project.is_visible ? '' : ' off'}">${project.is_visible ? 'NA VITRINE' : 'OCULTO'}</span><div class="row-buttons"><button type="button" data-edit-project="${escapeHtml(project.id)}">Editar</button><button type="button" class="delete" data-delete-project="${escapeHtml(project.id)}">Excluir</button></div></article>`).join('') : '<p class="empty-message">Nenhum projeto cadastrado. Adicione o primeiro exemplo da vitrine.</p>';
}
function fillSettings() {
  const form = $('#settings-form');
  for (const [key, value] of Object.entries(state.settings)) if (form.elements[key]) form.elements[key].value = key === 'brand_name' && value === 'Raiz Estúdio' ? 'Raiz Studio' : (value ?? '');
}
function openView(name) {
  document.querySelectorAll('.dashboard-view').forEach((view) => view.classList.toggle('active', view.id === `view-${name}`));
  document.querySelectorAll('.side-link').forEach((button) => button.classList.toggle('active', button.dataset.view === name));
  $('#view-title').textContent = ({ overview: 'Visão geral', orders: 'Pedidos', projects: 'Projetos', settings: 'Configurações' })[name];
}
function editProject(project = null) {
  const form = $('#project-form');
  state.editingProject = project?.id || null;
  form.reset();
  form.elements.id.value = project?.id || '';
  $('#project-editor-title').textContent = project ? 'Editar projeto' : 'Novo projeto';
  if (project) {
    for (const [key, value] of Object.entries(project)) {
      if (!form.elements[key]) continue;
      if (form.elements[key].type === 'checkbox') form.elements[key].checked = Boolean(value);
      else form.elements[key].value = value ?? '';
    }
  }
  formMessage(form, '');
  $('#project-editor').hidden = false;
  $('#project-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  formMessage(form, 'Verificando acesso…');
  try {
    const result = await api('/api/admin/login', { method: 'POST', body: { username: form.elements.username.value, password: form.elements.password.value } });
    form.reset();
    showDashboard(result.admin);
    await loadDashboard();
  } catch (error) { formMessage(form, error.message); }
  finally { button.disabled = false; }
});

$('#setup-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type=submit]');
  if (form.elements.username1.value.toLowerCase() === form.elements.username2.value.toLowerCase()) {
    formMessage(form, 'Escolha dois nomes de usuário diferentes.'); return;
  }
  button.disabled = true;
  formMessage(form, 'Criando os dois acessos…');
  try {
    const result = await api('/api/admin/setup', { method: 'POST', body: {
      setupKey: form.elements.setupKey.value,
      admins: [
        { username: form.elements.username1.value, password: form.elements.password1.value },
        { username: form.elements.username2.value, password: form.elements.password2.value }
      ]
    } });
    showDashboard(result.admin);
    await loadDashboard();
  } catch (error) { formMessage(form, error.message); }
  finally { button.disabled = false; }
});

$('#logout-button').addEventListener('click', async () => {
  try { await api('/api/admin/logout', { method: 'POST', body: {} }); } catch {}
  showAuth('login');
});
document.querySelectorAll('.side-link').forEach((button) => button.addEventListener('click', () => openView(button.dataset.view)));
document.querySelectorAll('[data-go-view]').forEach((button) => button.addEventListener('click', () => openView(button.dataset.goView)));
$('#refresh-orders').addEventListener('click', async () => { await loadDashboard(); toast('Pedidos atualizados.'); });
document.querySelectorAll('.order-filter').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('.order-filter.active')?.classList.remove('active');
  button.classList.add('active');
  state.orderFilter = button.dataset.orderFilter;
  renderOrders();
}));
document.addEventListener('change', async (event) => {
  const select = event.target.closest('[data-status-id]');
  if (!select) return;
  const old = state.orders.find((order) => order.id === select.dataset.statusId)?.status;
  try {
    const result = await api('/api/admin/orders', { method: 'PATCH', body: { id: select.dataset.statusId, status: select.value } });
    state.orders = state.orders.map((order) => order.id === result.order.id ? result.order : order);
    renderOrders();
    toast('Situação do pedido atualizada.');
  } catch (error) { select.value = old; toast(error.message, true); }
});
$('#new-project-button').addEventListener('click', () => editProject());
$('#close-project-editor').addEventListener('click', () => { $('#project-editor').hidden = true; });
$('#admin-projects').addEventListener('click', async (event) => {
  const edit = event.target.closest('[data-edit-project]');
  const remove = event.target.closest('[data-delete-project]');
  if (edit) editProject(state.projects.find((project) => project.id === edit.dataset.editProject));
  if (remove) {
    const project = state.projects.find((item) => item.id === remove.dataset.deleteProject);
    if (!project || !window.confirm(`Excluir o exemplo “${project.title}”?`)) return;
    try {
      await api(`/api/admin/projects?id=${encodeURIComponent(project.id)}`, { method: 'DELETE' });
      state.projects = state.projects.filter((item) => item.id !== project.id);
      renderProjects(); toast('Projeto excluído.');
    } catch (error) { toast(error.message, true); }
  }
});
$('#project-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type=submit]');
  const data = Object.fromEntries(new FormData(form));
  data.is_visible = form.elements.is_visible.checked;
  data.sort_order = Number(data.sort_order);
  const id = data.id;
  delete data.id;
  button.disabled = true;
  formMessage(form, 'Salvando projeto…');
  try {
    const result = await api('/api/admin/projects', { method: id ? 'PATCH' : 'POST', body: id ? { id, ...data } : data });
    if (id) state.projects = state.projects.map((project) => project.id === id ? result.project : project);
    else state.projects.push(result.project);
    renderProjects();
    $('#project-editor').hidden = true;
    toast('Projeto salvo.');
  } catch (error) { formMessage(form, error.message); }
  finally { button.disabled = false; }
});
$('#settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  formMessage(form, 'Salvando configurações…');
  try {
    const data = Object.fromEntries(new FormData(form));
    const result = await api('/api/admin/settings', { method: 'PATCH', body: data });
    state.settings = { ...state.settings, ...result.settings };
    formMessage(form, 'Configurações salvas.', true);
    toast('Site atualizado.');
  } catch (error) { formMessage(form, error.message); }
  finally { button.disabled = false; }
});
$('#profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  formMessage(form, 'Atualizando acesso…');
  try {
    const result = await api('/api/admin/profile', { method: 'PATCH', body: Object.fromEntries(new FormData(form)) });
    showDashboard(result.admin);
    form.elements.currentPassword.value = '';
    form.elements.newPassword.value = '';
    formMessage(form, 'Seu acesso foi atualizado.', true);
    toast('Acesso atualizado.');
  } catch (error) { formMessage(form, error.message); }
  finally { button.disabled = false; }
});

checkSession();
