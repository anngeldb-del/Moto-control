// ==========================================================================
// MotoControl — service-worker.js
// Fase 1: registro mínimo (permite instalar como PWA).
// Fase 14: estrategia de cache real + sincronización offline.
// ==========================================================================

const CACHE_NAME = 'motocontrol-v3';
const SHELL_ASSETS = [
  './index.html',
  './manifest.json',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/js/dashboard.js',
  './assets/js/motocicletas.js',
  './assets/js/data.js',
  './assets/js/utilidades.js',
  './assets/js/firebase.js',
  './assets/js/auth.js',
  './assets/js/login.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fase 1: estrategia simple "cache first, fallback a red" solo para el shell.
// TODO(Fase 14): estrategia diferenciada por tipo de recurso + cola de
// sincronización para operaciones offline (ventas/pagos pendientes).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
