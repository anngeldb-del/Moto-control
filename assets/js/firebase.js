// ==========================================================================
// MotoControl — firebase.js
// Fase 2: conexión real a Firebase (Auth + Firestore) vía SDK modular CDN.
// Sin build tools — mismo patrón que RESET ERP / Climas Hernández.
//
// Nota (lección de HD Crédit): en GitHub Pages, cargar la config desde un
// archivo externo separado puede fallar por orden de carga / caché del SW.
// Por eso el objeto de config se embebe directamente aquí como constante.
// ==========================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, enableIndexedDbPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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

const CONFIGURED = DEFAULT_FB_CONFIG.apiKey !== 'PENDIENTE_FASE_2';

export let app = null;
export let auth = null;
export let db = null;

export function initFirebase() {
  if (!CONFIGURED) {
    console.warn('[MotoControl] Falta pegar las credenciales reales en DEFAULT_FB_CONFIG.');
    return false;
  }
  if (app) return true; // ya inicializado

  app = initializeApp(DEFAULT_FB_CONFIG);
  auth = getAuth(app);
  db = getFirestore(app);

  // Cache local para uso offline básico (sección 44 del spec).
  // Falla silenciosamente en pestañas múltiples o navegadores sin soporte;
  // no es crítico para Fase 2.
  enableIndexedDbPersistence(db).catch((err) => {
    console.warn('[MotoControl] Persistencia offline no disponible:', err.code);
  });

  return true;
}

export { signInWithEmailAndPassword, signOut, onAuthStateChanged, doc, getDoc };
