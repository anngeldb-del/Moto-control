// ==========================================================================
// MotoControl — auth.js
// Fase 2: autenticación + roles (ADMINISTRADOR / EMPLEADO — sección 40).
// ==========================================================================

import {
  initFirebase, auth, db,
  signInWithEmailAndPassword, signOut, onAuthStateChanged, doc, getDoc,
} from './firebase.js';

// ---------------------------------------------------------------------
// Estado de sesión en memoria (fuente de verdad para el router)
// ---------------------------------------------------------------------
export const session = {
  ready: false,      // true una vez que Firebase ya resolvió el estado inicial
  user: null,        // objeto de Firebase Auth (o null)
  role: null,         // 'administrador' | 'empleado' | null
  nombre: null,
};

const listeners = [];
export function onSessionChange(fn) { listeners.push(fn); }
function notify() { listeners.forEach((fn) => fn(session)); }

// ---------------------------------------------------------------------
// Roles y permisos por módulo (sección 40)
// EMPLEADO: clientes, motocicletas/inventario, ventas, créditos (consulta),
//           pagos, contratos/documentos.
// ADMINISTRADOR: todo lo anterior + finanzas, reportes, inversiones,
//                gastos, configuración, administración de usuarios.
// ---------------------------------------------------------------------
const ADMIN_ONLY_ROUTES = new Set([
  'finanzas', 'reportes', 'inversiones', 'gastos', 'configuracion',
]);

export function canAccess(route, role) {
  if (role === 'administrador') return true;
  return !ADMIN_ONLY_ROUTES.has(route);
}

// ---------------------------------------------------------------------
// Login / logout
// ---------------------------------------------------------------------
export async function login(email, password) {
  if (!initFirebase()) {
    return { ok: false, error: 'Firebase no está configurado todavía (falta DEFAULT_FB_CONFIG en firebase.js).' };
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapAuthError(err.code) };
  }
}

export async function logout() {
  if (auth) await signOut(auth);
}

function mapAuthError(code) {
  const map = {
    'auth/invalid-email': 'Correo inválido.',
    'auth/user-disabled': 'Este usuario está deshabilitado.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  };
  return map[code] || 'No se pudo iniciar sesión. Intenta de nuevo.';
}

// ---------------------------------------------------------------------
// Carga el documento del usuario (colección "usuarios") para saber su rol.
// Estructura esperada en Firestore: usuarios/{uid} = { nombre, rol, activo }
// ---------------------------------------------------------------------
async function loadUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    if (snap.exists()) {
      const data = snap.data();
      return { rol: data.rol || 'empleado', nombre: data.nombre || null, activo: data.activo !== false };
    }
  } catch (err) {
    console.warn('[MotoControl] No se pudo leer el perfil de usuario:', err);
  }
  return { rol: 'empleado', nombre: null, activo: true };
}

// ---------------------------------------------------------------------
// Inicialización: se llama una sola vez desde app.js
// ---------------------------------------------------------------------
export function initAuth() {
  if (!initFirebase()) {
    session.ready = true;
    session.user = null;
    session.role = null;
    notify();
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await loadUserProfile(user.uid);
      if (!profile.activo) {
        await logout();
        session.user = null;
        session.role = null;
        session.nombre = null;
      } else {
        session.user = user;
        session.role = profile.rol;
        session.nombre = profile.nombre;
      }
    } else {
      session.user = null;
      session.role = null;
      session.nombre = null;
    }
    session.ready = true;
    notify();
  });
}
