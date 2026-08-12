// ==========================================================================
// MotoControl — pagos.js
// Módulo de Pagos (sección 19). Registra un cobro contra una cuota
// específica del plan de pagos de un crédito. Al guardar, actualiza
// automáticamente el crédito (saldo/estado se recalculan solos vía
// calcularEstadoCredito en utilidades.js — no se duplica esa lógica aquí).
// ==========================================================================

import { getAll, save } from './data.js';
import { money, uid, hoyISO, calcularEstadoCredito } from './utilidades.js';

const COLLECTION = 'pagos';
const CREDITOS_COLLECTION = 'creditos';

const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Depósito', 'Tarjeta'];

function creditosConPendientes() {
  return getAll(CREDITOS_COLLECTION)
    .map((c) => ({ ...c, _calc: calcularEstadoCredito(c) }))
    .filter((c) => c._calc.estado !== 'liquidado');
}

function pagoRow(pago) {
  return `
    <div class="card" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div style="font-weight:600;font-size:14px;">${pago.clienteNombre}</div>
          <div class="mono" style="font-size:11px;color:var(--text-dim);">${pago.creditoNumero} · pago #${pago.numeroPago} · ${pago.fecha}</div>
        </div>
        <span class="badge ${pago.completo ? 'ok' : 'warn'}">${pago.completo ? 'Completo' : 'Parcial'}</span>
      </div>
      <div class="grid grid-2" style="gap:8px;margin-top:8px;">
        <div><div style="font-size:10px;color:var(--text-dim);">RECIBIDO</div><div class="mono" style="font-size:13px;">${money(pago.totalRecibido)}</div></div>
        <div><div style="font-size:10px;color:var(--text-dim);">MÉTODO</div><div class="mono" style="font-size:13px;">${pago.metodoPago}</div></div>
      </div>
    </div>
  `;
}

function renderList(container) {
  const pagos = getAll(COLLECTION).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const hoy = hoyISO();
  const mesActual = hoy.slice(0, 7);
  const cobradoHoy = pagos.filter((p) => p.fecha === hoy).reduce((s, p) => s + Number(p.totalRecibido || 0), 0);
  const cobradoMes = pagos.filter((p) => (p.fecha || '').startsWith(mesActual)).reduce((s, p) => s + Number(p.totalRecibido || 0), 0);
  const pendientes = creditosConPendientes();

  container.innerHTML = `
    <div class="section-head"><h2>Resumen</h2></div>
    <div class="grid grid-3">
      <div class="card stat-card"><div class="stat-value" style="font-size:15px;">${money(cobradoHoy)}</div><div class="stat-label">Cobrado hoy</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:15px;">${money(cobradoMes)}</div><div class="stat-label">Cobrado del mes</div></div>
      <div class="card stat-card"><div class="stat-value">${pendientes.length}</div><div class="stat-label">Créditos con saldo</div></div>
    </div>

    <div class="section-head"><h2>Historial de pagos</h2><span class="sub">${pagos.length} total</span></div>
    <div id="pagos-list">
      ${pagos.length ? pagos.map(pagoRow).join('') : `
        <div class="card empty-state">
          <div class="ico">💵</div>
          <div class="txt">Sin pagos registrados todavía. Usa el botón "+" para capturar el primero.</div>
        </div>
      `}
    </div>
  `;
}

