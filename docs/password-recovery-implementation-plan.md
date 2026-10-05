# PLAN DE IMPLEMENTACIÓN: Recuperación de Contraseña y Restablecimiento Seguro

**Épica de referencia:** `ÉPICA-AUTH-002`  
**Autor:** Antigravity AI Team  
**Fecha:** 2026-10-05 (Actualizado: TDD, Arquitectura Hexagonal y Verificación de Linters)  
**Metodología de Desarrollo:** **TDD Estricto (Red 🔴 ➔ Green 🟢 ➔ Refactor 🔵)**  
**Arquitectura:** Clean Architecture / Hexagonal Estricta (Dependency Cruiser Compliant)  
**Estado:** `Pendiente de Aprobación Humana antes de Implementar Código`

---

## 1. Visión General del Plan y Directrices Técnicas

El desarrollo se ejecutará bajo el paradigma **TDD (Test-Driven Development)**, asegurando que ninguna línea de lógica de negocio sea escrita sin una prueba unitaria previa que falle (Fase Roja). Toda la solución respetará escrupulosamente los límites arquitectónicos hexagonales validados por `dependency-cruiser`.

```
Metodología TDD en cada Tarea:
   1. RED 🔴: Escribir test unitario que describe el comportamiento y falla.
   2. GREEN 🟢: Escribir el código mínimo necesario para hacer pasar el test.
   3. REFACTOR 🔵: Optimizar el diseño manteniendo la separación de capas hexagonal.

Flujo de Fases Secuenciales:
   Fase 1: TDD Backend Core & Persistencia (Prisma, Domain, AuthService & JwtStrategy)
      │
      ▼
   Fase 2: Infraestructura de Notificaciones & Rate Limiting (IEmailPort + Throttler)
      │
      ▼
   Fase 3: TDD Capa de Presentación Backend (DTOs, Swagger & Endpoints REST)
      │
      ▼
   Fase 4: Frontend Next.js (Checklist Reactivo, Token en Memoria, Vistas Forgot/Reset)
      │
      ▼
   Fase 5: Gatekeeper de Calidad Final (Tests 100%, lint:arch y ESLint en verde)
```

---

## 2. Estrategia de Ramas Git (Regla Global #16)

De acuerdo con las reglas globales del proyecto (`FINANZIA — REGLAS GLOBALES DEL PROYECTO.md`, regla 16):
- Se creará y utilizará la rama dedicada: `feature/epic-password-recovery`.
- Todo el trabajo se desarrollará en dicha rama, sin afectar directamente `main` ni otras ramas de trabajo.
- Los commits requerirán confirmación previa del usuario y nunca se ejecutará `git push`.

---

## 3. Fases Detalladas de Implementación (Ciclo TDD)

### 🔹 FASE 1: TDD en Base de Datos, Dominio y Lógica de Negocio (`finanzia-api`)

#### Objetivo:
Modelar los campos en Prisma, extender los repositorios e implementar la lógica de recuperación, token de un solo uso y revocación de sesiones bajo TDD respetando la arquitectura hexagonal.

* [ ] **Tarea 1.1: Modelado Prisma y Migración No Destructiva**
  * **Archivos:** `finanzia-api/prisma/schema.prisma`
  * **Acciones:**
    * Agregar al modelo `User`:
      ```prisma
      passwordResetToken   String?   @unique @map("password_reset_token")
      passwordResetExpires DateTime? @map("password_reset_expires")
      tokenVersion         Int       @default(1) @map("token_version")
      ```
    * Ejecutar `npx prisma migrate dev --name add_password_reset_and_token_version`.
    * Generar cliente tipado con `npx prisma generate`.

* [ ] **Tarea 1.2: Contratos de Dominio y Persistencia Hexagonal**
  * **Archivos:**
    * `finanzia-api/src/core/domain/repositories/user.repository.interface.ts`
    * `finanzia-api/src/infrastructure/database/repositories/prisma-user.repository.ts`
  * **Regla Arquitectónica:** `IUserRepository` (Dominio) no debe importar nada de `infrastructure`.
  * **Acciones:**
    * Definir métodos en `IUserRepository`:
      ```typescript
      savePasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
      findByPasswordResetToken(token: string): Promise<UserEntity | null>;
      updatePasswordAndRevokeSessions(userId: string, passwordHash: string): Promise<UserEntity>;
      ```
    * Implementar en `PrismaUserRepository` (Infraestructura) con transacción atómica que limpia el token de reseteo e incrementa `tokenVersion`.

