// ==========================================================================
// MotoControl — ventas.js
// Módulo de Ventas (secciones 13, 14, 15 del spec): contado y crédito.
// Al vender, la moto pasa a estado "vendida" automáticamente.
// Clientes se captura ligero por ahora (nombre + teléfono) — el CRM
// completo (sección 11-12) se construye al final, sin perder estos datos.
// ==========================================================================

import { getAll, save } from './data.js';
import { money, uid, hoyISO, calcularCostoTotal, calcularUtilidadEstimada, calcularSaldoFinanciado } from './utilidades.js';
import { session } from './auth.js';

const COLLECTION = 'ventas';
const MOTOS_COLLECTION = 'motocicletas';

const FORMAS_PAGO = ['Efectivo', 'Transferencia', 'Depósito', 'Tarjeta'];
const PERIODICIDADES = ['Semanal', 'Quincenal', 'Mensual'];

function motosDisponibles() {
  return getAll(MOTOS_COLLECTION).filter((m) => m.estado === 'disponible');
}

function ventaRow(venta) {
  const tipoBadge = venta.tipo === 'credito'
    ? `<span class="badge info">Crédito</span>`
    : `<span class="badge ok">Contado</span>`;
  return `
    <div class="card" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div style="font-weight:600;font-size:14px;">${venta.clienteNombre}</div>
          <div class="mono" style="font-size:11px;color:var(--text-dim);">${venta.motoResumen} · ${venta.fecha}</div>
        </div>
        ${tipoBadge}
      </div>
      <div class="grid grid-3" style="gap:8px;margin-top:8px;">
        <div><div style="font-size:10px;color:var(--text-dim);">TOTAL</div><div class="mono" style="font-size:13px;">${money(venta.total)}</div></div>
        <div><div style="font-size:10px;color:var(--text-dim);">UTILIDAD</div><div class="mono" style="font-size:13px;color:${venta.utilidad>=0?'var(--ok)':'var(--danger)'};">${money(venta.utilidad)}</div></div>
        ${venta.tipo === 'credito'
          ? `<div><div style="font-size:10px;color:var(--text-dim);">PAGO ${venta.periodicidad?.toUpperCase()||''}</div><div class="mono" style="font-size:13px;">${money(venta.importePago)}</div></div>`
          : `<div><div style="font-size:10px;color:var(--text-dim);">FORMA</div><div class="mono" style="font-size:13px;">${venta.formaPago}</div></div>`
        }
      </div>
    </div>
  `;
}

function renderList(container) {
  const ventas = getAll(COLLECTION).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const mesActual = hoyISO().slice(0, 7);
  const delMes = ventas.filter((v) => (v.fecha || '').startsWith(mesActual));
  const totalMes = delMes.reduce((s, v) => s + Number(v.total || 0), 0);
  const utilidadMes = delMes.reduce((s, v) => s + Number(v.utilidad || 0), 0);

  container.innerHTML = `
    <div class="section-head"><h2>Este mes</h2></div>
    <div class="grid grid-3">
      <div class="card stat-card"><div class="stat-value">${delMes.length}</div><div class="stat-label">Ventas</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:15px;">${money(totalMes)}</div><div class="stat-label">Total</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:15px;">${money(utilidadMes)}</div><div class="stat-label">Utilidad</div></div>
    </div>

    <div class="section-head"><h2>Historial</h2><span class="sub">${ventas.length} total</span></div>
    <div id="ventas-list">
      ${ventas.length ? ventas.map(ventaRow).join('') : `
        <div class="card empty-state">
          <div class="ico">💰</div>
          <div class="txt">Sin ventas registradas. Usa el botón "+" para capturar la primera.</div>
        </div>
      `}
    </div>
  `;
}

