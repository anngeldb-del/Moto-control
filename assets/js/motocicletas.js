// ==========================================================================
// MotoControl — motocicletas.js
// Módulo de Motocicletas + Inventario (secciones 9 y 10 del spec).
// CRUD completo, estados, cálculos automáticos, filtros y búsqueda.
// ==========================================================================

import { getAll, save, remove, seedIfEmpty } from './data.js';
import { money, uid, hoyISO, calcularCostoTotal, calcularUtilidadEstimada, diasEnInventario } from './utilidades.js';

const COLLECTION = 'motocicletas';

const ESTADOS = [
  { value: 'disponible', label: 'Disponible', color: 'ok' },
  { value: 'apartada', label: 'Apartada', color: 'warn' },
  { value: 'vendida', label: 'Vendida', color: 'info' },
  { value: 'reparacion', label: 'En reparación', color: 'danger' },
  { value: 'transito', label: 'En tránsito', color: 'warn' },
  { value: 'cancelada', label: 'Cancelada', color: 'danger' },
];

function estadoMeta(value) {
  return ESTADOS.find((e) => e.value === value) || ESTADOS[0];
}

const DEMO = [
  { id: uid(), marca: 'Italika', modelo: 'FT150', anio: 2024, cilindrada: 150, color: 'Negro', vin: 'IT150X001', motor: 'M001', placas: '', km: 0, fechaAdquisicion: '2026-06-10', proveedor: 'Distribuidora Norte', costoAdquisicion: 22000, gastosAdicionales: 800, precioContado: 27500, precioCredito: 29900, engancheSugerido: 5000, estado: 'disponible', notas: '' },
  { id: uid(), marca: 'Honda', modelo: 'CB160F', anio: 2023, cilindrada: 160, color: 'Rojo', vin: 'HD160X002', motor: 'M002', placas: 'ABC123', km: 3200, fechaAdquisicion: '2026-05-02', proveedor: 'Cliente particular', costoAdquisicion: 28000, gastosAdicionales: 1500, precioContado: 34900, precioCredito: 37500, engancheSugerido: 7000, estado: 'apartada', notas: 'Apartada por Juan Pérez' },
  { id: uid(), marca: 'Vento', modelo: 'Phantom R4', anio: 2024, cilindrada: 250, color: 'Azul', vin: 'VT250X003', motor: 'M003', placas: '', km: 0, fechaAdquisicion: '2026-07-20', proveedor: 'Distribuidora Norte', costoAdquisicion: 41000, gastosAdicionales: 1200, precioContado: 49900, precioCredito: 53500, engancheSugerido: 10000, estado: 'disponible', notas: '' },
  { id: uid(), marca: 'Italika', modelo: 'DM200', anio: 2022, cilindrada: 200, color: 'Gris', vin: 'IT200X004', motor: 'M004', placas: '', km: 8500, fechaAdquisicion: '2026-04-15', proveedor: 'Cliente particular', costoAdquisicion: 19000, gastosAdicionales: 2400, precioContado: 24500, precioCredito: 26900, engancheSugerido: 5000, estado: 'reparacion', notas: 'Cambio de clutch' },
];

let state = { motos: [], filtroEstado: '', filtroMarca: '', busqueda: '' };

// ---------------------------------------------------------------------
function motoRow(moto) {
  const costoTotal = calcularCostoTotal(moto.costoAdquisicion, moto.gastosAdicionales);
  const utilidad = calcularUtilidadEstimada(moto.precioContado, costoTotal);
  const dias = diasEnInventario(moto.fechaAdquisicion);
  const meta = estadoMeta(moto.estado);

  return `
    <div class="card" style="margin-bottom:10px;display:flex;flex-direction:column;gap:8px;" data-moto-id="${moto.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div style="font-weight:600;font-size:14px;">${moto.marca} ${moto.modelo}</div>
          <div class="mono" style="font-size:11px;color:var(--text-dim);">${moto.anio} · ${moto.cilindrada}cc · ${moto.color} · VIN ${moto.vin || '—'}</div>
        </div>
        <span class="badge ${meta.color}">${meta.label}</span>
      </div>
      <div class="grid grid-3" style="gap:8px;">
        <div><div style="font-size:10px;color:var(--text-dim);">CONTADO</div><div class="mono" style="font-size:13px;">${money(moto.precioContado)}</div></div>
        <div><div style="font-size:10px;color:var(--text-dim);">UTILIDAD EST.</div><div class="mono" style="font-size:13px;color:${utilidad >= 0 ? 'var(--ok)' : 'var(--danger)'};">${money(utilidad)}</div></div>
        <div><div style="font-size:10px;color:var(--text-dim);">EN INVENTARIO</div><div class="mono" style="font-size:13px;">${dias}d</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:2px;">
        <button class="btn-edit" data-id="${moto.id}" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:12px;font-weight:600;">Editar</button>
        <button class="btn-del" data-id="${moto.id}" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--danger);font-size:12px;font-weight:600;">Eliminar</button>
      </div>
    </div>
  `;
}

