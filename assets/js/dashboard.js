// ==========================================================================
// MotoControl — dashboard.js
// Centro de control del negocio. Fase 1: interfaz + datos DEMO.
// Fase 2+: se conecta a Firestore vía firebase.js (ver TODOs).
// ==========================================================================

// TODO(Fase 2): reemplazar por datos reales desde Firestore (colecciones:
// motocicletas, ventas, creditos, pagos, gastos)
const DEMO = {
  inventario: { disponibles: 8, apartadas: 2, vendidas: 23, reparacion: 1, valor: 612000 },
  ventas: { hoy: 1, mes: 9, contado: 4, credito: 5 },
  creditos: { activos: 12, financiado: 480000, cobrado: 210500, saldo: 269500, vencidos: 3, morosos: 2 },
  finanzas: { capital: 158200, ingresos: 342000, gastos: 61400, utilidadBruta: 122000, utilidadNeta: 96500, disponible: 158200 },
};

function money(n) {
  return '$' + Math.round(n).toLocaleString('es-MX');
}

function gauge(pct, value, label, sub, color) {
  const clamped = Math.max(0, Math.min(100, pct));
  return `
    <div class="card gauge-card">
      <div class="gauge" style="--pct:${clamped};--gauge-color:${color};">
        <span class="gauge-val">${value}</span>
      </div>
      <div class="label">${label}</div>
      ${sub ? `<div class="sub">${sub}</div>` : ''}
    </div>
  `;
}

function statCard(value, label, delta) {
  const deltaHtml = delta
    ? `<div class="stat-delta ${delta.dir}">${delta.dir === 'up' ? '▲' : '▼'} ${delta.text}</div>`
    : '';
  return `
    <div class="card stat-card">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
      ${deltaHtml}
    </div>
  `;
}

export function renderDashboard(container) {
  const { inventario, ventas, creditos, finanzas } = DEMO;
  const carteraVencidaPct = Math.round((creditos.vencidos / creditos.activos) * 100);

  container.innerHTML = `

    <div class="section-head">
      <h2>Acciones rápidas</h2>
    </div>
    <div class="quick-actions">
      <a class="qa-btn" href="#motocicletas"><span class="ico">🏍️</span><span class="txt">Moto</span></a>
      <a class="qa-btn" href="#clientes"><span class="ico">👤</span><span class="txt">Cliente</span></a>
      <a class="qa-btn" href="#ventas"><span class="ico">💰</span><span class="txt">Venta</span></a>
      <a class="qa-btn" href="#creditos"><span class="ico">📋</span><span class="txt">Crédito</span></a>
      <a class="qa-btn" href="#pagos"><span class="ico">💵</span><span class="txt">Pago</span></a>
      <a class="qa-btn" href="#gastos"><span class="ico">💸</span><span class="txt">Gasto</span></a>
      <a class="qa-btn" href="#contratos"><span class="ico">📄</span><span class="txt">Contrato</span></a>
    </div>

    <div class="section-head">
      <h2>Tablero — vista de 30 segundos</h2>
      <span class="sub">DATOS DEMO</span>
    </div>
    <div class="grid grid-3">
      ${gauge(Math.round((inventario.disponibles / (inventario.disponibles + inventario.apartadas + inventario.reparacion)) * 100),
              inventario.disponibles, 'Disponibles', `${money(inventario.valor)} inv.`, 'var(--ok)')}
      ${gauge(Math.round((ventas.credito / (ventas.contado + ventas.credito)) * 100),
              ventas.mes, 'Ventas del mes', `${ventas.contado} contado / ${ventas.credito} crédito`, 'var(--accent)')}
      ${gauge(carteraVencidaPct, creditos.morosos, 'Clientes morosos', `${money(creditos.saldo)} saldo pendiente`, carteraVencidaPct > 20 ? 'var(--danger)' : 'var(--warn)')}
    </div>

    <div class="section-head"><h2>Inventario</h2></div>
    <div class="grid grid-3">
      ${statCard(inventario.disponibles, 'Disponibles')}
      ${statCard(inventario.apartadas, 'Apartadas')}
      ${statCard(inventario.vendidas, 'Vendidas')}
    </div>

    <div class="section-head"><h2>Créditos</h2></div>
    <div class="grid grid-2">
      ${statCard(money(creditos.financiado), 'Total financiado')}
      ${statCard(money(creditos.cobrado), 'Total cobrado')}
      ${statCard(money(creditos.saldo), 'Saldo pendiente')}
      ${statCard(creditos.vencidos, 'Pagos vencidos', { dir: 'down', text: `${creditos.morosos} morosos` })}
    </div>

    <div class="section-head"><h2>Finanzas</h2></div>
    <div class="grid grid-2">
      ${statCard(money(finanzas.capital), 'Capital disponible')}
      ${statCard(money(finanzas.utilidadNeta), 'Utilidad neta', { dir: 'up', text: `${money(finanzas.ingresos)} ingresos` })}
      ${statCard(money(finanzas.gastos), 'Gastos')}
      ${statCard(money(finanzas.utilidadBruta), 'Utilidad bruta')}
    </div>

    <div class="section-head"><h2>Contratos pendientes</h2></div>
    <div class="card empty-state">
      <div class="ico">📄</div>
      <div class="txt">Sin contratos pendientes (demo). Este bloque se activa en Fase 9.</div>
    </div>
  `;
}
