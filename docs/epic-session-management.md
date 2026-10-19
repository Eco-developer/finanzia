# FinanZIA — Épica: Gestión Avanzada de Sesiones (Invalidación Activa, Renovación con Rotación y Persistencia vía WebSockets)

| Metadata | Detalle |
| :--- | :--- |
| **Identificador** | **ÉPICA-AUTH-003** |
| **Nombre** | Gestión Avanzada de Sesiones (Active Invalidation, Refresh Token Rotation & WebSocket Session Persistence) |
| **Módulo** | Seguridad e Identidad (`finanzia-api`: `/api/auth`, `/ws/session` y `finanzia-web`: `api-client.ts`, `auth.context.tsx`, `useSessionSocket`) |
| **Integraciones Clave** | `AuthService`, `JwtService`, `SessionGateway` (Socket.IO / NestJS WebSockets), `PrismaSessionRepository`, `apiClient` Interceptor |
| **Metodología** | **TDD Estricto** (Red ➔ Green ➔ Refactor) en backend y frontend |
| **Política de Tokens** | **Access Token** de corta duración (**15 min**) + **Refresh Token** rotativo (**7 días**) en cookie HttpOnly |
| **Defensa contra Robo de Tokens** | **Refresh Token Rotation (RTR)** con **Detección de Reutilización** (revocación inmediata de todas las sesiones activas) |
| **Sincronización en Tiempo Real** | Persistencia, heartbeat y broadcast de revocación multi-pestaña y multi-dispositivo vía WebSockets |
| **Quality Gates** | Aprobación al 100% de `npm test`, `npm run lint:arch` (Dependency Cruiser) y `npm run lint` |
| **Estado Actual** | **Especificado y Listo para Revisión y Aprobación Humana** |
| **Documento de Planificación** | [`docs/session-management-implementation-plan.md`](./session-management-implementation-plan.md) |

---

## 1. Resumen Ejecutivo y Justificación

Actualmente, **FinanZIA** cuenta con un mecanismo sólido de validación de tokens (`JwtAuthGuard` y `JwtStrategy`) y revocación por incremento de versión (`tokenVersion`) al cambiar contraseñas. Sin embargo, adolece de tres limitaciones críticas de seguridad y experiencia de usuario según las directrices **OWASP Session Management**:

1. **Ausencia de Invalidación Activa en Servidor durante Logout**: Al cerrar sesión (`POST /api/auth/logout`), el servidor únicamente borra las cookies locales. El JWT continúa siendo criptográficamente válido durante 7 días, permitiendo su uso si fue interceptado previamente.
2. **Falta de Renovación y Tokens de Corta Duración**: No existe separación entre Access Token y Refresh Token. Se utiliza un único JWT monolítico de 7 días. Si expira, la experiencia del usuario se corta de forma abrupta; y si se compromete, el atacante tiene acceso ilimitado durante una semana completa.
3. **Falta de Persistencia y Sincronización en Tiempo Real**: Si un usuario tiene múltiples pestañas abiertas o inicia sesión en otro dispositivo y cierra sesión o cambia su contraseña, las demás pestañas quedan desfasadas mostrando información financiera sensible hasta que el usuario intenta hacer una petición manual. Además, no hay monitorización activa de presencia ni reconexión transparente.

Esta épica resuelve de manera integral estos tres desafíos, dotando a FinanZIA de un estándar bancario de gestión de sesiones.

---

## 2. Historias de Usuario (User Stories)

### HU-AUTH-01: Renovación Transparente de Token (Refresh Token Rotation)
* **Como** usuario autenticado en FinanZIA,
* **quiero** que mi sesión se mantenga activa de manera segura y transparente mientras continúo interactuando con la aplicación sin ser desconectado repentinamente a los 15 minutos,
* **para** gestionar mis finanzas de forma fluida sin interrupciones ni tener que reintroducir mis credenciales constantemente.

### HU-AUTH-02: Invalidación Activa y Cierre Seguro de Sesión (Server-Side Invalidation)
* **Como** usuario que pulsa el botón "Cerrar sesión",
* **quiero** que mi sesión y mis tokens queden inmediatamente invalidados en el servidor y revocados en la base de datos,
* **para** tener la certeza de que nadie podrá volver a usar esos tokens para consultar mis cuentas bancarias, transacciones o asesorías de IA.

### HU-AUTH-03: Revocación Global y Detección de Robo de Tokens
* **Como** usuario o administrador de seguridad,
* **quiero** que si el sistema detecta que un token de refresco ya reemplazado intenta volver a utilizarse (síntoma inequívoco de ataque man-in-the-middle o robo de token), se cancelen de forma automática e inmediata todas las sesiones activas del usuario,
* **para** neutralizar cualquier intento de suplantación de identidad patrimonial.

### HU-AUTH-04: Persistencia y Heartbeat de Sesión con Sockets
* **Como** usuario de FinanZIA,
* **quiero** que la aplicación mantenga una conexión WebSocket persistente y segura con el servidor mientras la pestaña esté activa (heartbeat/keep-alive) y se reconecte automáticamente si sufro cortes temporales de red,
* **para** sincronizar el estado de mi sesión y recibir notificaciones de seguridad en tiempo real.

