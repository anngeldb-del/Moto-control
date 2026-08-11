// ==========================================================================
// MotoControl — app.js
// Núcleo de la aplicación: router por hash + navegación + shell
// Fase 1: arquitectura + interfaz + navegación (sin Firebase todavía)
// ==========================================================================

import { renderDashboard } from './dashboard.js';
import { renderMotocicletas, abrirNuevaMoto } from './motocicletas.js';
import { renderVentas, abrirNuevaVenta } from './ventas.js';
import { renderLogin } from './login.js';
import { initAuth, session, onSessionChange, canAccess, logout } from './auth.js';

// ---------------------------------------------------------------------
// Definición de navegación (única fuente de verdad para sidebar + bottomnav)
// ---------------------------------------------------------------------
export const NAV_ITEMS = [
  { route: 'dashboard',     label: 'Dashboard',     ico: '🏠', primary: true },
  { route: 'motocicletas',  label: 'Motos',         ico: '🏍️', primary: true },
  { route: 'clientes',      label: 'Clientes',      ico: '👤', primary: true },
  { route: 'ventas',        label: 'Ventas',        ico: '💰', primary: true },
  { route: 'creditos',      label: 'Créditos',      ico: '📋', primary: false },
  { route: 'pagos',         label: 'Pagos',         ico: '💵', primary: false },
  { route: 'contratos',     label: 'Contratos',     ico: '📄', primary: false },
  { route: 'inventario',    label: 'Inventario',    ico: '📦', primary: false },
  { route: 'inversiones',   label: 'Inversiones',   ico: '📈', primary: false },
  { route: 'gastos',        label: 'Gastos',        ico: '💸', primary: false },
  { route: 'finanzas',      label: 'Finanzas',      ico: '📊', primary: false },
  { route: 'reportes',      label: 'Reportes',      ico: '📑', primary: false },
  { route: 'configuracion', label: 'Configuración', ico: '⚙️', primary: false },
];

// Rutas activas en Fase 1 (el resto muestra un placeholder "próxima fase")
const ROUTES = {
  dashboard: { title: 'Dashboard', render: renderDashboard },
  motocicletas: {
    title: 'Motocicletas',
    render: renderMotocicletas,
    fabAction: () => abrirNuevaMoto(document.getElementById('app-view')),
  },
  ventas: {
    title: 'Ventas',
    render: renderVentas,
    fabAction: () => abrirNuevaVenta(document.getElementById('app-view')),
  },
};

// ---------------------------------------------------------------------
// Sidebar (desktop)
// ---------------------------------------------------------------------
function visibleNavItems() {
  return NAV_ITEMS.filter(item => canAccess(item.route, session.role));
}

