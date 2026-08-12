// ==========================================================================
// MotoControl — contratos.js
// Módulo de Contratos (secciones 22-29). Se genera a partir de una venta a
// crédito ya existente — no vuelve a pedir información que el sistema ya
// conoce (regla 57). Firma digital en canvas + PDF descargable/compartible.
//
// TODO(Configuración): estos datos de empresa y el texto de compromiso de
// pago deben moverse a Configuración → Documentos (sección 24, 51) cuando
// se construya ese módulo. Por ahora son constantes editables aquí mismo.
// ==========================================================================

import { getAll, save } from './data.js';
import { money, uid, hoyISO, calcularEstadoCredito } from './utilidades.js';

const COLLECTION = 'contratos';

const EMPRESA = {
  nombre: 'MotoControl',       // TODO: reemplazar con el nombre real del negocio
  telefono: '',                 // TODO
  whatsapp: '',                 // TODO
  direccion: '',                 // TODO
};

const TEXTO_COMPROMISO = `El cliente reconoce haber adquirido la motocicleta descrita en el presente documento y manifiesta su compromiso de cubrir el saldo pendiente conforme al calendario de pagos establecido, aceptando las condiciones acordadas entre ambas partes.`;

const ADVERTENCIA_LEGAL = 'Este documento es una plantilla administrativa. Se recomienda revisarlo con un profesional legal antes de usarlo como contrato definitivo — no tiene validez jurídica garantizada por sí mismo.';

function creditosConVenta() {
  const creditos = getAll('creditos');
  const ventas = getAll('ventas');
  const motos = getAll('motocicletas');
  const contratos = getAll(COLLECTION);
  return creditos.map((c) => {
    const venta = ventas.find((v) => v.id === c.ventaId);
    const moto = motos.find((m) => m.id === c.motoId);
    const contrato = contratos.find((k) => k.creditoId === c.id);
    return { ...c, _calc: calcularEstadoCredito(c), _venta: venta, _moto: moto, _contrato: contrato };
  });
}

// ---------------------------------------------------------------------
function itemRow(item) {
  const estadoContrato = item._contrato ? item._contrato.estado : 'pendiente';
  const badgeMap = {
    pendiente: { label: 'Contrato pendiente', color: 'danger' },
    generado: { label: 'Generado', color: 'warn' },
    firmado: { label: 'Firmado', color: 'ok' },
  };
  const meta = badgeMap[estadoContrato] || badgeMap.pendiente;

  return `
    <div class="card" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div style="font-weight:600;font-size:14px;">${item.clienteNombre}</div>
          <div class="mono" style="font-size:11px;color:var(--text-dim);">${item.numero} · ${item.motoResumen}</div>
        </div>
        <span class="badge ${meta.color}">${meta.label}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn-contrato" data-id="${item.id}" style="flex:1;padding:9px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:12px;font-weight:600;">
          ${item._contrato ? 'Ver / Descargar' : '📄 Generar contrato'}
        </button>
      </div>
    </div>
  `;
}

function renderList(container) {
  const items = creditosConVenta();
  const pendientes = items.filter((i) => !i._contrato || i._contrato.estado !== 'firmado');

  container.innerHTML = `
    <div class="section-head"><h2>Resumen</h2></div>
    <div class="grid grid-3">
      <div class="card stat-card"><div class="stat-value">${items.length}</div><div class="stat-label">Créditos</div></div>
      <div class="card stat-card"><div class="stat-value">${items.filter(i=>i._contrato?.estado==='firmado').length}</div><div class="stat-label">Firmados</div></div>
      <div class="card stat-card"><div class="stat-value">${pendientes.length}</div><div class="stat-label">Pendientes</div></div>
    </div>

    <div class="section-head"><h2>Expedientes</h2></div>
    <div id="contratos-list">
      ${items.length ? items.map(itemRow).join('') : `
        <div class="card empty-state">
          <div class="ico">📄</div>
          <div class="txt">Sin créditos todavía. Los contratos se generan a partir de una venta a crédito.</div>
        </div>
      `}
    </div>
  `;

  container.querySelectorAll('.btn-contrato').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = items.find((i) => i.id === btn.dataset.id);
      if (item) abrirContrato(container, item);
    });
  });
}

