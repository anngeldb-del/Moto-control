// ==========================================================================
// MotoControl — utilidades.js
// Cálculos centralizados (sección 49) — evita duplicar lógica entre módulos.
// ==========================================================================

export function money(n) {
  const v = Number(n) || 0;
  return '$' + Math.round(v).toLocaleString('es-MX');
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

// ---- Motocicletas ----
export function calcularCostoTotal(costoAdquisicion, gastosAdicionales) {
  return (Number(costoAdquisicion) || 0) + (Number(gastosAdicionales) || 0);
}

export function calcularUtilidadEstimada(precioVenta, costoTotal) {
  return (Number(precioVenta) || 0) - (Number(costoTotal) || 0);
}

export function diasEnInventario(fechaAdquisicionISO) {
  if (!fechaAdquisicionISO) return 0;
  const inicio = new Date(fechaAdquisicionISO);
  const hoy = new Date();
  const ms = hoy - inicio;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// ---- Créditos ----
export function calcularSaldoFinanciado(precioVenta, enganche) {
  return (Number(precioVenta) || 0) - (Number(enganche) || 0);
}

// Genera el plan de pagos (sección 17) a partir del total a pagar,
// número de pagos y periodicidad. El último pago absorbe el remanente
// de redondeo para que la suma cuadre exacto con totalAPagar.
export function generarPlanPagos(totalAPagar, numPagos, periodicidad, fechaInicioISO) {
  const n = Math.max(1, Number(numPagos) || 1);
  const importeBase = Math.round((totalAPagar / n) * 100) / 100;
  const plan = [];
  let acumulado = 0;
  let fecha = fechaInicioISO ? new Date(fechaInicioISO + 'T00:00:00') : new Date();

  for (let i = 1; i <= n; i++) {
    const esUltimo = i === n;
    const importe = esUltimo ? Math.round((totalAPagar - acumulado) * 100) / 100 : importeBase;
    acumulado += importe;
    plan.push({
      numero: i,
      fecha: fecha.toISOString().slice(0, 10),
      importe,
      pagado: false,
      fechaPago: null,
    });
    fecha = sumarPeriodo(fecha, periodicidad);
  }
  return plan;
}

function sumarPeriodo(fecha, periodicidad) {
  const f = new Date(fecha);
  if (periodicidad === 'Semanal') f.setDate(f.getDate() + 7);
  else if (periodicidad === 'Mensual') f.setMonth(f.getMonth() + 1);
  else f.setDate(f.getDate() + 15); // Quincenal (default)
  return f;
}

// Estado del crédito + días de atraso, calculado a partir del plan de
// pagos (sección 16, 20). No depende de un módulo de Pagos separado:
// cuando exista, ese módulo solo marcará `pagado:true` en el item del plan.
export function calcularEstadoCredito(credito) {
  const plan = credito.planPagos || [];
  const hoy = new Date(hoyISO() + 'T00:00:00');
  const totalPagado = plan.filter((p) => p.pagado).reduce((s, p) => s + Number(p.importe), 0);
  const saldoActual = Math.max(0, Number(credito.totalAPagar || 0) - totalPagado);

  if (saldoActual <= 0) {
    return { estado: 'liquidado', diasAtraso: 0, saldoActual: 0, proximoPago: null };
  }

  const pendientes = plan.filter((p) => !p.pagado);
  const vencidos = pendientes.filter((p) => new Date(p.fecha + 'T00:00:00') < hoy);
  const proximoPago = pendientes.find((p) => !vencidos.includes(p)) || pendientes[0] || null;

  let diasAtraso = 0;
  if (vencidos.length > 0) {
    const masAntiguo = vencidos.reduce((a, b) => (a.fecha < b.fecha ? a : b));
    diasAtraso = Math.floor((hoy - new Date(masAntiguo.fecha + 'T00:00:00')) / (1000 * 60 * 60 * 24));
  }

  let estado = 'al_corriente';
  if (diasAtraso > 30) estado = 'moroso';
  else if (diasAtraso > 0) estado = 'vencido';
  else if (proximoPago && (new Date(proximoPago.fecha + 'T00:00:00') - hoy) / 86400000 <= 3) estado = 'proximo';

  return { estado, diasAtraso, saldoActual, proximoPago };
}

// ---- Exportación CSV (sección 38 — Reportes) ----
export function descargarCSV(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
