// ==========================================================================
// MotoControl — clientes.js
// Módulo de Clientes (secciones 11-12) — el último, a propósito.
// Hasta ahora Ventas/Créditos/Pagos/Contratos capturan cliente ligero
// (nombre + teléfono). Este módulo:
//   1) permite crear/editar el expediente completo
//   2) detecta automáticamente los clientes "sueltos" que ya existen en
//      ventas y no tienen expediente — se promueven sin volver a teclear nada
//   3) arma la vista CRM (sección 12) cruzando por teléfono/nombre, ya que
//      los registros anteriores no tienen clienteId — no había Clientes
//      todavía cuando se crearon
// ==========================================================================

import { getAll, save, remove } from './data.js';
import { money, uid, hoyISO, calcularEstadoCredito } from './utilidades.js';

const COLLECTION = 'clientes';

const CAMPOS_FORM = [
  { key: 'nombre', label: 'Nombre completo', type: 'text', required: true },
  { key: 'telefono', label: 'Teléfono', type: 'tel' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'tel' },
  { key: 'email', label: 'Correo', type: 'email' },
  { key: 'direccion', label: 'Dirección', type: 'text' },
  { key: 'ciudad', label: 'Ciudad', type: 'text' },
  { key: 'estadoMx', label: 'Estado', type: 'text' },
  { key: 'cp', label: 'Código postal', type: 'text' },
  { key: 'fechaNacimiento', label: 'Fecha de nacimiento', type: 'date' },
  { key: 'ine', label: 'INE', type: 'text' },
  { key: 'rfc', label: 'RFC', type: 'text' },
  { key: 'referenciaNombre', label: 'Referencia — nombre', type: 'text' },
  { key: 'referenciaTelefono', label: 'Referencia — teléfono', type: 'tel' },
  { key: 'notas', label: 'Notas', type: 'textarea' },
];

// ---------------------------------------------------------------------
// Detección de clientes "sueltos" (capturados dentro de Ventas, sin
// expediente todavía) — clave por teléfono si existe, si no por nombre.
// ---------------------------------------------------------------------
function clientesSueltos() {
  const ventas = getAll('ventas');
  const clientes = getAll(COLLECTION);
  const yaTieneExpediente = (telefono, nombre) =>
    clientes.some((c) => (telefono && c.telefono === telefono) || (!telefono && c.nombre === nombre));

  const vistos = new Set();
  const sueltos = [];
  ventas.forEach((v) => {
    const key = v.clienteTelefono || v.clienteNombre;
    if (!key || vistos.has(key)) return;
    if (yaTieneExpediente(v.clienteTelefono, v.clienteNombre)) return;
    vistos.add(key);
    sueltos.push({ nombre: v.clienteNombre, telefono: v.clienteTelefono });
  });
  return sueltos;
}

// ---------------------------------------------------------------------
function registrosDeCliente(cliente) {
  const ventas = getAll('ventas').filter((v) =>
    (cliente.telefono && v.clienteTelefono === cliente.telefono) ||
    (!cliente.telefono && v.clienteNombre === cliente.nombre)
  );
  const ventaIds = new Set(ventas.map((v) => v.id));
  const creditos = getAll('creditos').filter((c) => ventaIds.has(c.ventaId)).map((c) => ({ ...c, _calc: calcularEstadoCredito(c) }));
  const creditoIds = new Set(creditos.map((c) => c.id));
  const pagos = getAll('pagos').filter((p) => creditoIds.has(p.creditoId));
  const contratos = getAll('contratos').filter((k) => creditoIds.has(k.creditoId));
  const motos = getAll('motocicletas').filter((m) => ventas.some((v) => v.motoId === m.id));

  const saldoPendiente = creditos.reduce((s, c) => s + c._calc.saldoActual, 0);
  const proximos = creditos.map((c) => c._calc.proximoPago).filter(Boolean).sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { ventas, creditos, pagos, contratos, motos, saldoPendiente, proximoPago: proximos[0] || null };
}