* [ ] **Tarea 1.3: TDD para `AuthService` (Lógica de Recuperación y Revocación)**
  * **Archivos:**
    * `finanzia-api/test/unit/auth.service.spec.ts` (Pruebas unitarias)
    * `finanzia-api/src/core/application/auth/auth.service.ts` (Servicio de aplicación)
  * **Ciclo TDD:**
    1. **RED 🔴**:
       * Crear tests en `auth.service.spec.ts` para:
         * `requestPasswordReset`: debe retornar mensaje neutro cuando el usuario no existe (OWASP anti-enumeración) sin llamar a emailService ni guardar token.
         * `requestPasswordReset`: debe generar JWT (30m), guardar en repositorio y enviar email cuando el usuario existe.
         * `verifyResetToken`: debe rechazar si el token expiró, ya fue usado o no coincide con BD.
         * `verifyResetToken`: debe aceptar si el token es válido y no consumido.
         * `resetPassword`: debe hashear con Argon2id, llamar a `updatePasswordAndRevokeSessions` (incrementando `tokenVersion`) y limpiar token de reseteo.
       * Ejecutar `npm test -- auth.service.spec.ts` y certificar que fallen.
    2. **GREEN 🟢**:
       * Implementar los métodos en `AuthService` para hacer pasar el 100% de los tests.
    3. **REFACTOR 🔵**:
       * Limpiar código garantizando que `AuthService` dependa exclusivamente de puertos (`IEmailPort`, `IHashingService`, `IUserRepository`).

* [ ] **Tarea 1.4: TDD para `JwtStrategy` (Validación de Versión de Sesión)**
  * **Archivos:**
    * `finanzia-api/test/unit/jwt.strategy.spec.ts` (Nuevo test unitario)
    * `finanzia-api/src/infrastructure/security/jwt.strategy.ts`
  * **Ciclo TDD:**
    1. **RED 🔴**: Test que verifique que si el payload contiene un `tokenVersion` menor al del usuario en BD, lanza `UnauthorizedException`.
    2. **GREEN 🟢**: Implementar la verificación en `JwtStrategy.validate`.
    3. **REFACTOR 🔵**: Asegurar compatibilidad con tokens de reseteo temporal y tokens de login.

---

### 🔹 FASE 2: Infraestructura de Notificaciones & Rate Limiting (`finanzia-api`)

#### Objetivo:
Configurar la protección Throttler en el endpoint de recuperación e implementar la plantilla de correo con diseño FinanZIA.

* [ ] **Tarea 2.1: Rate Limiting en Backend (`@nestjs/throttler`)**
  * **Archivos:**
    * `finanzia-api/src/app.module.ts`
    * `finanzia-api/src/presentation/controllers/auth.controller.ts`
  * **Acciones:**
    * Configurar limitador de tasa específico `@Throttle({ default: { limit: 5, ttl: 900000 } })` (máximo 5 peticiones cada 15 minutos) sobre la solicitud de recuperación.

* [ ] **Tarea 2.2: Puerto y Plantilla Visual de Correo**
  * **Archivos:**
    * `finanzia-api/src/core/application/ports/email.port.ts`
    * `finanzia-api/src/infrastructure/email/templates/password-reset-email.template.ts` (Nuevo archivo)
    * `finanzia-api/src/infrastructure/email/nodemailer-email.adapter.ts`
  * **Acciones:**
    * Agregar `sendPasswordResetEmail` al puerto `IEmailPort`.
    * Diseñar plantilla HTML y texto con identidad corporativa de FinanZIA: botón CTA "Restablecer mi contraseña", aviso explícito de caducidad en 30 minutos y nota de un solo uso.
    * Implementar en `NodemailerEmailAdapter` compatible con Mailpit (`localhost:1025`).

---

### 🔹 FASE 3: TDD en Capa de Presentación y DTOs (`finanzia-api`)

#### Objetivo:
Construir y validar los DTOs con `class-validator`, exponer los endpoints documentados con Swagger y proteger la mutación final.

