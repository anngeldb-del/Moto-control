// ==========================================================================
// MotoControl — configuracion.js
// Módulo de Configuración (sección 51). Reemplaza las constantes que
// vivían hardcodeadas en contratos.js (EMPRESA, TEXTO_COMPROMISO).
// Persiste en un solo documento (no una colección de varios registros).
// ==========================================================================

import { getAll, save } from './data.js';
import { uid } from './utilidades.js';

const COLLECTION = 'configuracion';
const DOC_ID = 'config-general'; // documento único — no hay múltiples configuraciones

const DEFAULTS = {
  id: DOC_ID,
  // ---- Empresa ----
  nombreEmpresa: 'MotoControl',
  telefono: '',
  whatsapp: '',
  direccion: '',
  correo: '',
  rfc: '',
  // ---- Financiera ----
  moneda: 'MXN',
  interesPorDefecto: 0,
  recargoPorDefecto: 0,
  periodicidadPorDefecto: 'Quincenal',
  // ---- Documental ----
  textoCompromiso: 'El cliente reconoce haber adquirido la motocicleta descrita en el presente documento y manifiesta su compromiso de cubrir el saldo pendiente conforme al calendario de pagos establecido, aceptando las condiciones acordadas entre ambas partes.',
  piePagina: '',
  firmaVendedorObligatoria: false,
};

// ---------------------------------------------------------------------
// Lectura pública — la usan contratos.js y ventas.js en vez de constantes.
// ---------------------------------------------------------------------
export function getConfiguracion() {
  const existente = getAll(COLLECTION).find((c) => c.id === DOC_ID);
  return existente ? { ...DEFAULTS, ...existente } : DEFAULTS;
}

// ---------------------------------------------------------------------
function campoHtml(key, label, value, type = 'text') {
  const base = 'width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;';
  const input = type === 'textarea'
    ? `<textarea name="${key}" rows="3" style="${base}resize:vertical;">${value || ''}</textarea>`
    : type === 'checkbox'
    ? `<label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px;"><input type="checkbox" name="${key}" ${value ? 'checked' : ''}> Firma del vendedor obligatoria</label>`
    : `<input type="${type}" name="${key}" value="${value || ''}" style="${base}">`;
  return type === 'checkbox' ? input : `<div><label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">${label}</label>${input}</div>`;
}

export function renderConfiguracion(container) {
  const c = getConfiguracion();

  container.innerHTML = `
    <div class="section-head"><h2>Empresa</h2></div>
    <form id="config-form" style="display:flex;flex-direction:column;gap:10px;">
      <div class="card" style="display:flex;flex-direction:column;gap:10px;">
        ${campoHtml('nombreEmpresa', 'Nombre de la empresa', c.nombreEmpresa)}
        ${campoHtml('telefono', 'Teléfono', c.telefono, 'tel')}
        ${campoHtml('whatsapp', 'WhatsApp', c.whatsapp, 'tel')}
        ${campoHtml('correo', 'Correo', c.correo, 'email')}
        ${campoHtml('direccion', 'Dirección', c.direccion)}
        ${campoHtml('rfc', 'RFC', c.rfc)}
      </div>

      <div class="section-head"><h2>Financiera</h2></div>
      <div class="card" style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;gap:8px;">
          <div style="flex:1;">${campoHtml('interesPorDefecto', 'Interés % por defecto', c.interesPorDefecto, 'number')}</div>
          <div style="flex:1;">${campoHtml('recargoPorDefecto', 'Recargo por defecto', c.recargoPorDefecto, 'number')}</div>
        </div>
        <div>
          <label style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">Periodicidad por defecto</label>
          <select name="periodicidadPorDefecto" style="width:100%;margin-top:4px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
            ${['Semanal', 'Quincenal', 'Mensual'].map(p => `<option value="${p}" ${p===c.periodicidadPorDefecto?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="section-head"><h2>Documental</h2></div>
      <div class="card" style="display:flex;flex-direction:column;gap:10px;">
        ${campoHtml('textoCompromiso', 'Texto de compromiso de pago (en contratos)', c.textoCompromiso, 'textarea')}
        ${campoHtml('piePagina', 'Pie de página en documentos', c.piePagina)}
        ${campoHtml('firmaVendedorObligatoria', '', c.firmaVendedorObligatoria, 'checkbox')}
      </div>

      <div id="config-saved" style="display:none;text-align:center;font-size:12px;color:var(--ok);">✓ Guardado</div>
      <button type="submit" style="padding:12px;border:none;border-radius:8px;background:var(--accent);color:#0A0C10;font-weight:700;font-size:14px;">
        Guardar configuración
      </button>
    </form>
  `;

  document.getElementById('config-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = { id: DOC_ID };
    Object.keys(DEFAULTS).forEach((key) => {
      if (key === 'id') return;
      if (key === 'firmaVendedorObligatoria') {
        data[key] = fd.get(key) === 'on';
      } else if (key === 'interesPorDefecto' || key === 'recargoPorDefecto') {
        data[key] = Number(fd.get(key)) || 0;
      } else {
        data[key] = fd.get(key) || '';
      }
    });
    save(COLLECTION, data);
    const saved = document.getElementById('config-saved');
    saved.style.display = 'block';
    setTimeout(() => { saved.style.display = 'none'; }, 2000);
  });
}