### HU-AUTH-05: Sincronización Multi-Pestaña de Cierre de Sesión en Tiempo Real
* **Como** usuario con múltiples pestañas abiertas en el navegador,
* **quiero** que cuando cierre sesión en una pestaña (o cambie de contraseña), todas las demás pestañas se cierren automáticamente al instante vía WebSocket,
* **para** evitar que queden datos patrimoniales visibles en pantallas desatendidas.

---

## 3. Criterios de Aceptación y Calidad (QA)

| Código | Criterio de Verificación | Severidad |
| :--- | :--- | :--- |
| **CA-AUTH-03.1** | **Ventana Temporal Segura**: El Access Token (JWT) tiene una caducidad estricta de **15 minutos**. El Refresh Token tiene una caducidad de **7 días**. | **Bloqueante** |
| **CA-AUTH-03.2** | **Almacenamiento Seguro**: El Refresh Token se transmite exclusivamente mediante Cookie HttpOnly con flags `Secure`, `SameSite=Strict` y `Path=/api/auth`. Queda prohibido almacenarlo en `localStorage`. | **Bloqueante** |
| **CA-AUTH-03.3** | **Rotación Estricta (RTR)**: Cada llamada exitosa a `POST /api/auth/refresh` invalida el Refresh Token presentado y entrega un nuevo par (nuevo Access Token + nuevo Refresh Token). | **Bloqueante** |
| **CA-AUTH-03.4** | **Detección de Reutilización (Reuse Detection)**: Si se presenta un Refresh Token revocado o previamente consumido, el servidor incrementa de forma atómica `tokenVersion`, marca como revocadas todas las sesiones del usuario y responde `401 Unauthorized`. | **Bloqueante** |
| **CA-AUTH-03.5** | **Invalidación en Servidor en Logout**: Al invocar `POST /api/auth/logout`, el registro de la sesión en base de datos pasa a `isRevoked = true`, se borran las cookies y el token queda inutilizable. | **Bloqueante** |
| **CA-AUTH-03.6** | **Intercepción Transparente en Frontend**: `apiClient` intercepta respuestas `401`, pone en espera las peticiones concurrentes mediante una cola única (mutex), ejecuta el refresco y reintenta las peticiones originales sin que el usuario perciba parpadeos o errores. | **Alta** |
| **CA-AUTH-03.7** | **Handshake de WebSocket Autenticado**: El Gateway de WebSockets (`SessionGateway`) verifica el token JWT en el evento de conexión. Si no es válido o expiró, rechaza la conexión con código de error apropiado. | **Bloqueante** |
| **CA-AUTH-03.8** | **Cierre Multi-Pestaña Inmediato**: Al revocar la sesión (por logout o cambio de credenciales), el backend emite un evento `session:revoked` al room `user_${userId}`. Todas las pestañas abiertas cierran sesión y redirigen a `/login` en menos de 500 ms. | **Alta** |
| **CA-AUTH-03.9** | **Reconexión Resiliente**: El cliente WebSocket implementa reconexión automática con retroceso exponencial (*exponential backoff*). Al reconectarse, renueva credenciales si es necesario. | **Media** |
| **CA-AUTH-03.10** | **Arquitectura y Calidad**: Cero violaciones en `npm run lint:arch` (`dependency-cruiser`) y aprobación del 100% de la suite de pruebas unitarias (`npm test`). | **Bloqueante** |

---

## 4. Dependencias del Sistema y Paquetes Requeridos

De conformidad con la **Regla 6** de *FINANZIA — REGLAS GLOBALES DEL PROYECTO*, se especifican los paquetes requeridos para la persistencia y comunicación WebSocket:

### 4.1. En Backend (`finanzia-api`):
1. **`@nestjs/websockets`** y **`@nestjs/platform-socket.io`**:
   - *Para qué se necesita*: Implementar el gateway reactivo de WebSockets (`SessionGateway`) integrado con el ciclo de vida de NestJS y decorators de eventos.
   - *Requisitos*: Requiere `socket.io` como motor subyacente.
2. **`socket.io`** (servidor):
   - *Para qué se necesita*: Gestión de salas de usuario (`rooms`), heartbeats, autenticación en handshake y emisión bidireccional.
   - *Instalación planificada*: `npm install @nestjs/websockets @nestjs/platform-socket.io socket.io` en `finanzia-api`.
   - *Reversión*: `npm uninstall @nestjs/websockets @nestjs/platform-socket.io socket.io`.

### 4.2. En Frontend (`finanzia-web`):
1. **`socket.io-client`**:
   - *Para qué se necesita*: Establecer la conexión cliente persistente desde el navegador hacia el backend, gestionar heartbeats y escuchar eventos de revocación en tiempo real.
   - *Instalación planificada*: `npm install socket.io-client` en `finanzia-web`.
   - *Reversión*: `npm uninstall socket.io-client`.

---

## 5. Estrategia de Ramas y Flujo Git

Siguiendo la **Regla 16** de *FINANZIA — REGLAS GLOBALES DEL PROYECTO*:
* **Rama de la Épica**: `feature/session-management-and-sockets` originada desde `main`.
* **Prohibición**: Queda terminantemente prohibido desarrollar o realizar commits directamente en `main`.
* **Aprobación de Commits**: Cada commit requerirá validación previa del usuario y jamás se ejecutará `git push`.