* [ ] **Tarea 3.1: TDD para DTOs de Validación (`ForgotPasswordDto` y `ResetPasswordDto`)**
  * **Archivos:**
    * `finanzia-api/test/unit/auth-dtos.spec.ts` (Nuevo test unitario)
    * `finanzia-api/src/presentation/dtos/auth/forgot-password.dto.ts` (Nuevo archivo)
    * `finanzia-api/src/presentation/dtos/auth/reset-password.dto.ts` (Nuevo archivo)
  * **Ciclo TDD:**
    1. **RED 🔴**: Tests de validación con `class-validator` para rechazar correos malformados y contraseñas que incumplan los criterios (mínimo 8-72 chars, 1 mayúscula, 1 número, 1 símbolo especial).
    2. **GREEN 🟢**: Implementar decoradores `@IsEmail`, `@Length(8, 72)`, `@Matches(...)` en los DTOs.
    3. **REFACTOR 🔵**: Mensajes de error unificados con `RegisterDto`.

* [ ] **Tarea 3.2: TDD para Endpoints en `AuthController`**
  * **Archivos:**
    * `finanzia-api/test/unit/auth.controller.spec.ts` (Nuevo test unitario)
    * `finanzia-api/src/presentation/controllers/auth.controller.ts`
  * **Ciclo TDD:**
    1. **RED 🔴**: Tests unitarios del controlador comprobando llamadas correctas a `AuthService`:
       * `POST /auth/forgot-password`: responde 200 con mensaje neutro.
       * `GET /auth/verify-reset-token`: valida query param `?token=...`.
       * `POST /auth/reset-password`: protegido con `JwtAuthGuard`, inyecta usuario y actualiza contraseña.
    2. **GREEN 🟢**: Implementar endpoints y anotaciones Swagger en `AuthController`.
    3. **REFACTOR 🔵**: Verificar que la presentación no contenga lógica de negocio.

---

### 🔹 FASE 4: Frontend Next.js (`finanzia-web`)

#### Objetivo:
Implementar la interfaz en Next.js con enlace en login, manejo de token estrictamente en memoria (prohibido `localStorage`), checklist reactivo en tiempo real y vistas de confirmación y error.

* [ ] **Tarea 4.1: Enlace en Pantalla de Login (`/login`)**
  * **Archivos:**
    * `finanzia-web/src/app/(auth)/login/page.tsx`
  * **Acciones:**
    * Añadir enlace accesible "¿Olvidó la contraseña?" con redirección a `/forgot-password`.

* [ ] **Tarea 4.2: Cliente API en Frontend (`authApi`)**
  * **Archivos:**
    * `finanzia-web/src/infrastructure/api/auth.api.ts`
  * **Acciones:**
    * Métodos `forgotPassword(email)`, `verifyResetToken(token)` y `resetPassword(password, token)` (enviando `Authorization: Bearer ${token}` directamente sin tocar `localStorage`).

* [ ] **Tarea 4.3: Vista de Solicitud y Confirmación de Envío (`/forgot-password`)**
  * **Archivos:**
    * `finanzia-web/src/app/(auth)/forgot-password/page.tsx` (Nuevo archivo)
    * `finanzia-web/src/app/(auth)/forgot-password/forgot-password.module.css` (Nuevo archivo)
  * **Acciones:**
    * Formulario con input de email, botón "Enviar link de recuperación" y botón "Atrás" a `/login`.
    * Pantalla post-envío con mensaje neutro OWASP, advertencia de revisar spam, botón "Reenviar link" con cooldown (60s) y enlace a Mailpit local.

* [ ] **Tarea 4.4: Vista de Verificación, Formulario con Checklist Reactivo y Éxito (`/reset-password`)**
  * **Archivos:**
    * `finanzia-web/src/app/(auth)/reset-password/page.tsx` (Nuevo archivo)
    * `finanzia-web/src/app/(auth)/reset-password/reset-password.module.css` (Nuevo archivo)
  * **Acciones:**
    * **Token en Memoria**: Lee `token` de la URL y lo almacena exclusivamente en estado React (`useState`), nunca en `localStorage`.
    * **Pantalla de Error**: Si el token expiró (> 30 min) o ya fue usado, despliega pantalla de error ("Enlace no válido o caducado", botones para pedir nuevo y volver a login).
    * **Checklist Reactivo**: Si es válido, despliega formulario con validación interactiva en vivo (8-72 caracteres, mayúscula, número, carácter especial y coincidencia). Botón "Cambiar contraseña" deshabilitado hasta cumplir todos los criterios.
    * **Pantalla de Éxito**: "Tu contraseña se ha cambiado" con botón para redirigir a `/login`.