function renderSidebar(activeRoute) {
  const sidebar = document.getElementById('sidebar');
  const items = visibleNavItems().map(item => `
    <a class="nav-item ${item.route === activeRoute ? 'active' : ''}" href="#${item.route}">
      <span class="ico">${item.ico}</span><span>${item.label}</span>
    </a>
  `).join('');
  sidebar.innerHTML = items + `
    <div style="flex:1;"></div>
    <a class="nav-item" id="logout-btn" href="#" style="color:var(--danger);">
      <span class="ico">🚪</span><span>Salir</span>
    </a>
  `;
  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

// ---------------------------------------------------------------------
// Bottom nav (mobile) — solo los 4 primarios + "Más"
// ---------------------------------------------------------------------
function renderBottomNav(activeRoute) {
  const bottomnav = document.getElementById('bottomnav');
  const primaryItems = visibleNavItems().filter(i => i.primary);
  const items = primaryItems.map(item => `
    <a class="nav-item ${item.route === activeRoute ? 'active' : ''}" href="#${item.route}">
      <span class="ico">${item.ico}</span><span>${item.label}</span>
    </a>
  `).join('');
  const moreActive = !primaryItems.some(i => i.route === activeRoute) && activeRoute !== 'dashboard';
  bottomnav.innerHTML = items + `
    <a class="nav-item more ${moreActive ? 'active' : ''}" href="#mas">
      <span class="ico">☰</span><span>Más</span>
    </a>
  `;
}

// ---------------------------------------------------------------------
// "Más" — hoja con el resto de módulos (mobile)
// ---------------------------------------------------------------------
function renderMoreView() {
  const rest = visibleNavItems().filter(i => !i.primary);
  document.getElementById('page-title').textContent = 'Más módulos';
  document.getElementById('app-view').innerHTML = `
    <div class="grid grid-3">
      ${rest.map(item => `
        <a class="card" style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding:18px 10px;" href="#${item.route}">
          <span style="font-size:22px;">${item.ico}</span>
          <span style="font-size:11px;font-weight:600;color:var(--text-dim);">${item.label}</span>
        </a>
      `).join('')}
    </div>
  `;
}

// ---------------------------------------------------------------------
// Placeholder para módulos aún no construidos (fases futuras)
// ---------------------------------------------------------------------
function renderPlaceholder(routeMeta) {
  document.getElementById('page-title').textContent = routeMeta.label;
  document.getElementById('app-view').innerHTML = `
    <div class="empty-state">
      <div class="ico">${routeMeta.ico}</div>
      <div class="txt">
        <strong>${routeMeta.label}</strong> se construye en una fase posterior.<br>
        Fase 1 entrega arquitectura, navegación y Dashboard.
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------
function renderAccessDenied(routeMeta) {
  document.getElementById('page-title').textContent = routeMeta.label;
  document.getElementById('app-view').innerHTML = `
    <div class="empty-state">
      <div class="ico">🔒</div>
      <div class="txt">Tu cuenta (empleado) no tiene acceso a <strong>${routeMeta.label}</strong>.<br>Esto lo ve solo el administrador.</div>
    </div>
  `;
}

function handleRoute() {
  // Sesión aún no resuelta (esperando respuesta de Firebase) — no pintar nada todavía.
  if (!session.ready) return;

  // Sin sesión activa: solo la pantalla de login, sin shell de navegación.
  if (!session.user) {
    document.getElementById('sidebar').innerHTML = '';
    document.getElementById('bottomnav').innerHTML = '';
    document.getElementById('fab').style.display = 'none';
    document.getElementById('page-title').textContent = 'MotoControl';
    renderLogin(document.getElementById('app-view'));
    return;
  }

  document.getElementById('fab').style.display = '';
  const userPill = document.getElementById('user-pill');
  userPill.style.display = '';
  userPill.textContent = (session.nombre || session.user.email) + ' · ' + (session.role || '—');

  const hash = location.hash.replace('#', '') || 'dashboard';

  if (hash === 'mas') {
    renderSidebar('mas');
    renderBottomNav('mas');
    renderMoreView();
    return;
  }

  const routeMeta = NAV_ITEMS.find(i => i.route === hash);
  renderSidebar(hash);
  renderBottomNav(hash);
  currentRoute = hash;

  if (routeMeta && !canAccess(hash, session.role)) {
    renderAccessDenied(routeMeta);
    return;
  }

  if (ROUTES[hash]) {
    document.getElementById('page-title').textContent = ROUTES[hash].title;
    ROUTES[hash].render(document.getElementById('app-view'));
  } else if (routeMeta) {
    renderPlaceholder(routeMeta);
  } else {
    location.hash = 'dashboard';
  }
}

onSessionChange(handleRoute);
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', () => {
  initAuth();
  handleRoute();
});

// ---------------------------------------------------------------------
// Estado de conexión
// ---------------------------------------------------------------------
function updateOnlineStatus() {
  const pill = document.getElementById('status-pill');
  const online = navigator.onLine;
  document.body.classList.toggle('is-offline', !online);
  pill.textContent = online ? 'EN LÍNEA' : 'SIN CONEXIÓN';
  pill.className = 'status-pill ' + (online ? 'online' : 'offline');
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// ---------------------------------------------------------------------
// FAB — acciones rápidas (Fase 1: navega a Nueva Venta; se expandirá con
// un menú de acciones cuando existan los módulos de Fase 3+)
// ---------------------------------------------------------------------
let currentRoute = 'dashboard';

document.getElementById('fab').addEventListener('click', () => {
  const routeConfig = ROUTES[currentRoute];
  if (routeConfig && routeConfig.fabAction) {
    routeConfig.fabAction();
  } else {
    location.hash = 'ventas';
  }
});

// ---------------------------------------------------------------------
// Service worker (PWA — registro básico, cache real llega en Fase 14)
// ---------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}
