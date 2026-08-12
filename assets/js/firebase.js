// ==========================================================================
// MotoControl — firebase.js
// Fase 2: conexión real a Firebase (Auth + Firestore) vía SDK modular CDN.
// Sin build tools — mismo patrón que RESET ERP / Climas Hernández.
//
// IMPORTANTE (bug corregido): el SDK de Firebase se carga con import()
// DINÁMICO, solo dentro de initFirebase() y solo si CONFIGURED === true.
// Antes se importaba de forma estática arriba del archivo, lo que significa
// que si esa red (gstatic.com) fallaba por cualquier razón — bloqueo de
// red, extensión del navegador, hiccup momentáneo — se caía TODO el árbol
// de módulos de la app, no solo el login. Con import dinámico, mientras
// Firebase no esté configurado, la app nunca depende de que ese CDN esté
// disponible.
//
// Nota (lección de HD Crédit): el objeto de config se embebe directamente
// aquí como constante — evita fallos de carga por archivo externo separado
// en GitHub Pages.
// ==========================================================================

// ⚠️ REEMPLAZAR con las credenciales reales del proyecto Firebase.
// Crear proyecto nuevo (ej. "motocontrol-xxxxx") — NO reutilizar los
// proyectos de Alarmas RESET / HD Crédit / Climas Hernández.
export const DEFAULT_FB_CONFIG = {
  apiKey: 'PENDIENTE_FASE_2',
  authDomain: 'PENDIENTE_FASE_2.firebaseapp.com',
  projectId: 'PENDIENTE_FASE_2',
  storageBucket: 'PENDIENTE_FASE_2.appspot.com',
  messagingSenderId: 'PENDIENTE_FASE_2',
  appId: 'PENDIENTE_FASE_2',
};

export const CONFIGURED = DEFAULT_FB_CONFIG.apiKey !== 'PENDIENTE_FASE_2';

export let app = null;
export let auth = null;
export let db = null;

// Referencias a las funciones del SDK (signInWithEmailAndPassword, doc, etc.)
// Se llenan solo tras el import dinámico exitoso. auth.js las consume vía
// getSdk() en vez de importarlas directo — así nunca hay un import estático
// apuntando al CDN de Firebase en ningún archivo del proyecto.
let sdk = null;
export function getSdk() { return sdk; }

export async function initFirebase() {
  if (!CONFIGURED) {
    console.warn('[MotoControl] Falta pegar las credenciales reales en DEFAULT_FB_CONFIG.');
    return false;
  }
  if (app) return true; // ya inicializado

  try {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
    ]);

    sdk = { authMod, fsMod };
    app = initializeApp(DEFAULT_FB_CONFIG);
    auth = authMod.getAuth(app);
    db = fsMod.getFirestore(app);

    // Cache local para uso offline básico (sección 44 del spec).
    // Falla silenciosamente en pestañas múltiples o navegadores sin soporte;
    // no es crítico.
    fsMod.enableIndexedDbPersistence(db).catch((err) => {
      console.warn('[MotoControl] Persistencia offline no disponible:', err.code);
    });

    return true;
  } catch (err) {
    console.error('[MotoControl] No se pudo cargar el SDK de Firebase (red o CDN no disponible):', err);
    app = null;
    return false;
  }
}