// ---------------------------------------------------------------------
function numeroContrato() {
  const existentes = getAll(COLLECTION).length;
  return `CONT-${new Date().getFullYear()}-${String(existentes + 1).padStart(3, '0')}`;
}

function abrirContrato(container, item) {
  const contratoExistente = item._contrato;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:flex-end;justify-content:center;';

  const primerVenc = item.planPagos[0]?.fecha || '—';
  const ultimoVenc = item.planPagos[item.planPagos.length - 1]?.fecha || '—';

  overlay.innerHTML = `
    <div class="card" style="width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:18px 16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <h2 style="font-size:16px;">${contratoExistente ? contratoExistente.numero : numeroContrato()}</h2>
        <button id="form-close" style="background:none;border:none;color:var(--text-dim);font-size:22px;">×</button>
      </div>
      <div style="font-size:11px;color:var(--warn);background:rgba(255,201,60,.1);padding:8px 10px;border-radius:8px;margin-bottom:14px;">
        ⚠️ ${ADVERTENCIA_LEGAL}
      </div>

      <div class="card" style="background:var(--surface-2);margin-bottom:10px;">
        <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px;">Cliente</div>
        <div style="font-size:13px;">${item.clienteNombre}${item.clienteTelefono ? ' · ' + item.clienteTelefono : ''}</div>
      </div>

      <div class="card" style="background:var(--surface-2);margin-bottom:10px;">
        <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px;">Motocicleta</div>
        <div style="font-size:13px;">${item.motoResumen}${item._moto ? ` · ${item._moto.color} · VIN ${item._moto.vin || '—'} · Motor ${item._moto.motor || '—'}` : ''}</div>
      </div>

      <div class="card" style="background:var(--surface-2);margin-bottom:10px;">
        <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px;">Financiero</div>
        <div style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-dim);">Precio</span><span class="mono">${money(item.montoOriginal)}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-dim);">Enganche</span><span class="mono">${money(item.enganche)}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-dim);">Saldo financiado</span><span class="mono">${money(item.saldoInicial)}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-dim);">Interés</span><span class="mono">${item.interesPct || 0}%</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-dim);">Pagos</span><span class="mono">${item.numPagos} · ${item.periodicidad}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-dim);">Primer / último vencimiento</span><span class="mono">${primerVenc} → ${ultimoVenc}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-dim);">Total a pagar</span><span class="mono">${money(item.totalAPagar)}</span></div>
        </div>
      </div>

      <div class="card" style="background:var(--surface-2);margin-bottom:14px;">
        <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px;">Compromiso de pago</div>
        <div style="font-size:12px;line-height:1.5;color:var(--text);">${TEXTO_COMPROMISO}</div>
      </div>

      ${contratoExistente
        ? `<div style="display:flex;gap:8px;">
             <button id="btn-pdf" style="flex:1;padding:12px;border:none;border-radius:8px;background:var(--accent);color:#0A0C10;font-weight:700;font-size:14px;">Descargar / Compartir PDF</button>
           </div>
           <div style="font-size:11px;color:var(--text-dim);margin-top:10px;">Firmado el ${contratoExistente.fechaFirma || '—'}</div>`
        : `<div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px;">Firma del cliente</div>
           <canvas id="firma-canvas" style="width:100%;height:160px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;touch-action:none;"></canvas>
           <div style="display:flex;gap:8px;margin-top:8px;">
             <button type="button" id="btn-limpiar" style="flex:1;padding:9px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);font-size:12px;">Limpiar</button>
           </div>
           <button id="btn-guardar-firma" style="width:100%;margin-top:12px;padding:12px;border:none;border-radius:8px;background:var(--accent);color:#0A0C10;font-weight:700;font-size:14px;">
             Guardar firma y generar contrato
           </button>`
      }
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#form-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  if (contratoExistente) {
    overlay.querySelector('#btn-pdf').addEventListener('click', () => {
      const doc = construirPDF(item, contratoExistente);
      compartirOPescargarPDF(doc, `${contratoExistente.numero}.pdf`);
    });
    return;
  }

  // ---- Firma digital (sección 25): funciona con dedo, stylus o mouse ----
  const canvas = overlay.querySelector('#firma-canvas');
  const ctx = canvas.getContext('2d');
  let dibujando = false;

  function ajustarCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.strokeStyle = '#EDEFF2';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }
  setTimeout(ajustarCanvas, 0);

  function posDesdeEvento(e) {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }
  function iniciar(e) { dibujando = true; const p = posDesdeEvento(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function trazar(e) { if (!dibujando) return; e.preventDefault(); const p = posDesdeEvento(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  function terminar() { dibujando = false; }

  canvas.addEventListener('pointerdown', iniciar);
  canvas.addEventListener('pointermove', trazar);
  window.addEventListener('pointerup', terminar);

  overlay.querySelector('#btn-limpiar').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  overlay.querySelector('#btn-guardar-firma').addEventListener('click', () => {
    const firmaDataUrl = canvas.toDataURL('image/png');
    const numero = numeroContrato();
    const fechaFirma = hoyISO();
    const contrato = {
      id: uid(),
      numero,
      creditoId: item.id,
      ventaId: item.ventaId,
      clienteId: null, // se vinculará cuando exista el módulo Clientes
      version: 1,
      estado: 'firmado',
      firmaDataUrl,
      fechaFirma,
      fechaCreacion: hoyISO(),
    };
    save(COLLECTION, contrato);
    overlay.remove();
    renderList(container);
    // Ofrecer descarga inmediata tras firmar
    const doc = construirPDF(item, contrato);
    compartirOPescargarPDF(doc, `${numero}.pdf`);
  });
}

// ---------------------------------------------------------------------
// Generación del PDF (sección 27)
// ---------------------------------------------------------------------
function construirPDF(item, contrato) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const margin = 15;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(EMPRESA.nombre || 'MotoControl', margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (EMPRESA.telefono) { doc.text(`Tel: ${EMPRESA.telefono}`, margin, y); y += 5; }
  if (EMPRESA.direccion) { doc.text(EMPRESA.direccion, margin, y); y += 5; }
  doc.text(`Contrato: ${contrato.numero}    Fecha: ${contrato.fechaCreacion}`, margin, y);
  y += 10;

  function seccion(titulo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(titulo, margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  }
  function linea(label, valor) {
    doc.text(`${label}: ${valor}`, margin, y);
    y += 5;
  }

  seccion('Cliente');
  linea('Nombre', item.clienteNombre);
  if (item.clienteTelefono) linea('Teléfono', item.clienteTelefono);
  y += 3;

  seccion('Motocicleta');
  linea('Descripción', item.motoResumen);
  if (item._moto) {
    linea('Color', item._moto.color || '—');
    linea('VIN', item._moto.vin || '—');
    linea('Motor', item._moto.motor || '—');
  }
  y += 3;

  seccion('Información financiera');
  linea('Precio de venta', money(item.montoOriginal));
  linea('Enganche', money(item.enganche));
  linea('Saldo financiado', money(item.saldoInicial));
  linea('Interés', `${item.interesPct || 0}%`);
  linea('Número de pagos', `${item.numPagos} (${item.periodicidad})`);
  linea('Total a pagar', money(item.totalAPagar));
  y += 3;

  seccion('Tabla de pagos');
  doc.setFontSize(9);
  item.planPagos.forEach((p) => {
    if (y > 260) { doc.addPage(); y = margin; }
    doc.text(`#${p.numero}   ${p.fecha}   ${money(p.importe)}   ${p.pagado ? 'Pagado' : 'Pendiente'}`, margin, y);
    y += 5;
  });
  y += 5;
  doc.setFontSize(10);

  if (y > 230) { doc.addPage(); y = margin; }
  seccion('Compromiso de pago');
  const compromisoLines = doc.splitTextToSize(TEXTO_COMPROMISO, 180);
  doc.text(compromisoLines, margin, y);
  y += compromisoLines.length * 5 + 8;

  if (y > 230) { doc.addPage(); y = margin; }
  doc.setFont('helvetica', 'bold');
  doc.text('Firma del cliente', margin, y);
  y += 3;
  if (contrato.firmaDataUrl) {
    doc.addImage(contrato.firmaDataUrl, 'PNG', margin, y, 70, 30);
  }
  y += 34;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Firmado el ${contrato.fechaFirma}`, margin, y);

  return doc;
}

async function compartirOPescargarPDF(doc, filename) {
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (err) {
      // El usuario canceló el share sheet — no es un error, seguimos a descarga.
    }
  }
  doc.save(filename);
}

// ---------------------------------------------------------------------
export function renderContratos(container) {
  renderList(container);
}