// ---------------------------------------------------------------------
function clienteCard(c) {
  const r = registrosDeCliente(c);
  return `
    <div class="card" style="margin-bottom:10px;" data-id="${c.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div style="font-weight:600;font-size:14px;">${c.nombre}</div>
          <div class="mono" style="font-size:11px;color:var(--text-dim);">${c.telefono || 'sin teléfono'} · ${r.motos.length} moto(s)</div>
        </div>
        ${r.saldoPendiente > 0 ? `<span class="badge warn">${money(r.saldoPendiente)}</span>` : `<span class="badge ok">Al corriente</span>`}
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn-expediente" data-id="${c.id}" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:12px;font-weight:600;">Ver expediente</button>
        <button class="btn-edit" data-id="${c.id}" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:12px;font-weight:600;">Editar</button>
      </div>
    </div>
  `;
}

function sueltoCard(s) {
  return `
    <div class="card" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-weight:600;font-size:14px;">${s.nombre}</div>
        <div class="mono" style="font-size:11px;color:var(--text-dim);">${s.telefono || 'sin teléfono'} · capturado en una venta</div>
      </div>
      <button class="btn-promover" data-nombre="${s.nombre}" data-telefono="${s.telefono || ''}"
        style="padding:8px 12px;border-radius:8px;border:1px solid var(--accent);background:transparent;color:var(--accent);font-size:12px;font-weight:600;">
        + Expediente
      </button>
    </div>
  `;
}

// ---------------------------------------------------------------------
function renderList(container) {
  const clientes = getAll(COLLECTION).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const sueltos = clientesSueltos();

  container.innerHTML = `
    <div class="section-head"><h2>Resumen</h2></div>
    <div class="grid grid-2">
      <div class="card stat-card"><div class="stat-value">${clientes.length}</div><div class="stat-label">Expedientes</div></div>
      <div class="card stat-card"><div class="stat-value">${sueltos.length}</div><div class="stat-label">Sin expediente</div></div>
    </div>

    ${sueltos.length ? `
      <div class="section-head"><h2>Detectados en Ventas</h2><span class="sub">promover sin volver a capturar</span></div>
      <div id="sueltos-list">${sueltos.map(sueltoCard).join('')}</div>
    ` : ''}

    <div class="section-head"><h2>Expedientes</h2><span class="sub">${clientes.length}</span></div>
    <div id="clientes-list">
      ${clientes.length ? clientes.map(clienteCard).join('') : `
        <div class="card empty-state"><div class="ico">👤</div><div class="txt">Sin expedientes todavía. Usa "+" para crear uno, o promueve uno detectado arriba.</div></div>
      `}
    </div>
  `;

  container.querySelectorAll('.btn-promover').forEach((btn) => {
    btn.addEventListener('click', () => openForm(container, null, { nombre: btn.dataset.nombre, telefono: btn.dataset.telefono }));
  });
  container.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => openForm(container, btn.dataset.id));
  });
  container.querySelectorAll('.btn-expediente').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cliente = clientes.find((c) => c.id === btn.dataset.id);
      if (cliente) openExpediente(container, cliente);
    });
  });
}

// ---------------------------------------------------------------------
function campoHtml(f, val) {
  const reqAttr = f.required ? 'required' : '';
  const base = 'width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;';
  const input = f.type === 'textarea'
    ? `<textarea name="${f.key}" rows="2" style="${base}resize:vertical;">${val || ''}</textarea>`
    : `<input type="${f.type}" name="${f.key}" value="${val || ''}" ${reqAttr} style="${base}">`;
  return `<div><label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">${f.label}${f.required ? ' *' : ''}</label>${input}</div>`;
}

function openForm(container, id, prellenado) {
  const clientes = getAll(COLLECTION);
  const editing = id ? clientes.find((c) => c.id === id) : null;
  const base = editing || prellenado || {};

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:520px;max-height:90vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:18px 16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="font-size:16px;">${editing ? 'Editar cliente' : 'Nuevo expediente'}</h2>
        <button id="form-close" style="background:none;border:none;color:var(--text-dim);font-size:22px;">×</button>
      </div>
      <form id="cliente-form" style="display:flex;flex-direction:column;gap:10px;">
        ${CAMPOS_FORM.map((f) => campoHtml(f, base[f.key])).join('')}
        <button type="submit" style="margin-top:6px;padding:12px;border:none;border-radius:8px;background:var(--accent);color:#0A0C10;font-weight:700;font-size:14px;">
          ${editing ? 'Guardar cambios' : 'Crear expediente'}
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#form-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#cliente-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = { id: editing ? editing.id : uid() };
    if (!editing) data.fechaRegistro = hoyISO();
    CAMPOS_FORM.forEach((f) => { data[f.key] = fd.get(f.key); });
    save(COLLECTION, data);
    overlay.remove();
    renderList(container);
  });
}