function filtrarMotos() {
  const q = state.busqueda.trim().toLowerCase();
  return state.motos.filter((m) => {
    if (state.filtroEstado && m.estado !== state.filtroEstado) return false;
    if (state.filtroMarca && m.marca !== state.filtroMarca) return false;
    if (q) {
      const hay = [m.marca, m.modelo, m.vin, m.motor].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function marcasUnicas() {
  return [...new Set(state.motos.map((m) => m.marca))].sort();
}

// ---------------------------------------------------------------------
function renderList(container) {
  const filtradas = filtrarMotos();
  const valorInventario = state.motos
    .filter((m) => m.estado === 'disponible' || m.estado === 'apartada')
    .reduce((sum, m) => sum + calcularCostoTotal(m.costoAdquisicion, m.gastosAdicionales), 0);

  container.innerHTML = `
    <div class="section-head">
      <h2>Resumen</h2>
      <span class="sub">${state.motos.length} en catálogo</span>
    </div>
    <div class="grid grid-3">
      <div class="card stat-card"><div class="stat-value">${state.motos.filter(m=>m.estado==='disponible').length}</div><div class="stat-label">Disponibles</div></div>
      <div class="card stat-card"><div class="stat-value">${state.motos.filter(m=>m.estado==='vendida').length}</div><div class="stat-label">Vendidas</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:16px;">${money(valorInventario)}</div><div class="stat-label">Valor inventario</div></div>
    </div>

    <div class="section-head"><h2>Buscar y filtrar</h2></div>
    <div class="card" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
      <input id="moto-search" type="text" placeholder="Buscar por VIN, motor, marca o modelo…" value="${state.busqueda}"
        style="width:100%;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
      <div style="display:flex;gap:8px;">
        <select id="moto-filtro-estado" style="flex:1;padding:9px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;">
          <option value="">Todos los estados</option>
          ${ESTADOS.map(e => `<option value="${e.value}" ${state.filtroEstado===e.value?'selected':''}>${e.label}</option>`).join('')}
        </select>
        <select id="moto-filtro-marca" style="flex:1;padding:9px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;">
          <option value="">Todas las marcas</option>
          ${marcasUnicas().map(m => `<option value="${m}" ${state.filtroMarca===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="section-head"><h2>Catálogo</h2><span class="sub">${filtradas.length} resultado(s)</span></div>
    <div id="moto-list">
      ${filtradas.length ? filtradas.map(motoRow).join('') : `
        <div class="card empty-state">
          <div class="ico">🏍️</div>
          <div class="txt">Sin resultados. Ajusta la búsqueda o agrega una moto con el botón "+".</div>
        </div>
      `}
    </div>
  `;

  document.getElementById('moto-search').addEventListener('input', (e) => {
    state.busqueda = e.target.value;
    renderList(container);
  });
  document.getElementById('moto-filtro-estado').addEventListener('change', (e) => {
    state.filtroEstado = e.target.value;
    renderList(container);
  });
  document.getElementById('moto-filtro-marca').addEventListener('change', (e) => {
    state.filtroMarca = e.target.value;
    renderList(container);
  });
  container.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => openForm(container, btn.dataset.id));
  });
  container.querySelectorAll('.btn-del').forEach((btn) => {
    btn.addEventListener('click', () => confirmarEliminar(container, btn.dataset.id));
  });
}

// ---------------------------------------------------------------------
function confirmarEliminar(container, id) {
  const moto = state.motos.find((m) => m.id === id);
  if (!moto) return;
  const ok = confirm(`¿Eliminar ${moto.marca} ${moto.modelo} (VIN ${moto.vin || '—'})? Esta acción no se puede deshacer.`);
  if (!ok) return;
  remove(COLLECTION, id);
  state.motos = getAll(COLLECTION);
  renderList(container);
}

// ---------------------------------------------------------------------
const CAMPOS_FORM = [
  { key: 'marca', label: 'Marca', type: 'text', required: true },
  { key: 'modelo', label: 'Modelo', type: 'text', required: true },
  { key: 'anio', label: 'Año', type: 'number' },
  { key: 'cilindrada', label: 'Cilindrada (cc)', type: 'number' },
  { key: 'color', label: 'Color', type: 'text' },
  { key: 'vin', label: 'VIN / número de serie', type: 'text' },
  { key: 'motor', label: 'Número de motor', type: 'text' },
  { key: 'placas', label: 'Placas', type: 'text' },
  { key: 'km', label: 'Kilometraje', type: 'number' },
  { key: 'fechaAdquisicion', label: 'Fecha de adquisición', type: 'date' },
  { key: 'proveedor', label: 'Proveedor', type: 'text' },
  { key: 'costoAdquisicion', label: 'Costo de adquisición', type: 'number', required: true },
  { key: 'gastosAdicionales', label: 'Gastos adicionales', type: 'number' },
  { key: 'precioContado', label: 'Precio venta contado', type: 'number', required: true },
  { key: 'precioCredito', label: 'Precio venta crédito', type: 'number' },
  { key: 'engancheSugerido', label: 'Enganche sugerido', type: 'number' },
  { key: 'estado', label: 'Estado', type: 'select', options: ESTADOS },
  { key: 'notas', label: 'Notas', type: 'textarea' },
];

function openForm(container, id) {
  const editing = id ? state.motos.find((m) => m.id === id) : null;
  const moto = editing || { fechaAdquisicion: hoyISO(), estado: 'disponible' };

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:520px;max-height:88vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:18px 16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="font-size:16px;">${editing ? 'Editar moto' : 'Nueva moto'}</h2>
        <button id="form-close" style="background:none;border:none;color:var(--text-dim);font-size:22px;">×</button>
      </div>
      <form id="moto-form" style="display:flex;flex-direction:column;gap:10px;">
        ${CAMPOS_FORM.map((f) => campoHtml(f, moto)).join('')}
        <div id="calc-preview" class="card" style="background:var(--surface-2);margin-top:4px;"></div>
        <button type="submit" style="margin-top:6px;padding:12px;border:none;border-radius:8px;background:var(--accent);color:#0A0C10;font-weight:700;font-size:14px;">
          ${editing ? 'Guardar cambios' : 'Agregar al inventario'}
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  const form = overlay.querySelector('#moto-form');
  const updatePreview = () => {
    const fd = new FormData(form);
    const costoTotal = calcularCostoTotal(fd.get('costoAdquisicion'), fd.get('gastosAdicionales'));
    const utilidad = calcularUtilidadEstimada(fd.get('precioContado'), costoTotal);
    overlay.querySelector('#calc-preview').innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:var(--text-dim);">Costo total</span><span class="mono">${money(costoTotal)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;"><span style="color:var(--text-dim);">Utilidad estimada</span><span class="mono" style="color:${utilidad>=0?'var(--ok)':'var(--danger)'};">${money(utilidad)}</span></div>
    `;
  };
  form.addEventListener('input', updatePreview);
  updatePreview();

  overlay.querySelector('#form-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = { id: editing ? editing.id : uid() };
    CAMPOS_FORM.forEach((f) => {
      const raw = fd.get(f.key);
      data[f.key] = f.type === 'number' ? (raw === '' ? 0 : Number(raw)) : raw;
    });
    save(COLLECTION, data);
    state.motos = getAll(COLLECTION);
    overlay.remove();
    renderList(container);
  });
}

function campoHtml(f, moto) {
  const val = moto[f.key] ?? '';
  const reqAttr = f.required ? 'required' : '';
  const base = 'width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;';

  let input;
  if (f.type === 'select') {
    input = `<select name="${f.key}" style="${base}">${f.options.map(o => `<option value="${o.value}" ${o.value===val?'selected':''}>${o.label}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea name="${f.key}" rows="2" style="${base}resize:vertical;">${val}</textarea>`;
  } else {
    input = `<input type="${f.type}" name="${f.key}" value="${val}" ${reqAttr} style="${base}">`;
  }

  return `
    <div>
      <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.03em;">${f.label}${f.required ? ' *' : ''}</label>
      ${input}
    </div>
  `;
}

// ---------------------------------------------------------------------
export function renderMotocicletas(container) {
  state.motos = seedIfEmpty(COLLECTION, DEMO);
  renderList(container);
}

export function abrirNuevaMoto(container) {
  openForm(container, null);
}

// Para que Ventas (fase siguiente) pueda leer motos disponibles sin
// duplicar lógica de acceso a datos.
export function getMotosDisponibles() {
  return getAll(COLLECTION).filter((m) => m.estado === 'disponible');
}
