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

// ---- Créditos (preparado para Fase de Créditos) ----
export function calcularSaldoFinanciado(precioVenta, enganche) {
  return (Number(precioVenta) || 0) - (Number(enganche) || 0);
}
