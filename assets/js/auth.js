// ==========================================================================
// MotoControl — auth.js
// Fase 2: autenticación + roles (ADMINISTRADOR / EMPLEADO — sección 40).
// Consume el SDK de Firebase vía getSdk() (import dinámico en firebase.js)
// — este archivo NUNCA importa nada del CDN de Firebase de forma estática.
// ==========================================================================

import { initFirebase, auth, db, CONFIGURED, getSdk } from './firebase.js';

// ---------------------------------------------------------------------
// Estado de sesión en memoria (fuente de verdad para el router)
// ---------------------------------------------------------------------
export const session = {
  ready: false,      // true una vez que Firebase (o el modo demo) ya resolvió el estado inicial
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
  const ok = await initFirebase();
  if (!ok) {
    return { ok: false, error: 'Firebase no está configurado todavía (falta DEFAULT_FB_CONFIG en firebase.js), o no se pudo cargar por red.' };
  }
  try {
    const { authMod } = getSdk();
    await authMod.signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapAuthError(err.code) };
  }
}

export async function logout() {
  if (session.demo) {
    session.user = null;
    session.role = null;
    session.nombre = null;
    session.demo = false;
    notify();
    return;
  }
  const sdk = getSdk();
  if (auth && sdk) await sdk.authMod.signOut(auth);
}

// ---------------------------------------------------------------------
// Modo demo — SOLO disponible mientras Firebase real no esté conectado
// (CONFIGURED === false). Permite probar toda la app en GitHub Pages sin
// esperar a tener las credenciales de Firebase. Desaparece automáticamente
// en cuanto se pega un DEFAULT_FB_CONFIG real en firebase.js.
// ---------------------------------------------------------------------
export function loginDemo() {
  if (CONFIGURED) return; // seguridad: nunca disponible con Firebase real activo
  session.user = { uid: 'demo', email: 'demo@motocontrol.local' };
  session.role = 'administrador';
  session.nombre = 'Angel (modo demo)';
  session.demo = true;
  session.ready = true;
  notify();
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
    const { fsMod } = getSdk();
    const snap = await fsMod.getDoc(fsMod.doc(db, 'usuarios', uid));
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
// Inicialización: se llama una sola vez desde app.js. Es async pero
// app.js no necesita esperarla — el router ya escucha onSessionChange
// y se vuelve a pintar solo cuando session.ready pase a true.
// ---------------------------------------------------------------------
export async function initAuth() {
  const ok = await initFirebase();
  if (!ok) {
    session.ready = true;
    session.user = null;
    session.role = null;
    notify();
    return;
  }

  const { authMod } = getSdk();
  authMod.onAuthStateChanged(auth, async (user) => {
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
