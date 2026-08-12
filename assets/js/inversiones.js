// ==========================================================================
// MotoControl — inversiones.js
// Módulo de Inversiones (sección 34). Dinero invertido en el negocio:
// compra de motos, refacciones, herramientas, etc. — distinto de Gastos
// (operación diaria).
// ==========================================================================

import { getAll, save, remove } from './data.js';
import { money, uid, hoyISO } from './utilidades.js';

const COLLECTION = 'inversiones';
const CATEGORIAS = ['Compra de motocicletas', 'Refacciones', 'Transporte', 'Publicidad', 'Herramientas', 'Documentación', 'Reparaciones', 'Otros'];
const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Depósito', 'Tarjeta'];

function inversionRow(inv) {
  return `
    <div class="card" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;" data-id="${inv.id}">
      <div>
        <div style="font-weight:600;font-size:14px;">${inv.concepto}</div>
        <div class="mono" style="font-size:11px;color:var(--text-dim);">${inv.categoria} · ${inv.fecha}${inv.motoResumen ? ' · ' + inv.motoResumen : ''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="mono" style="font-size:14px;">${money(inv.monto)}</span>
        <button class="btn-del" data-id="${inv.id}" style="background:none;border:none;color:var(--text-dim);font-size:16px;">×</button>
      </div>
    </div>
  `;
}

function renderList(container) {
  const inversiones = getAll(COLLECTION).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const totalInvertido = inversiones.reduce((s, i) => s + Number(i.monto || 0), 0);
  const mesActual = hoyISO().slice(0, 7);
  const delMes = inversiones.filter((i) => (i.fecha || '').startsWith(mesActual)).reduce((s, i) => s + Number(i.monto || 0), 0);

  container.innerHTML = `
    <div class="section-head"><h2>Resumen</h2></div>
    <div class="grid grid-2">
      <div class="card stat-card"><div class="stat-value" style="font-size:16px;">${money(totalInvertido)}</div><div class="stat-label">Invertido total</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:16px;">${money(delMes)}</div><div class="stat-label">Este mes</div></div>
    </div>

    <div class="section-head"><h2>Historial</h2><span class="sub">${inversiones.length} total</span></div>
    <div id="inversiones-list">
      ${inversiones.length ? inversiones.map(inversionRow).join('') : `
        <div class="card empty-state"><div class="ico">📈</div><div class="txt">Sin inversiones registradas. Usa "+" para agregar la primera.</div></div>
      `}
    </div>
  `;

  container.querySelectorAll('.btn-del').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('¿Eliminar esta inversión?')) return;
      remove(COLLECTION, btn.dataset.id);
      renderList(container);
    });
  });
}

function openForm(container) {
  const motos = getAll('motocicletas');
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:480px;border-radius:16px 16px 0 0;padding:18px 16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="font-size:16px;">Nueva inversión</h2>
        <button id="form-close" style="background:none;border:none;color:var(--text-dim);font-size:22px;">×</button>
      </div>
      <form id="inv-form" style="display:flex;flex-direction:column;gap:10px;">
        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Concepto *</label>
          <input type="text" name="concepto" required style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
        </div>
        <div style="display:flex;gap:8px;">
          <div style="flex:1;">
            <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Categoría</label>
            <select name="categoria" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
              ${CATEGORIAS.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1;">
            <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Monto *</label>
            <input type="number" name="monto" required style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
          </div>
        </div>
        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Proveedor</label>
          <input type="text" name="proveedor" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
        </div>
        <div style="display:flex;gap:8px;">
          <div style="flex:1;">
            <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Fecha</label>
            <input type="date" name="fecha" value="${hoyISO()}" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
          </div>
          <div style="flex:1;">
            <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Método de pago</label>
            <select name="metodoPago" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
              ${METODOS_PAGO.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Motocicleta relacionada (opcional)</label>
          <select name="motoId" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
            <option value="">— Ninguna —</option>
            ${motos.map(m => `<option value="${m.id}">${m.marca} ${m.modelo} ${m.anio}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Notas</label>
          <textarea name="notas" rows="2" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;resize:vertical;"></textarea>
        </div>
        <button type="submit" style="margin-top:6px;padding:12px;border:none;border-radius:8px;background:var(--accent);color:#0A0C10;font-weight:700;font-size:14px;">Guardar inversión</button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#form-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#inv-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const motoId = fd.get('motoId');
    const moto = motoId ? motos.find((m) => m.id === motoId) : null;
    save(COLLECTION, {
      id: uid(),
      concepto: fd.get('concepto'),
      categoria: fd.get('categoria'),
      monto: Number(fd.get('monto')) || 0,
      proveedor: fd.get('proveedor'),
      fecha: fd.get('fecha') || hoyISO(),
      metodoPago: fd.get('metodoPago'),
      motoId: motoId || null,
      motoResumen: moto ? `${moto.marca} ${moto.modelo} ${moto.anio}` : null,
      notas: fd.get('notas'),
    });
    overlay.remove();
    renderList(container);
  });
}

export function renderInversiones(container) { renderList(container); }
export function abrirNuevaInversion(container) { openForm(container); }
