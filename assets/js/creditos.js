// ==========================================================================
// MotoControl — creditos.js
// Expedientes de crédito, checklist de pagos (sección 18) y control de
// morosidad (sección 20). Los créditos se generan automáticamente desde
// Ventas — este módulo es de consulta/seguimiento, no de captura.
// ==========================================================================

import { getAll } from './data.js';
import { money, calcularEstadoCredito } from './utilidades.js';

const COLLECTION = 'creditos';

const ESTADO_META = {
  al_corriente: { label: 'Al corriente', color: 'ok' },
  proximo: { label: 'Próximo a vencer', color: 'warn' },
  vencido: { label: 'Vencido', color: 'danger' },
  moroso: { label: 'Moroso', color: 'danger' },
  liquidado: { label: 'Liquidado', color: 'info' },
};

function conEstado() {
  return getAll(COLLECTION).map((c) => ({ ...c, _calc: calcularEstadoCredito(c) }));
}

function waLink(telefono, mensaje) {
  const tel = (telefono || '').replace(/\D/g, '');
  return `https://wa.me/${tel ? '52' + tel : ''}?text=${encodeURIComponent(mensaje)}`;
}

function mensajeRecordatorio(c) {
  const prox = c._calc.proximoPago;
  return `Hola ${c.clienteNombre}. Te recordamos tu pago de tu crédito ${c.numero} (${c.motoResumen}) por ${money(prox ? prox.importe : c._calc.saldoActual)}${prox ? ' con fecha ' + prox.fecha : ''}. Saldo actual: ${money(c._calc.saldoActual)}. Gracias.`;
}

// ---------------------------------------------------------------------
function creditoCard(c) {
  const meta = ESTADO_META[c._calc.estado];
  const prox = c._calc.proximoPago;
  return `
    <div class="card" style="margin-bottom:10px;" data-credito-id="${c.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div style="font-weight:600;font-size:14px;">${c.clienteNombre}</div>
          <div class="mono" style="font-size:11px;color:var(--text-dim);">${c.numero} · ${c.motoResumen}</div>
        </div>
        <span class="badge ${meta.color}">${meta.label}${c._calc.diasAtraso > 0 ? ' · ' + c._calc.diasAtraso + 'd' : ''}</span>
      </div>
      <div class="grid grid-3" style="gap:8px;margin-top:8px;">
        <div><div style="font-size:10px;color:var(--text-dim);">SALDO</div><div class="mono" style="font-size:13px;">${money(c._calc.saldoActual)}</div></div>
        <div><div style="font-size:10px;color:var(--text-dim);">PRÓXIMO PAGO</div><div class="mono" style="font-size:13px;">${prox ? money(prox.importe) : '—'}</div></div>
        <div><div style="font-size:10px;color:var(--text-dim);">FECHA</div><div class="mono" style="font-size:13px;">${prox ? prox.fecha : '—'}</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn-detalle" data-id="${c.id}" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:12px;font-weight:600;">Ver checklist</button>
        ${c.clienteTelefono ? `<a href="${waLink(c.clienteTelefono, mensajeRecordatorio(c))}" target="_blank" rel="noopener" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--ok);font-size:12px;font-weight:600;">📲 WhatsApp</a>` : ''}
      </div>
    </div>
  `;
}

function rankingMorosos(creditos) {
  const morosos = creditos.filter((c) => c._calc.diasAtraso > 0).sort((a, b) => b._calc.diasAtraso - a._calc.diasAtraso);
  if (morosos.length === 0) return '';
  return `
    <div class="section-head"><h2>Clientes con mayor atraso</h2><span class="sub">${morosos.length}</span></div>
    <div class="card" style="margin-bottom:14px;">
      ${morosos.slice(0, 5).map((c) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:13px;font-weight:600;">${c.clienteNombre}</div>
            <div class="mono" style="font-size:11px;color:var(--text-dim);">${c.numero} · ${money(c._calc.saldoActual)} saldo</div>
          </div>
          <span class="badge danger">${c._calc.diasAtraso}d</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------------------------------------------------------------------
function renderChecklist(container, credito) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:flex-end;justify-content:center;';
  const filas = credito.planPagos.map((p) => {
    const hoy = new Date().toISOString().slice(0, 10);
    let icono = '🟡', texto = 'Próximo';
    if (p.pagado) { icono = '🟢'; texto = 'Pagado'; }
    else if (p.fecha < hoy) { icono = '🔴'; texto = 'Vencido'; }
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <span class="mono" style="color:var(--text-dim);">#${p.numero}</span>
        <span class="mono">${p.fecha}</span>
        <span class="mono">${money(p.importe)}</span>
        <span>${icono} <span style="font-size:11px;color:var(--text-dim);">${texto}</span></span>
      </div>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:520px;max-height:88vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:18px 16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <h2 style="font-size:16px;">${credito.numero}</h2>
        <button id="checklist-close" style="background:none;border:none;color:var(--text-dim);font-size:22px;">×</button>
      </div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:14px;">${credito.clienteNombre} · ${credito.motoResumen}</div>
      <div style="display:flex;flex-direction:column;">${filas}</div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:13px;">
        <span style="color:var(--text-dim);">Total a pagar</span><span class="mono">${money(credito.totalAPagar)}</span>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:10px;">
        Registrar pagos individuales llega en el módulo de Pagos (siguiente fase). Este checklist es de consulta.
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#checklist-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ---------------------------------------------------------------------
export function renderCreditos(container) {
  const creditos = conEstado();
  const activos = creditos.filter((c) => c._calc.estado !== 'liquidado');
  const totalFinanciado = creditos.reduce((s, c) => s + Number(c.totalFinanciado || 0), 0);
  const saldoTotal = creditos.reduce((s, c) => s + c._calc.saldoActual, 0);

  container.innerHTML = `
    <div class="section-head"><h2>Resumen</h2></div>
    <div class="grid grid-3">
      <div class="card stat-card"><div class="stat-value">${activos.length}</div><div class="stat-label">Créditos activos</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:15px;">${money(totalFinanciado)}</div><div class="stat-label">Total financiado</div></div>
      <div class="card stat-card"><div class="stat-value" style="font-size:15px;">${money(saldoTotal)}</div><div class="stat-label">Saldo pendiente</div></div>
    </div>

    ${rankingMorosos(creditos)}

    <div class="section-head"><h2>Expedientes</h2><span class="sub">${creditos.length} total</span></div>
    <div id="creditos-list">
      ${creditos.length ? creditos.map(creditoCard).join('') : `
        <div class="card empty-state">
          <div class="ico">📋</div>
          <div class="txt">Sin créditos todavía. Se generan automáticamente al registrar una venta a crédito.</div>
        </div>
      `}
    </div>
  `;

  container.querySelectorAll('.btn-detalle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const credito = creditos.find((c) => c.id === btn.dataset.id);
      if (credito) renderChecklist(container, credito);
    });
  });
}
