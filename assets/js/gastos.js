// ==========================================================================
// MotoControl — gastos.js
// Módulo de Gastos operativos (sección 35). Separado de Inversiones:
// gastos = operación del negocio (renta, nómina, etc.), no compra de activos.
// ==========================================================================

import { getAll, save, remove } from './data.js';
import { money, uid, hoyISO } from './utilidades.js';

const COLLECTION = 'gastos';
const CATEGORIAS = ['Renta', 'Servicios', 'Publicidad', 'Transporte', 'Nómina', 'Mantenimiento', 'Papelería', 'Comisiones', 'Otros'];
const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Depósito', 'Tarjeta'];

function gastoRow(g) {
  return `
    <div class="card" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;" data-id="${g.id}">
      <div>
        <div style="font-weight:600;font-size:14px;">${g.concepto}</div>
        <div class="mono" style="font-size:11px;color:var(--text-dim);">${g.categoria} · ${g.fecha} · ${g.metodoPago}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="mono" style="font-size:14px;color:var(--danger);">-${money(g.monto)}</span>
        <button class="btn-del" data-id="${g.id}" style="background:none;border:none;color:var(--text-dim);font-size:16px;">×</button>
      </div>
    </div>
  `;
}

function renderList(container) {
  const gastos = getAll(COLLECTION).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const mesActual = hoyISO().slice(0, 7);
  const delMes = gastos.filter((g) => (g.fecha || '').startsWith(mesActual));
  const totalMes = delMes.reduce((s, g) => s + Number(g.monto || 0), 0);

  const porCategoria = {};
  delMes.forEach((g) => { porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + Number(g.monto || 0); });
  const topCategorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 3);

  container.innerHTML = `
    <div class="section-head"><h2>Este mes</h2></div>
    <div class="grid grid-2">
      <div class="card stat-card"><div class="stat-value">${money(totalMes)}</div><div class="stat-label">Total gastado</div></div>
      <div class="card stat-card"><div class="stat-value">${delMes.length}</div><div class="stat-label">Movimientos</div></div>
    </div>

    ${topCategorias.length ? `
      <div class="section-head"><h2>Principales categorías</h2></div>
      <div class="card" style="margin-bottom:14px;">
        ${topCategorias.map(([cat, monto]) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;">
            <span style="color:var(--text-dim);">${cat}</span><span class="mono">${money(monto)}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="section-head"><h2>Historial</h2><span class="sub">${gastos.length} total</span></div>
    <div id="gastos-list">
      ${gastos.length ? gastos.map(gastoRow).join('') : `
        <div class="card empty-state"><div class="ico">💸</div><div class="txt">Sin gastos registrados. Usa "+" para agregar el primero.</div></div>
      `}
    </div>
  `;

  container.querySelectorAll('.btn-del').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('¿Eliminar este gasto?')) return;
      remove(COLLECTION, btn.dataset.id);
      renderList(container);
    });
  });
}

function openForm(container) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:flex-end;justify-content:center;';
  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:480px;border-radius:16px 16px 0 0;padding:18px 16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="font-size:16px;">Nuevo gasto</h2>
        <button id="form-close" style="background:none;border:none;color:var(--text-dim);font-size:22px;">×</button>
      </div>
      <form id="gasto-form" style="display:flex;flex-direction:column;gap:10px;">
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
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Notas</label>
          <textarea name="notas" rows="2" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;resize:vertical;"></textarea>
        </div>
        <button type="submit" style="margin-top:6px;padding:12px;border:none;border-radius:8px;background:var(--accent);color:#0A0C10;font-weight:700;font-size:14px;">Guardar gasto</button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#form-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#gasto-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    save(COLLECTION, {
      id: uid(),
      concepto: fd.get('concepto'),
      categoria: fd.get('categoria'),
      monto: Number(fd.get('monto')) || 0,
      fecha: fd.get('fecha') || hoyISO(),
      metodoPago: fd.get('metodoPago'),
      notas: fd.get('notas'),
    });
    overlay.remove();
    renderList(container);
  });
}

export function renderGastos(container) { renderList(container); }
export function abrirNuevoGasto(container) { openForm(container); }
