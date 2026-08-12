// ==========================================================================
// MotoControl — finanzas.js
// Control financiero (secciones 36-37). Todo calculado a partir de las
// colecciones reales (ventas, pagos, inversiones, gastos) — nada aquí es
// demo. Se distingue explícitamente flujo de caja (dinero que ya entró/
// salió) de utilidad contable (ganancia reconocida al vender), para no
// mezclar ambos conceptos bajo un solo número.
// ==========================================================================

import { getAll } from './data.js';
import { money } from './utilidades.js';

export function calcular() {
  const ventas = getAll('ventas');
  const pagos = getAll('pagos');
  const inversiones = getAll('inversiones');
  const gastos = getAll('gastos');

  // ---- Flujo de efectivo (dinero que realmente entró/salió) ----
  const ingresosContado = ventas.filter((v) => v.tipo === 'contado').reduce((s, v) => s + Number(v.total || 0), 0);
  const enganches = ventas.filter((v) => v.tipo === 'credito').reduce((s, v) => s + Number(v.enganche || 0), 0);
  const cobradoCreditos = pagos.reduce((s, p) => s + Number(p.totalRecibido || 0), 0);
  const totalIngresos = ingresosContado + enganches + cobradoCreditos;

  const totalInversiones = inversiones.reduce((s, i) => s + Number(i.monto || 0), 0);
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto || 0), 0);
  const totalEgresos = totalInversiones + totalGastos;

  const capitalDisponible = totalIngresos - totalEgresos;

  // ---- Rentabilidad (utilidad contable, reconocida al momento de vender) ----
  const utilidadVentas = ventas.reduce((s, v) => s + Number(v.utilidad || 0), 0);
  const utilidadNeta = utilidadVentas - totalGastos;
  const margenPct = totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0;
  const roiPct = totalInversiones > 0 ? (utilidadNeta / totalInversiones) * 100 : 0;

  // ---- Cartera pendiente ----
  const saldoFinanciadoTotal = ventas.filter((v) => v.tipo === 'credito').reduce((s, v) => s + Number(v.saldoFinanciado || 0), 0);
  const carteraPendiente = Math.max(0, saldoFinanciadoTotal - (cobradoCreditos));

  return {
    ingresosContado, enganches, cobradoCreditos, totalIngresos,
    totalInversiones, totalGastos, totalEgresos,
    capitalDisponible, utilidadVentas, utilidadNeta, margenPct, roiPct,
    carteraPendiente,
  };
}

function fila(label, valor, destacado) {
  return `
    <div style="display:flex;justify-content:space-between;padding:7px 0;${destacado ? 'border-top:1px solid var(--border);margin-top:4px;padding-top:11px;' : ''}">
      <span style="font-size:13px;color:${destacado ? 'var(--text)' : 'var(--text-dim)'};${destacado ? 'font-weight:600;' : ''}">${label}</span>
      <span class="mono" style="font-size:13px;${destacado ? 'font-weight:600;' : ''}">${valor}</span>
    </div>
  `;
}

export function renderFinanzas(container) {
  const c = calcular();

  container.innerHTML = `
    <div class="section-head"><h2>Capital disponible</h2><span class="sub">flujo de efectivo real</span></div>
    <div class="grid grid-2">
      <div class="card stat-card"><div class="stat-value" style="font-size:18px;color:${c.capitalDisponible>=0?'var(--ok)':'var(--danger)'};">${money(c.capitalDisponible)}</div><div class="stat-label">Disponible</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:18px;">${money(c.carteraPendiente)}</div><div class="stat-label">Cartera pendiente</div></div>
    </div>

    <div class="section-head"><h2>Flujo de efectivo</h2></div>
    <div class="card" style="margin-bottom:14px;">
      <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;margin-bottom:2px;">Entradas</div>
      ${fila('Ventas de contado', money(c.ingresosContado))}
      ${fila('Enganches de crédito', money(c.enganches))}
      ${fila('Pagos de créditos cobrados', money(c.cobradoCreditos))}
      ${fila('Total ingresos', money(c.totalIngresos), true)}
      <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;margin:14px 0 2px;">Salidas</div>
      ${fila('Inversiones', money(c.totalInversiones))}
      ${fila('Gastos', money(c.totalGastos))}
      ${fila('Total egresos', money(c.totalEgresos), true)}
    </div>

    <div class="section-head"><h2>Rentabilidad</h2><span class="sub">utilidad contable</span></div>
    <div class="card" style="margin-bottom:14px;">
      ${fila('Utilidad de ventas', money(c.utilidadVentas))}
      ${fila('Gastos operativos', '-' + money(c.totalGastos))}
      ${fila('Utilidad neta', money(c.utilidadNeta), true)}
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        ${fila('Margen sobre ingresos', c.margenPct.toFixed(1) + '%')}
        ${fila('ROI sobre inversión', c.totalInversiones > 0 ? c.roiPct.toFixed(1) + '%' : 'Sin inversiones registradas')}
      </div>
    </div>

    <div class="card" style="background:var(--surface-2);">
      <div style="font-size:11px;color:var(--text-dim);line-height:1.5;">
        <strong>Nota:</strong> "Flujo de efectivo" es dinero que realmente entró o salió (contado, enganches, pagos cobrados, gastos, inversiones).
        "Utilidad" es contable: se reconoce completa al momento de la venta, aunque el crédito siga pagándose a plazos.
        Ambos números son reales — no son la misma cosa y no deberían sumarse entre sí.
      </div>
    </div>
  `;
}