// ---------------------------------------------------------------------
function renderExpedienteContent(cliente) {
  const r = registrosDeCliente(cliente);
  return `
    <div class="card" style="background:var(--surface-2);margin-bottom:10px;">
      <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px;">Datos personales</div>
      <div style="font-size:13px;line-height:1.6;">
        ${cliente.telefono ? `📞 ${cliente.telefono}<br>` : ''}
        ${cliente.whatsapp ? `📲 ${cliente.whatsapp}<br>` : ''}
        ${cliente.email ? `✉️ ${cliente.email}<br>` : ''}
        ${cliente.direccion || cliente.ciudad ? `📍 ${[cliente.direccion, cliente.ciudad, cliente.estadoMx].filter(Boolean).join(', ')}<br>` : ''}
        ${cliente.ine ? `INE: ${cliente.ine}<br>` : ''}
        ${cliente.rfc ? `RFC: ${cliente.rfc}<br>` : ''}
        ${cliente.referenciaNombre ? `Referencia: ${cliente.referenciaNombre} ${cliente.referenciaTelefono || ''}` : ''}
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:10px;">
      <div class="card stat-card"><div class="stat-value" style="font-size:15px;">${money(r.saldoPendiente)}</div><div class="stat-label">Saldo pendiente</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:15px;">${r.proximoPago ? r.proximoPago.fecha : '—'}</div><div class="stat-label">Próximo pago</div></div>
    </div>

    <div class="section-head"><h2>Motocicletas</h2></div>
    <div class="card" style="margin-bottom:10px;">
      ${r.motos.length ? r.motos.map(m => `<div style="padding:5px 0;font-size:13px;">${m.marca} ${m.modelo} ${m.anio}</div>`).join('') : `<div class="empty-state" style="padding:12px;">Sin motos registradas</div>`}
    </div>

    <div class="section-head"><h2>Ventas</h2></div>
    <div class="card" style="margin-bottom:10px;">
      ${r.ventas.length ? r.ventas.map(v => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--border);">
          <span>${v.motoResumen} · ${v.tipo}</span><span class="mono">${money(v.total)}</span>
        </div>`).join('') : `<div class="empty-state" style="padding:12px;">Sin ventas</div>`}
    </div>

    <div class="section-head"><h2>Créditos</h2></div>
    <div class="card" style="margin-bottom:10px;">
      ${r.creditos.length ? r.creditos.map(c => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--border);">
          <span>${c.numero}</span><span class="mono">${money(c._calc.saldoActual)} saldo</span>
        </div>`).join('') : `<div class="empty-state" style="padding:12px;">Sin créditos</div>`}
    </div>

    <div class="section-head"><h2>Pagos</h2></div>
    <div class="card" style="margin-bottom:10px;">
      ${r.pagos.length ? r.pagos.map(p => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--border);">
          <span>${p.fecha} · cuota #${p.numeroPago}</span><span class="mono">${money(p.totalRecibido)}</span>
        </div>`).join('') : `<div class="empty-state" style="padding:12px;">Sin pagos</div>`}
    </div>

    <div class="section-head"><h2>Documentos</h2></div>
    <div class="card">
      ${r.contratos.length ? r.contratos.map(k => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;">
          <span>${k.numero}</span><span class="badge ${k.estado==='firmado'?'ok':'warn'}">${k.estado}</span>
        </div>`).join('') : `<div class="empty-state" style="padding:12px;">Sin contratos</div>`}
    </div>
  `;
}

function openExpediente(container, cliente) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:18px 16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="font-size:16px;">${cliente.nombre}</h2>
        <button id="exp-close" style="background:none;border:none;color:var(--text-dim);font-size:22px;">×</button>
      </div>
      ${renderExpedienteContent(cliente)}
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#exp-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ---------------------------------------------------------------------
export function renderClientes(container) {
  renderList(container);
}

export function abrirNuevoCliente(container) {
  openForm(container, null);
}
