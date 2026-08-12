# MotoControl

Sistema de gestión para venta de motocicletas de contado y crédito. PWA mobile-first, sin build tools, Firebase + GitHub Pages.

## Estado: Motocicletas/Inventario + Ventas + Créditos + Pagos + Contratos completos

**Módulo Contratos** (secciones 22-29):

- Se genera desde el expediente de crédito existente — no vuelve a pedir cliente/moto/financiero, ya lo toma de Venta+Crédito
- Vista previa completa: cliente, moto, datos financieros, tabla de pagos, texto de compromiso de pago (editable en el código por ahora — se mueve a Configuración cuando exista ese módulo)
- Advertencia legal visible: es plantilla administrativa, se recomienda revisión de un profesional antes de usarse como contrato definitivo (no se asume validez jurídica)
- Firma digital en `<canvas>` — funciona con dedo, stylus o mouse (pointer events)
- Generación de PDF con jsPDF (CDN, sin build tools): encabezado, cliente, moto, financiero, tabla de pagos completa, compromiso de pago, firma incrustada
- Compartir: usa el share sheet nativo del teléfono (`navigator.share`) cuando está disponible — en Android esto abre directo el menú con WhatsApp; si el navegador no lo soporta, descarga el PDF
- Estados: pendiente → firmado (Generado/Enviado quedan preparados en el modelo de datos para cuando se necesiten)
- Dashboard: el bloque "Contratos pendientes" ahora es real — lista créditos sin contrato con enlace directo al módulo

### ⚠️ Antes de usarlo con clientes reales

1. Personaliza `EMPRESA` en `assets/js/contratos.js` (nombre, teléfono, dirección) — hoy son placeholders
2. Revisa `TEXTO_COMPROMISO` con un profesional legal antes de usarlo como contrato definitivo

**Módulo Créditos** (secciones 16-18, 20) — de solo consulta, se generan automáticamente desde Ventas:

- Cada venta a crédito crea su expediente: número de crédito (`CR-0001`...), plan de pagos generado con `generarPlanPagos()` (fechas según periodicidad, último pago absorbe el redondeo)
- Estado calculado en vivo a partir del plan (`calcularEstadoCredito()` en `utilidades.js`, reutilizada por Créditos, Pagos y Dashboard — sin duplicar lógica): al corriente, próximo a vencer, vencido, moroso, liquidado
- Checklist visual (🟢 pagado / 🟡 próximo / 🔴 vencido) por expediente
- Ranking de clientes con mayor atraso + botón WhatsApp con mensaje prellenado (nunca se envía automático — abre `wa.me` para que el usuario confirme)

**Módulo Pagos** (sección 19):

- Registrar pago: selecciona crédito → cuota pendiente (marca 🔴 si ya venció) → recargo/descuento opcionales → método de pago
- Si el cobro cubre la cuota completa, la marca como pagada y actualiza el crédito automáticamente (saldo/estado se recalculan solos)
- Pago parcial: queda en el historial sin cerrar la cuota (no se pierde el dinero recibido, pero el checklist sigue mostrando pendiente)
- Resumen: cobrado hoy, cobrado del mes, créditos con saldo pendiente

**Cadena de datos ya conectada de punta a punta:** Motocicleta → Venta a crédito → Crédito (con plan) → Pago → actualiza saldo/estado del crédito → Dashboard refleja todo en tiempo real (financiado, cobrado, saldo, vencidos, morosos — ya no hay datos en 0 por falta de módulo).

Pendiente antes de Contratos: nada bloqueante — Contratos puede generarse ya con los datos de Venta+Crédito existentes.

**Módulo Ventas** (secciones 13-15):

- Contado y crédito desde el mismo formulario, con toggle
- Contado: descuento, gastos, forma de pago, total y utilidad calculados en vivo
- Crédito: enganche, interés %, número de pagos, periodicidad, saldo financiado, total a pagar e importe por pago — todo calculado automáticamente
- Al registrar una venta, la moto seleccionada cambia a estado "vendida" automáticamente (ya no aparece disponible para otra venta)
- Solo muestra motos con estado "disponible" en el selector
- Cliente se captura ligero (nombre + WhatsApp) dentro del formulario — el CRM completo (Clientes) llega al final sin perder estos datos, se vincula después por teléfono
- Historial de ventas + resumen del mes (total y utilidad)
- FAB contextual en `#ventas` abre directo el formulario
- Dashboard actualizado: Inventario, Ventas y Créditos ahora leen datos reales (ya no son demo). Finanzas sigue en demo hasta construir Inversiones/Gastos/Finanzas — sin módulo de Pagos, "cobrado" y "morosos" en créditos se muestran en 0 (no hay overclaim de datos que no existen todavía)

**Módulo Motocicletas/Inventario** — sin cambios respecto a la entrega anterior.

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
