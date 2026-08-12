// ==========================================================================
// MotoControl — dashboard.js
// Centro de control del negocio.
// Inventario, Ventas y Créditos: datos reales (motocicletas.js / ventas.js).
// Finanzas: sigue en DEMO hasta construir Inversiones/Gastos/Finanzas.
// ==========================================================================

import { getAll } from './data.js';
import { money, hoyISO, calcularCostoTotal, calcularEstadoCredito } from './utilidades.js';
import { calcular as calcularFinanzas } from './finanzas.js';

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

function calcularInventario() {
  const motos = getAll('motocicletas');
  const disponibles = motos.filter((m) => m.estado === 'disponible');
  const apartadas = motos.filter((m) => m.estado === 'apartada');
  const vendidas = motos.filter((m) => m.estado === 'vendida');
  const reparacion = motos.filter((m) => m.estado === 'reparacion');
  const valor = [...disponibles, ...apartadas]
    .reduce((sum, m) => sum + calcularCostoTotal(m.costoAdquisicion, m.gastosAdicionales), 0);
  return { disponibles: disponibles.length, apartadas: apartadas.length, vendidas: vendidas.length, reparacion: reparacion.length, valor };
}

function calcularVentas() {
  const ventas = getAll('ventas');
  const hoy = hoyISO();
  const mesActual = hoy.slice(0, 7);
  const delMes = ventas.filter((v) => (v.fecha || '').startsWith(mesActual));
  return {
    hoy: ventas.filter((v) => v.fecha === hoy).length,
    mes: delMes.length,
    contado: delMes.filter((v) => v.tipo === 'contado').length,
    credito: delMes.filter((v) => v.tipo === 'credito').length,
  };
}

function calcularCreditos() {
  const creditos = getAll('creditos').map((c) => ({ ...c, _calc: calcularEstadoCredito(c) }));
  const activos = creditos.filter((c) => c._calc.estado !== 'liquidado');
  const financiado = creditos.reduce((s, c) => s + (Number(c.totalFinanciado) || 0), 0);
  const saldo = creditos.reduce((s, c) => s + c._calc.saldoActual, 0);
  const cobrado = financiado - saldo;
  const vencidos = creditos.filter((c) => c._calc.diasAtraso > 0).length;
  const morosos = creditos.filter((c) => c._calc.estado === 'moroso').length;
  return { activos: activos.length, financiado, cobrado, saldo, vencidos, morosos };
}

export function renderDashboard(container) {
  const inventario = calcularInventario();
  const ventas = calcularVentas();
  const creditos = calcularCreditos();
  const finanzas = calcularFinanzas();
  const totalActivas = inventario.disponibles + inventario.apartadas + inventario.reparacion;
  const carteraVencidaPct = creditos.activos > 0 ? Math.round((creditos.vencidos / creditos.activos) * 100) : 0;

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
      <span class="sub">Todo real — Inventario, Ventas, Créditos, Finanzas</span>
    </div>
    <div class="grid grid-3">
      ${gauge(totalActivas > 0 ? Math.round((inventario.disponibles / totalActivas) * 100) : 0,
              inventario.disponibles, 'Disponibles', `${money(inventario.valor)} inv.`, 'var(--ok)')}
      ${gauge(ventas.mes > 0 ? Math.round((ventas.credito / ventas.mes) * 100) : 0,
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
      ${statCard(money(finanzas.capitalDisponible), 'Capital disponible')}
      ${statCard(money(finanzas.utilidadNeta), 'Utilidad neta', { dir: 'up', text: `${money(finanzas.totalIngresos)} ingresos` })}
      ${statCard(money(finanzas.totalGastos), 'Gastos')}
      ${statCard(money(finanzas.utilidadVentas), 'Utilidad de ventas')}
    </div>

    <div class="section-head"><h2>Contratos pendientes</h2></div>
    ${contratosPendientesHtml()}
  `;
}

function contratosPendientesHtml() {
  const creditos = getAll('creditos');
  const contratos = getAll('contratos');
  const pendientes = creditos.filter((c) => !contratos.find((k) => k.creditoId === c.id));

  if (pendientes.length === 0) {
    return `
      <div class="card empty-state">
        <div class="ico">📄</div>
        <div class="txt">Sin contratos pendientes.</div>
      </div>
    `;
  }

  return `
    <div class="card">
      ${pendientes.slice(0, 5).map((c) => `
        <a href="#contratos" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:13px;font-weight:600;">${c.clienteNombre}</div>
            <div class="mono" style="font-size:11px;color:var(--text-dim);">${c.numero} · ${c.motoResumen}</div>
          </div>
          <span class="badge danger">CONTRATO PENDIENTE</span>
        </a>
      `).join('')}
    </div>
  `;