---

### 🔹 FASE 5: Gatekeeper de Calidad Final, Linters de Arquitectura y Tests 100%

#### Objetivo:
Correr y validar que todas las suites de prueba unitarias, linters de código y el linter de arquitectura hexagonal pasen exitosamente con 0 advertencias o errores antes de dar por concluida la épica.

* [ ] **Tarea 5.1: Ejecución y Aprobación de Tests Unitarios Backend**
  * **Comando:** `npm test` en `finanzia-api`
  * **Criterio de Éxito:** 100% de los tests en verde (incluyendo `auth.service.spec.ts`, `jwt.strategy.spec.ts`, `auth-dtos.spec.ts` y las suites existentes).

* [ ] **Tarea 5.2: Validación de Arquitectura Hexagonal con Dependency Cruiser**
  * **Comando:** `npm run lint:arch` en `finanzia-api`
  * **Criterio de Éxito:** 0 violaciones de arquitectura (ninguna fuga de dependencias entre `domain`, `application`, `infrastructure` y `presentation`).

* [ ] **Tarea 5.3: Validación de Linter de Código (ESLint & TypeScript)**
  * **Comandos:**
    * `npm run lint` en `finanzia-api`
    * `npm run build` en `finanzia-api` (typecheck estricto)
    * `npm run lint` en `finanzia-web`
  * **Criterio de Éxito:** 0 errores de tipado o formato.

* [ ] **Tarea 5.4: Prueba Integrada E2E con Mailpit Local**
  * **Verificación:** Solicitar recuperación -> recibir correo en `localhost:8025` -> abrir enlace -> validar ventana de 30m -> cambiar clave con token de un solo uso -> certificar revocación de sesiones previas -> login exitoso con nueva clave.

---

## 4. Matriz de Trazabilidad Requisitos vs. Tareas

| Requisito Aprobado | Componente / Archivo | Tarea en Plan |
| :--- | :--- | :--- |
| Enlace "¿Olvidó la contraseña?" en Login | `finanzia-web/.../login/page.tsx` | Tarea 4.1 |
| Página con email, botón enviar y botón atrás al login | `finanzia-web/.../forgot-password/page.tsx` | Tarea 4.3 |
| Enlace con caducidad máxima de 30 minutos | `finanzia-api/.../auth.service.ts` | Tarea 1.3 |
| Pantalla post-envío con aviso de spam y botón reenviar con cooldown | `finanzia-web/.../forgot-password/page.tsx` | Tarea 4.3 |
| Redirección a pantalla de error si el link es inválido o expiró (> 30 min) | `finanzia-web/.../reset-password/page.tsx` | Tarea 4.4 |
| Formulario de nueva contraseña con mismos criterios que registro y botón cambiar | `finanzia-web/.../reset-password/page.tsx` | Tarea 4.4 |
| Pantalla de éxito "Tu contraseña se ha cambiado" con botón a login | `finanzia-web/.../reset-password/page.tsx` | Tarea 4.4 |
| Respuesta neutra anti-enumeración de usuarios (OWASP Opción A) | `finanzia-api/.../auth.service.ts` | Tarea 1.3 |
| Token de un solo uso (invalidación tras su uso) | `finanzia-api/.../prisma-user.repository.ts` | Tareas 1.1, 1.2, 1.3 |
| Rate Limiting (3-5 peticiones cada 15 min en backend) | `finanzia-api/.../auth.controller.ts` (`@Throttle`) | Tarea 2.1 |
| Revocación de sesiones activas anteriores tras cambio de clave | `finanzia-api/.../jwt.strategy.ts` (`tokenVersion`) | Tareas 1.1, 1.2, 1.4 |
| Token solo en memoria React (prohibido localStorage) | `finanzia-web/.../reset-password/page.tsx` | Tareas 4.2, 4.4 |
| **Desarrollo siguiendo TDD estricto (Red ➔ Green ➔ Refactor)** | `finanzia-api/test/unit/` | Tareas 1.3, 1.4, 3.1, 3.2 |
| **Respeto riguroso de Arquitectura Hexagonal** | Estructura en capas `finanzia-api/src/` | Tareas 1.2, 1.3, 5.2 |
| **Validación obligatoria de linters de arquitectura y tests 100%** | `npm test`, `npm run lint:arch`, `npm run lint` | Tareas 5.1, 5.2, 5.3 |
