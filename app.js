const projectGrid = document.querySelector('#project-grid');
const projectSelect = document.querySelector('#project-select');
const orderDialog = document.querySelector('#order-dialog');
let projects = [];
let settings = {};
let activeFilter = 'Todos';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function errorMessage(error, fallback = 'Algo deu errado. Tente novamente.') {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const nested = [error.message, error.error, error.details, error.hint].find((value) => typeof value === 'string' && value.trim());
    return nested || fallback;
  }
  return fallback;
}

function accentFrom(project) {
  if (['sun', 'rose', 'blue', 'ink', 'violet', 'sand'].includes(project.accent)) return project.accent;
  const options = ['mint', 'sun', 'rose', 'blue', 'violet', 'sand'];
  let n = 0;
  for (const char of String(project.slug || project.title)) n += char.charCodeAt(0);
  return options[n % options.length];
}

function renderProjects() {
  const visible = projects.filter((project) => activeFilter === 'Todos' || project.category === activeFilter);
  if (!visible.length) {
    projectGrid.innerHTML = '<p class="empty-projects">Ainda não há exemplos nesta categoria.</p>';
    return;
  }
  projectGrid.innerHTML = visible.map((project, index) => {
    const accent = accentFrom(project);
    const image = project.image_url ? `<img src="${escapeHtml(project.image_url)}" alt="Prévia de ${escapeHtml(project.title)}" loading="lazy">` : '';
    const mock = `<div class="browser-mock"><div class="mock-version"><span>●</span><span>●</span><span>●</span><b>VERSÃO 0${(index % 3) + 1}</b></div><span class="mock-tag">${escapeHtml(project.category.toUpperCase())}</span><div class="mock-title">${escapeHtml(project.mock_title || project.title).replace(/&lt;br\s*\/?&gt;/gi, ' ')}</div><div class="mock-pill"></div><div class="mock-shape"></div><span class="mock-page-count">01 — 03</span></div>`;
    const preview = project.demo_url ? `<a href="${escapeHtml(project.demo_url)}" target="_blank" rel="noopener noreferrer">Ver demonstração <span>↗</span></a>` : `<button type="button" data-request="${escapeHtml(project.title)}">Quero algo assim <span>↗</span></button>`;
    return `<article class="project-card" style="animation-delay:${index * 60}ms"><div class="project-art" data-accent="${accent}">${image || mock}<span class="project-badge">${escapeHtml(project.badge || 'PROJETO CONCEITUAL')}</span></div><div class="project-info"><span class="project-category">${escapeHtml(project.category)}</span><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.description)}</p><div class="project-meta"><span>${escapeHtml(project.price_label || 'Orçamento sob consulta')}</span>${preview}</div></div></article>`;
  }).join('');
}

function applySettings() {
  const configuredName = settings.brand_name || 'Raiz Studio';
  const name = configuredName === 'Raiz Estúdio' ? 'Raiz Studio' : configuredName;
  document.querySelector('#hero-tagline').textContent = settings.tagline || 'Criamos sites rápidos, bonitos e pensados para transformar visitas em conversas.';
  const secondaryPhone = String(settings.whatsapp_secondary || '').replace(/\D/g, '');
  const recipientField = document.querySelector('#whatsapp-recipient-field');
  const recipientSelect = document.querySelector('#whatsapp-recipient');
  if (recipientField && recipientSelect) {
    recipientField.hidden = secondaryPhone.length < 10;
    recipientSelect.options[0].textContent = settings.admin_name_1 || 'Atendimento 1';
    recipientSelect.options[1].textContent = settings.admin_name_2 || 'Atendimento 2';
    if (secondaryPhone.length < 10) recipientSelect.value = 'primary';
  }
  document.querySelectorAll('.whatsapp-link').forEach((link) => {
    const phone = String(settings.whatsapp || '').replace(/\D/g, '');
    if (phone.length >= 10) {
      link.href = `https://wa.me/${phone}?text=${encodeURIComponent('Olá! Vi os projetos e quero conversar sobre um site.')}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else {
      link.href = '#pedido';
    }
  });
  const instagram = document.querySelector('#instagram-link');
  const email = document.querySelector('#email-link');
  if (settings.instagram_url) { instagram.href = settings.instagram_url; instagram.hidden = false; } else instagram.hidden = true;
  if (settings.contact_email) { email.href = `mailto:${encodeURIComponent(settings.contact_email)}`; email.hidden = false; } else email.hidden = true;
  document.title = `${name} — Sites feitos para crescer`;
}

function openOrder(selected = '') {
  if (selected) projectSelect.value = selected;
  orderDialog.showModal();
}

async function loadSite() {
  try {
    const response = await fetch('/api/site', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Não foi possível carregar os projetos.');
    const data = await response.json();
    projects = data.projects || [];
    settings = data.settings || {};
    applySettings();
    projectSelect.innerHTML = '<option value="">Ainda estou pensando</option>' + projects.map((p) => `<option value="${escapeHtml(p.title)}">${escapeHtml(p.title)}</option>`).join('');
    renderProjects();
  } catch (error) {
    projectGrid.innerHTML = '<p class="empty-projects">Os projetos não carregaram. Recarregue a página em instantes.</p>';
    console.error(error);
  }
}

document.querySelectorAll('.project-filter').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('.project-filter.active')?.classList.remove('active');
  button.classList.add('active');
  activeFilter = button.dataset.filter;
  renderProjects();
}));
projectGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-request]');
  if (button) openOrder(button.dataset.request);
});
document.querySelectorAll('[data-open-order]').forEach((button) => button.addEventListener('click', () => openOrder()));
document.querySelector('.dialog-close').addEventListener('click', () => orderDialog.close());
orderDialog.addEventListener('click', (event) => { if (event.target === orderDialog) orderDialog.close(); });
document.querySelector('.menu-toggle').addEventListener('click', (event) => {
  const nav = document.querySelector('.nav');
  const open = nav.classList.toggle('nav-open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.nav a').forEach((link) => link.addEventListener('click', () => document.querySelector('.nav').classList.remove('nav-open')));
document.querySelector('#year').textContent = new Date().getFullYear();

document.querySelector('#order-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector('#form-status');
  const button = form.querySelector('.submit-order');
  const data = Object.fromEntries(new FormData(form));
  if (!data.consent) return;
  status.textContent = 'Registrando seu pedido…';
  status.className = 'form-status';
  button.disabled = true;
  try {
    const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(errorMessage(result.error, 'Não foi possível registrar seu pedido.'));
    status.textContent = 'Pedido registrado! Abrindo o WhatsApp…';
    status.classList.add('success');
    window.location.assign(result.whatsappUrl);
  } catch (error) {
    status.textContent = errorMessage(error, 'Não foi possível salvar seu pedido. Seus dados continuam no formulário; tente novamente em instantes.');
    button.disabled = false;
  }
});
loadSite();