// ---------------------------------------------------------------------
function openForm(container) {
  const creditos = creditosConPendientes();
  if (creditos.length === 0) {
    alert('No hay créditos con saldo pendiente. Los créditos se generan automáticamente al registrar una venta a crédito.');
    return;
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:520px;max-height:90vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:18px 16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="font-size:16px;">Registrar pago</h2>
        <button id="form-close" style="background:none;border:none;color:var(--text-dim);font-size:22px;">×</button>
      </div>
      <form id="pago-form" style="display:flex;flex-direction:column;gap:10px;">
        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Crédito *</label>
          <select name="creditoId" required style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
            ${creditos.map(c => `<option value="${c.id}">${c.numero} — ${c.clienteNombre} (${money(c._calc.saldoActual)} saldo)</option>`).join('')}
          </select>
        </div>

        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Cuota a pagar *</label>
          <select name="numeroPago" required style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;"></select>
        </div>

        <div style="display:flex;gap:8px;">
          <div style="flex:1;">
            <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Recargo</label>
            <input type="number" name="recargo" value="0" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
          </div>
          <div style="flex:1;">
            <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Descuento</label>
            <input type="number" name="descuento" value="0" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
          </div>
        </div>

        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Fecha</label>
          <input type="date" name="fecha" value="${hoyISO()}" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
        </div>

        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Método de pago</label>
          <select name="metodoPago" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
            ${METODOS_PAGO.map(m => `<option value="${m}">${m}</option>`).join('')}
          </select>
        </div>

        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Notas</label>
          <textarea name="notas" rows="2" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;resize:vertical;"></textarea>
        </div>

        <div id="calc-preview" class="card" style="background:var(--surface-2);"></div>

        <button type="submit" style="margin-top:6px;padding:12px;border:none;border-radius:8px;background:var(--accent);color:#0A0C10;font-weight:700;font-size:14px;">
          Registrar pago
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  const form = overlay.querySelector('#pago-form');
  const selectCredito = form.querySelector('select[name="creditoId"]');
  const selectPago = form.querySelector('select[name="numeroPago"]');

  function poblarCuotas() {
    const credito = creditos.find((c) => c.id === selectCredito.value);
    const pendientes = credito.planPagos.filter((p) => !p.pagado);
    selectPago.innerHTML = pendientes.map((p) => {
      const hoy = hoyISO();
      const marca = p.fecha < hoy ? '🔴 ' : '';
      return `<option value="${p.numero}">${marca}#${p.numero} — ${p.fecha} — ${money(p.importe)}</option>`;
    }).join('');
    updatePreview();
  }

  function cuotaSeleccionada() {
    const credito = creditos.find((c) => c.id === selectCredito.value);
    const numero = Number(selectPago.value);
    return { credito, cuota: credito.planPagos.find((p) => p.numero === numero) };
  }

  function updatePreview() {
    const { cuota } = cuotaSeleccionada();
    if (!cuota) return;
    const fd = new FormData(form);
    const recargo = Number(fd.get('recargo')) || 0;
    const descuento = Number(fd.get('descuento')) || 0;
    const totalRecibido = cuota.importe + recargo - descuento;
    const completo = totalRecibido >= cuota.importe;
    overlay.querySelector('#calc-preview').innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:var(--text-dim);">Importe programado</span><span class="mono">${money(cuota.importe)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;"><span style="color:var(--text-dim);">Total a recibir</span><span class="mono">${money(totalRecibido)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;"><span style="color:var(--text-dim);">Estado resultante</span><span class="mono" style="color:${completo?'var(--ok)':'var(--warn)'};">${completo ? 'Cuota completa' : 'Pago parcial (no cierra la cuota)'}</span></div>
    `;
  }

  selectCredito.addEventListener('change', poblarCuotas);
  form.addEventListener('input', updatePreview);
  poblarCuotas();

  overlay.querySelector('#form-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { credito, cuota } = cuotaSeleccionada();
    if (!credito || !cuota) return;
    const fd = new FormData(form);
    const recargo = Number(fd.get('recargo')) || 0;
    const descuento = Number(fd.get('descuento')) || 0;
    const totalRecibido = cuota.importe + recargo - descuento;
    const completo = totalRecibido >= cuota.importe;
    const fecha = fd.get('fecha') || hoyISO();

    save(COLLECTION, {
      id: uid(),
      creditoId: credito.id,
      creditoNumero: credito.numero,
      clienteNombre: credito.clienteNombre,
      motoResumen: credito.motoResumen,
      numeroPago: cuota.numero,
      fecha,
      recargo,
      descuento,
      totalRecibido,
      metodoPago: fd.get('metodoPago'),
      notas: fd.get('notas'),
      completo,
    });

    // Actualizar el crédito: solo se marca pagada la cuota si el cobro la
    // cubre completa. Un pago parcial queda en el historial pero la cuota
    // sigue pendiente (evita perder el dinero recibido sin cerrar el plan).
    if (completo) {
      const planActualizado = credito.planPagos.map((p) =>
        p.numero === cuota.numero ? { ...p, pagado: true, fechaPago: fecha } : p
      );
      const { _calc, ...creditoLimpio } = credito;
      save(CREDITOS_COLLECTION, { ...creditoLimpio, planPagos: planActualizado });
    }

    overlay.remove();
    renderList(container);
  });
}

// ---------------------------------------------------------------------
export function renderPagos(container) {
  renderList(container);
}

export function abrirNuevoPago(container) {
  openForm(container);
}
