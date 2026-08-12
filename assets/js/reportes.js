// ==========================================================================
// MotoControl — reportes.js
// Reportes filtrables (sección 38). Exportación CSV (Excel-compatible).
// PDF/impresión se puede añadir después con el mismo jsPDF ya cargado
// para Contratos, si se necesita.
// ==========================================================================

import { getAll } from './data.js';
import { money, hoyISO, descargarCSV } from './utilidades.js';

const RANGOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'anio', label: 'Este año' },
  { key: 'todo', label: 'Todo' },
];

function rangoFechas(rango) {
  const hoy = new Date();
  const fin = hoyISO();
  let inicio;
  if (rango === 'hoy') inicio = fin;
  else if (rango === 'semana') {
    const d = new Date(hoy);
    d.setDate(d.getDate() - 7);
    inicio = d.toISOString().slice(0, 10);
  } else if (rango === 'mes') inicio = fin.slice(0, 7) + '-01';
  else if (rango === 'anio') inicio = fin.slice(0, 4) + '-01-01';
  else inicio = '0000-01-01';
  return { inicio, fin };
}

function enRango(fecha, inicio, fin) {
  return fecha && fecha >= inicio && fecha <= fin;
}

function calcularDatos(rango) {
  const { inicio, fin } = rangoFechas(rango);
  const ventas = getAll('ventas').filter((v) => enRango(v.fecha, inicio, fin));
  const pagos = getAll('pagos').filter((p) => enRango(p.fecha, inicio, fin));
  const gastos = getAll('gastos').filter((g) => enRango(g.fecha, inicio, fin));
  const inversiones = getAll('inversiones').filter((i) => enRango(i.fecha, inicio, fin));
  const motos = getAll('motocicletas');
  const creditos = getAll('creditos');

  return { ventas, pagos, gastos, inversiones, motos, creditos, inicio, fin };
}

let rangoActual = 'mes';