// ---------------------------------------------------------------------
function openForm(container) {
  const disponibles = motosDisponibles();

  if (disponibles.length === 0) {
    alert('No hay motocicletas disponibles en inventario. Agrega una primero en el módulo de Motocicletas.');
    return;
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:520px;max-height:90vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:18px 16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="font-size:16px;">Nueva venta</h2>
        <button id="form-close" style="background:none;border:none;color:var(--text-dim);font-size:22px;">×</button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <button type="button" id="tipo-contado" class="tipo-btn active" style="flex:1;padding:10px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:#0A0C10;font-weight:700;font-size:13px;">Contado</button>
        <button type="button" id="tipo-credito" class="tipo-btn" style="flex:1;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-weight:700;font-size:13px;">Crédito</button>
      </div>

      <form id="venta-form" style="display:flex;flex-direction:column;gap:10px;">
        <input type="hidden" name="tipo" value="contado">

        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Motocicleta *</label>
          <select name="motoId" required style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
            ${disponibles.map(m => `<option value="${m.id}">${m.marca} ${m.modelo} ${m.anio} — ${money(m.precioContado)}</option>`).join('')}
          </select>
        </div>

        <div style="display:flex;gap:8px;">
          <div style="flex:1;">
            <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Cliente (nombre) *</label>
            <input type="text" name="clienteNombre" required style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
          </div>
          <div style="flex:1;">
            <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">WhatsApp</label>
            <input type="tel" name="clienteTelefono" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
          </div>
        </div>

        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Fecha</label>
          <input type="date" name="fecha" value="${hoyISO()}" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
        </div>

        <!-- ---- Campos CONTADO ---- -->
        <div class="campos-contado" style="display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;gap:8px;">
            <div style="flex:1;">
              <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Descuento</label>
              <input type="number" name="descuento" value="0" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
            </div>
            <div style="flex:1;">
              <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Gastos</label>
              <input type="number" name="gastosVenta" value="0" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
            </div>
          </div>
          <div>
            <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Forma de pago</label>
            <select name="formaPago" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
              ${FORMAS_PAGO.map(f => `<option value="${f}">${f}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- ---- Campos CRÉDITO ---- -->
        <div class="campos-credito" style="display:none;flex-direction:column;gap:10px;">
          <div style="display:flex;gap:8px;">
            <div style="flex:1;">
              <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Enganche</label>
              <input type="number" name="enganche" value="0" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
            </div>
            <div style="flex:1;">
              <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Interés (%)</label>
              <input type="number" name="interesPct" value="0" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <div style="flex:1;">
              <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Núm. de pagos</label>
              <input type="number" name="numPagos" value="12" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
            </div>
            <div style="flex:1;">
              <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Periodicidad</label>
              <select name="periodicidad" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
                ${PERIODICIDADES.map(p => `<option value="${p}" ${p==='Quincenal'?'selected':''}>${p}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Fecha primer pago</label>
            <input type="date" name="fechaPrimerPago" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
          </div>
        </div>

        <div id="calc-preview" class="card" style="background:var(--surface-2);"></div>

        <button type="submit" style="margin-top:6px;padding:12px;border:none;border-radius:8px;background:var(--accent);color:#0A0C10;font-weight:700;font-size:14px;">
          Registrar venta
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  const form = overlay.querySelector('#venta-form');
  const tipoInput = form.querySelector('input[name="tipo"]');
  const btnContado = overlay.querySelector('#tipo-contado');
  const btnCredito = overlay.querySelector('#tipo-credito');
  const campoContado = overlay.querySelector('.campos-contado');
  const campoCredito = overlay.querySelector('.campos-credito');

  function setTipo(tipo) {
    tipoInput.value = tipo;
    const esCredito = tipo === 'credito';
    campoContado.style.display = esCredito ? 'none' : 'flex';
    campoCredito.style.display = esCredito ? 'flex' : 'none';
    btnContado.classList.toggle('active', !esCredito);
    btnCredito.classList.toggle('active', esCredito);
    [btnContado, btnCredito].forEach((b) => {
      const isActive = b.classList.contains('active');
      b.style.background = isActive ? 'var(--accent)' : 'var(--surface-2)';
      b.style.color = isActive ? '#0A0C10' : 'var(--text)';
      b.style.borderColor = isActive ? 'var(--accent)' : 'var(--border)';
    });
    updatePreview();
  }
  btnContado.addEventListener('click', () => setTipo('contado'));
  btnCredito.addEventListener('click', () => setTipo('credito'));

  function motoSeleccionada() {
    const id = form.motoId.value;
    return disponibles.find((m) => m.id === id);
  }

  function updatePreview() {
    const moto = motoSeleccionada();
    if (!moto) return;
    const fd = new FormData(form);
    const tipo = fd.get('tipo');
    const costoTotal = calcularCostoTotal(moto.costoAdquisicion, moto.gastosAdicionales);

    if (tipo === 'contado') {
      const descuento = Number(fd.get('descuento')) || 0;
      const gastos = Number(fd.get('gastosVenta')) || 0;
      const total = moto.precioContado - descuento + gastos;
      const utilidad = calcularUtilidadEstimada(total, costoTotal + gastos);
      overlay.querySelector('#calc-preview').innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:var(--text-dim);">Total a cobrar</span><span class="mono">${money(total)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;"><span style="color:var(--text-dim);">Utilidad</span><span class="mono" style="color:${utilidad>=0?'var(--ok)':'var(--danger)'};">${money(utilidad)}</span></div>
      `;
    } else {
      const precio = moto.precioCredito || moto.precioContado;
      const enganche = Number(fd.get('enganche')) || 0;
      const interesPct = Number(fd.get('interesPct')) || 0;
      const numPagos = Number(fd.get('numPagos')) || 1;
      const saldoFinanciado = calcularSaldoFinanciado(precio, enganche);
      const interesTotal = saldoFinanciado * (interesPct / 100);
      const totalAPagar = saldoFinanciado + interesTotal;
      const importePago = numPagos > 0 ? totalAPagar / numPagos : totalAPagar;
      const utilidad = calcularUtilidadEstimada(precio, costoTotal);
      overlay.querySelector('#calc-preview').innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:var(--text-dim);">Saldo financiado</span><span class="mono">${money(saldoFinanciado)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;"><span style="color:var(--text-dim);">Total a pagar (con interés)</span><span class="mono">${money(totalAPagar)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;"><span style="color:var(--text-dim);">Importe por pago</span><span class="mono">${money(importePago)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;"><span style="color:var(--text-dim);">Utilidad (sobre precio de venta)</span><span class="mono" style="color:${utilidad>=0?'var(--ok)':'var(--danger)'};">${money(utilidad)}</span></div>
      `;
    }
  }
  form.addEventListener('input', updatePreview);
  setTimeout(updatePreview, 0);

  overlay.querySelector('#form-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const moto = motoSeleccionada();
    if (!moto) return;
    const fd = new FormData(form);
    const tipo = fd.get('tipo');
    const costoTotal = calcularCostoTotal(moto.costoAdquisicion, moto.gastosAdicionales);
    const vendedor = session?.nombre || session?.user?.email || 'N/D';

    let venta = {
      id: uid(),
      tipo,
      motoId: moto.id,
      motoResumen: `${moto.marca} ${moto.modelo} ${moto.anio}`,
      clienteNombre: fd.get('clienteNombre'),
      clienteTelefono: fd.get('clienteTelefono'),
      fecha: fd.get('fecha') || hoyISO(),
      vendedor,
    };

    if (tipo === 'contado') {
      const descuento = Number(fd.get('descuento')) || 0;
      const gastos = Number(fd.get('gastosVenta')) || 0;
      const total = moto.precioContado - descuento + gastos;
      venta = {
        ...venta,
        precio: moto.precioContado,
        descuento,
        gastos,
        total,
        formaPago: fd.get('formaPago'),
        utilidad: calcularUtilidadEstimada(total, costoTotal + gastos),
      };
    } else {
      const precio = moto.precioCredito || moto.precioContado;
      const enganche = Number(fd.get('enganche')) || 0;
      const interesPct = Number(fd.get('interesPct')) || 0;
      const numPagos = Number(fd.get('numPagos')) || 1;
      const periodicidad = fd.get('periodicidad');
      const saldoFinanciado = calcularSaldoFinanciado(precio, enganche);
      const interesTotal = saldoFinanciado * (interesPct / 100);
      const totalAPagar = saldoFinanciado + interesTotal;
      const importePago = numPagos > 0 ? Math.round((totalAPagar / numPagos) * 100) / 100 : totalAPagar;
      venta = {
        ...venta,
        precio,
        enganche,
        interesPct,
        numPagos,
        periodicidad,
        saldoFinanciado,
        totalAPagar,
        importePago,
        fechaPrimerPago: fd.get('fechaPrimerPago') || null,
        total: precio,
        utilidad: calcularUtilidadEstimada(precio, costoTotal),
        creditoEstado: 'activo',
      };
    }

    save(COLLECTION, venta);
    // La moto vendida sale del inventario disponible (sección 14/15: "actualizar inventario")
    save(MOTOS_COLLECTION, { ...moto, estado: 'vendida' });

    overlay.remove();
    renderList(container);
  });
}

// ---------------------------------------------------------------------
export function renderVentas(container) {
  renderList(container);
}

export function abrirNuevaVenta(container) {
  openForm(container);
}
