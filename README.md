# MotoControl

Sistema de gestión para venta de motocicletas de contado y crédito. PWA mobile-first, sin build tools, Firebase + GitHub Pages.

## Estado: Motocicletas/Inventario completo (sobre Fase 1+2)

**Módulo Motocicletas/Inventario** (adelantado — ver "Orden real de construcción" abajo):

- CRUD completo (crear/editar/eliminar con confirmación) — todos los campos de la sección 9 del spec
- 6 estados: disponible, apartada, vendida, en reparación, en tránsito, cancelada
- Cálculo automático de costo total y utilidad estimada, visible en vivo dentro del formulario
- Vista de inventario tipo tarjeta (mobile-first): marca/modelo, precio, utilidad, días en inventario, badge de estado
- Filtros por estado y marca + búsqueda por VIN/motor/marca/modelo
- Resumen: disponibles, vendidas, valor total de inventario
- FAB contextual: en `#motocicletas` abre directamente el formulario de alta
- Capa de datos (`data.js`) desacoplada — hoy usa `localStorage`, mañana se cambia internamente por Firestore sin tocar `motocicletas.js`
- `getMotosDisponibles()` exportado para que el módulo de Ventas (siguiente) lea el catálogo sin duplicar lógica
- 4 motos DEMO precargadas la primera vez que se abre (no pisa datos reales si ya capturaste algo)

### Orden real de construcción (decidido con Angel, distinto al Prompt Maestro)

Clientes se deja para el final. Orden acordado:
**Motocicletas/Inventario → Ventas → Créditos → Pagos → Contratos → resto (Inversiones, Gastos, Finanzas, Reportes) → Clientes**

Razón: Ventas necesita seleccionar una moto del inventario; Créditos y Contratos se generan a partir de una venta. Sin inventario, nada más tiene con qué trabajar.

### Despliegue (cuando el usuario lo indique)

1. GitHub Pages primero — repo público, URL estable, se puede probar como PWA instalable
2. Firebase después — conectar `DEFAULT_FB_CONFIG`, publicar `firestore.rules`, migrar `data.js` de localStorage a Firestore

**Fase 1 — Arquitectura + interfaz + navegación.**

Entregado en esta fase:
- Estructura modular de carpetas (`assets/css`, `assets/js`, `assets/img`, `views`, `firebase`)
- Shell de la app (`index.html`) con topbar, sidebar (desktop) y bottom nav + FAB (mobile)
- Router SPA por hash (`app.js`) — única fuente de verdad de navegación en `NAV_ITEMS`
- Dashboard funcional con datos DEMO (`dashboard.js`), incluyendo el dial-gauge como elemento de identidad visual
- Identidad visual propia de MotoControl (no reutiliza la marca RESET): paleta asfalto/cromo/naranja-tacómetro, tipografía Rajdhani + Inter + JetBrains Mono
- `manifest.json` y `service-worker.js` mínimos (instalable como PWA; cache real llega en Fase 14)
- Stub de `firebase.js` con el patrón `DEFAULT_FB_CONFIG` embebido (misma lección aprendida en HDcredit1.2 — evita fallos de carga en GitHub Pages)

**Fase 2 — Firebase + Autenticación.**

Entregado en esta fase:
- `firebase.js` con SDK modular de Firebase 10.12.2 vía CDN (sin build tools) — Auth + Firestore + persistencia offline básica
- `auth.js`: login/logout, `onAuthStateChanged`, carga de perfil desde la colección `usuarios/{uid}` para determinar rol
- `login.js`: pantalla de acceso, sin shell de navegación visible hasta autenticarse
- Router (`app.js`) ahora es un guard completo: sin sesión → login; con sesión → shell filtrado por rol; ruta admin-only + rol empleado → pantalla de acceso denegado (no solo se oculta del menú, también se bloquea si se teclea el hash directo)
- `firebase/firestore.rules`: reglas por rol. Empleado puede operar clientes/motos/ventas/créditos/pagos/contratos pero no editar/borrar pagos ni ventas ya registradas, y no toca finanzas/reportes/inversiones/gastos/configuración. Solo administrador escribe en `usuarios/{uid}` (nadie se autoasigna rol)
- Topbar muestra usuario + rol activo, y botón "Salir" en el sidebar

### ⚠️ Para que esto funcione de verdad

1. Crea el proyecto Firebase real y pega las credenciales en `DEFAULT_FB_CONFIG` (`assets/js/firebase.js`)
2. En Firestore, crea manualmente el primer documento admin: colección `usuarios`, documento con ID = tu UID de Firebase Auth, campos `{ rol: "administrador", nombre: "Angel", activo: true }`. Sin esto, **nadie puede entrar como admin** (por diseño — nadie se autoasigna rol)
3. Publica `firebase/firestore.rules` en la consola de Firestore
4. Habilita el proveedor "Correo/Contraseña" en Authentication

## Decisión de arquitectura (desviación intencional del spec)

El documento original propone archivos HTML separados en `/views` para cada módulo. Para mantener consistencia con tu stack ya probado (SPA de un solo `index.html` + módulos ES6, sin build tools, como en RESET ERP v7 y Climas Hernández), las vistas se renderizan como funciones JS que inyectan HTML en `#app-view`, en vez de archivos `.html` sueltos cargados por fetch/iframe. La carpeta `/views` queda en el repo por si más adelante se necesita mover algún módulo a HTML estático, pero no se usa todavía.

## Pendiente para instalar como PWA real

Los íconos referenciados en `manifest.json` (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) todavía no existen — hay que generarlos antes de publicar en GitHub Pages, o el manifest fallará silenciosamente en el prompt de instalación.

## Próximas fases (según Prompt Maestro)

| Fase | Contenido |
|---|---|
| ~~2~~ | ~~Firebase real (Auth, Firestore, roles) — código listo, falta conectar credenciales~~ |
| 3 | Módulo Clientes |
| 4 | Motocicletas + Inventario |
| 5 | Ventas (contado/crédito) |
| 6 | Créditos |
| 7 | Pagos + checklist |
| 8 | Morosidad + WhatsApp |
| 9 | Contratos + firma digital + PDF |
| 10 | Recibos + estados de cuenta |
| 11 | Inversiones + Gastos |
| 12 | Dashboard financiero (conectado a datos reales) |
| 13 | Reportes |
| 14 | PWA + offline real |
| 15 | Seguridad + auditoría |
| 16 | Optimización y pruebas |

## Publicación en GitHub Pages

1. Crear repo (ej. `anngeldb-del/motocontrol`)
2. Subir esta carpeta como raíz del repo
3. Settings → Pages → Branch: `main` → Save
4. URL resultante: `https://anngeldb-del.github.io/motocontrol/`

## Configurar Firebase (cuando llegue Fase 2)

1. Crear proyecto nuevo en Firebase Console
2. Habilitar Authentication (roles: administrador / empleado)
3. Crear base Firestore, colecciones según sección 39 del Prompt Maestro
4. Reemplazar `DEFAULT_FB_CONFIG` en `assets/js/firebase.js` con las credenciales reales
5. Publicar `firebase/firestore.rules` con reglas por rol