export function renderReportes(container) {
  const d = calcularDatos(rangoActual);

  const totalVentas = d.ventas.reduce((s, v) => s + Number(v.total || 0), 0);
  const totalUtilidad = d.ventas.reduce((s, v) => s + Number(v.utilidad || 0), 0);
  const totalCobrado = d.pagos.reduce((s, p) => s + Number(p.totalRecibido || 0), 0);
  const totalGastos = d.gastos.reduce((s, g) => s + Number(g.monto || 0), 0);
  const totalInversiones = d.inversiones.reduce((s, i) => s + Number(i.monto || 0), 0);

  container.innerHTML = `
    <div class="section-head"><h2>Rango</h2></div>
    <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:14px;">
      ${RANGOS.map(r => `
        <button class="rango-btn" data-rango="${r.key}" style="flex:0 0 auto;padding:8px 14px;border-radius:20px;border:1px solid ${r.key===rangoActual?'var(--accent)':'var(--border)'};background:${r.key===rangoActual?'var(--accent)':'var(--surface-2)'};color:${r.key===rangoActual?'#0A0C10':'var(--text-dim)'};font-size:12px;font-weight:600;white-space:nowrap;">${r.label}</button>
      `).join('')}
    </div>

    <div class="section-head"><h2>Resumen (${d.inicio} a ${d.fin})</h2></div>
    <div class="grid grid-3">
      <div class="card stat-card"><div class="stat-value">${d.ventas.length}</div><div class="stat-label">Ventas</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:14px;">${money(totalVentas)}</div><div class="stat-label">Total vendido</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:14px;color:var(--ok);">${money(totalUtilidad)}</div><div class="stat-label">Utilidad</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:14px;">${money(totalCobrado)}</div><div class="stat-label">Cobrado (pagos)</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:14px;color:var(--danger);">${money(totalGastos)}</div><div class="stat-label">Gastos</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:14px;">${money(totalInversiones)}</div><div class="stat-label">Inversiones</div></div>
    </div>

    <div class="section-head"><h2>Inventario (estado actual)</h2></div>
    <div class="grid grid-3">
      <div class="card stat-card"><div class="stat-value">${d.motos.filter(m=>m.estado==='disponible').length}</div><div class="stat-label">Disponibles</div></div>
      <div class="card stat-card"><div class="stat-value">${d.motos.filter(m=>m.estado==='vendida').length}</div><div class="stat-label">Vendidas</div></div>
      <div class="card stat-card"><div class="stat-value">${d.creditos.length}</div><div class="stat-label">Créditos totales</div></div>
    </div>

    <div class="section-head"><h2>Exportar (CSV)</h2><span class="sub">compatible con Excel</span></div>
    <div class="quick-actions">
      <button class="export-btn" data-tipo="ventas" style="flex:0 0 auto;" class="qa-btn"><span class="ico">💰</span><span class="txt">Ventas</span></button>
      <button class="export-btn" data-tipo="pagos" class="qa-btn"><span class="ico">💵</span><span class="txt">Pagos</span></button>
      <button class="export-btn" data-tipo="gastos" class="qa-btn"><span class="ico">💸</span><span class="txt">Gastos</span></button>
      <button class="export-btn" data-tipo="inversiones" class="qa-btn"><span class="ico">📈</span><span class="txt">Inversiones</span></button>
      <button class="export-btn" data-tipo="inventario" class="qa-btn"><span class="ico">🏍️</span><span class="txt">Inventario</span></button>
    </div>
  `;

  container.querySelectorAll('.rango-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      rangoActual = btn.dataset.rango;
      renderReportes(container);
    });
  });

  container.querySelectorAll('.export-btn').forEach((btn) => {
    btn.style.background = 'var(--surface)';
    btn.style.border = '1px solid var(--border)';
    btn.style.borderRadius = 'var(--radius)';
    btn.style.padding = '12px 16px';
    btn.style.minWidth = '78px';
    btn.addEventListener('click', () => exportar(btn.dataset.tipo, d));
  });
}

function exportar(tipo, d) {
  if (tipo === 'ventas') {
    descargarCSV(`ventas_${d.inicio}_a_${d.fin}.csv`,
      ['Fecha', 'Cliente', 'Moto', 'Tipo', 'Total', 'Utilidad', 'Vendedor'],
      d.ventas.map(v => [v.fecha, v.clienteNombre, v.motoResumen, v.tipo, v.total, v.utilidad, v.vendedor]));
  } else if (tipo === 'pagos') {
    descargarCSV(`pagos_${d.inicio}_a_${d.fin}.csv`,
      ['Fecha', 'Cliente', 'Crédito', 'Cuota', 'Total recibido', 'Método'],
      d.pagos.map(p => [p.fecha, p.clienteNombre, p.creditoNumero, p.numeroPago, p.totalRecibido, p.metodoPago]));
  } else if (tipo === 'gastos') {
    descargarCSV(`gastos_${d.inicio}_a_${d.fin}.csv`,
      ['Fecha', 'Concepto', 'Categoría', 'Monto', 'Método'],
      d.gastos.map(g => [g.fecha, g.concepto, g.categoria, g.monto, g.metodoPago]));
  } else if (tipo === 'inversiones') {
    descargarCSV(`inversiones_${d.inicio}_a_${d.fin}.csv`,
      ['Fecha', 'Concepto', 'Categoría', 'Monto', 'Proveedor'],
      d.inversiones.map(i => [i.fecha, i.concepto, i.categoria, i.monto, i.proveedor]));
  } else if (tipo === 'inventario') {
    descargarCSV(`inventario_${hoyISO()}.csv`,
      ['Marca', 'Modelo', 'Año', 'VIN', 'Estado', 'Precio contado'],
      d.motos.map(m => [m.marca, m.modelo, m.anio, m.vin, m.estado, m.precioContado]));
  }
}
