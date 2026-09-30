# PLAN DE IMPLEMENTACIÓN: Módulo de Perfil y Wizard de Onboarding

**Épica de referencia:** `EPIC-PROF-001`  
**Autor:** Antigravity AI Team  
**Fecha:** 2026-09-29  
**Arquitectura:** Clean Architecture / Hexagonal (NestJS / Node.js Backend + Next.js React Frontend)

---

## 1. Visión General del Plan

El desarrollo se ejecutará en **5 Fases Secuenciales**, asegurando una entrega continua con pruebas automatizadas en cada etapa.

```
Fase 1: Backend & DB (Prisma + API REST)
   │
   ▼
Fase 2: Frontend Core (Dominio, API Client & State)
   │
   ▼
Fase 3: UI/UX Wizard de Onboarding (Pasos 1 al 4)
   │
   ▼
Fase 4: Módulo de Perfil en la App (/profile)
   │
   ▼
Fase 5: Pruebas E2E, QA, Seguridad & Rollout
```

---

## 2. Fases Detalladas de Implementación

### 🔹 FASE 1: Base de Datos y Servicios Backend (`finanzia-api`)

#### Objetivo:
Extender el modelo de datos de Prisma, aplicar migraciones e implementar los endpoints de consulta y mutación para perfiles, onboarding y cuentas iniciales.

* [ ] **Tarea 1.1: Modelado Prisma y Migración**
  * **Archivos:** `finanzia-api/prisma/schema.prisma`, `finanzia-api/prisma/migrations/`
  * **Acciones:**
    * Agregar campos `emailVerified` (si aún no existe) y `onboardingCompleted` (Boolean, default `false`) al modelo `User`.
    * Crear modelos `UserProfile`, `UserFinancialProfile`, `UserDisclaimerLog` y validar modelo `Account`.
    * Ejecutar `npx prisma migrate dev --name add_user_profile_and_onboarding`.
    * Generar cliente tipado con `npx prisma generate`.

* [ ] **Tarea 1.2: DTOs y Validación de Datos (Zod / class-validator)**
  * **Archivos:** `finanzia-api/src/presentation/dtos/profile/`
  * **Acciones:**
    * Crear `UpdateProfileDto` (validación de array `usageGoals`, `customGoal` opcional con max 250 caracteres, `preferredCurrency`).
    * Crear `UpdateFinancialProfileDto` (validación de `profession`, `annualGrossIncome`, booleanos opcionales `hasRealEstateIncome`, `hasStockInvestments`, `hasCryptoInvestments`, `emergencyFundRange`, `experienceLevel`).
    * Crear `CompleteOnboardingDto` (agrupa paso 1, paso 2 opcional, confirmación del paso 3 `termsAccepted: true`, y datos de la cuenta del paso 4: `accountName`, `accountType`, `initialBalance`, `currency`).

* [ ] **Tarea 1.3: Casos de Uso y Servicios de Dominio (Application Layer)**
  * **Archivos:** `finanzia-api/src/core/application/profile/`, `finanzia-api/src/core/application/onboarding/`
  * **Acciones:**
    * Implementar `GetUserProfileUseCase`: Retorna perfil completo unificado.
    * Implementar `UpdateUserProfileUseCase` y `UpdateFinancialProfileUseCase`.
    * Implementar `CompleteOnboardingUseCase`: Transacción de base de datos que:
      1. Crea o actualiza `UserProfile`.
      2. Crea o actualiza `UserFinancialProfile` (si fue provisto).
      3. Registra aceptación en `UserDisclaimerLog`.
      4. Crea la primera `Account` manual con el saldo inicial.
      5. Marca `user.onboardingCompleted = true`.
      6. Retorna confirmación de éxito.

* [ ] **Tarea 1.4: Controladores HTTP y Rutas REST**
  * **Archivos:** `finanzia-api/src/presentation/controllers/profile.controller.ts`, `onboarding.controller.ts`
  * **Acciones:**
    * `GET /api/v1/profile` (protegido con `AuthGuard`).
    * `PUT /api/v1/profile` y `PUT /api/v1/profile/financial`.
    * `GET /api/v1/onboarding/status`.
    * `POST /api/v1/onboarding/complete`.

* [ ] **Tarea 1.5: Pruebas Unitarias Backend**
  * **Archivos:** `finanzia-api/test/unit/profile/`, `finanzia-api/test/unit/onboarding/`
  * **Acciones:** Tests unitarios de los casos de uso validando reglas de negocio, rollback transaccional y validación de DTOs.

---

### 🔹 FASE 2: Capa de Dominio e Infraestructura Frontend (`finanzia-web`)

#### Objetivo:
Configurar tipos TypeScript, clientes HTTP y el gestor de estado para el Wizard y la navegación protegida.

* [ ] **Tarea 2.1: Modelos de Dominio y Constantes**
  * **Archivos:**
    * `finanzia-web/src/core/domain/profile/profile.types.ts`
    * `finanzia-web/src/core/domain/constants/onboarding-options.ts`
  * **Acciones:**
    * Definir interfaces: `UserProfile`, `FinancialProfile`, `OnboardingWizardState`, `CreateInitialAccountInput`.
    * Declarar catálogo de objetivos (estándar + opciones orientadas al Agente de IA).
    * Declarar catálogo de tipos de cuenta y rangos salariales.

* [ ] **Tarea 2.2: Cliente API de Perfil y Onboarding**
  * **Archivos:** `finanzia-web/src/infrastructure/api/profile.api.ts`, `onboarding.api.ts`
  * **Acciones:**
    * Implementar llamadas tipadas a los endpoints del backend usando `fetch` o `axios` configurado con Bearer Token.

* [ ] **Tarea 2.3: Store de Estado del Wizard (Zustand o Context)**
  * **Archivos:** `finanzia-web/src/core/application/onboarding/onboarding.store.ts`
  * **Acciones:**
    * Manejar paso activo (`currentStep: 1 | 2 | 3 | 4`).
    * Almacenar datos en memoria con sincronización en `sessionStorage` para evitar pérdida accidental de progreso.
    * Métodos: `setGoals()`, `setFinancialContext()`, `acceptDisclaimers()`, `setInitialAccount()`, `reset()`.

* [ ] **Tarea 2.4: Guardia de Rutas (Middleware / Route Guard)**
  * **Archivos:** `finanzia-web/src/middleware.ts` (o wrapper en layout de dashboard)
  * **Acciones:**
    * Si el usuario autenticado tiene `onboardingCompleted === false` e intenta entrar a `/dashboard` o `/accounts`, redirigir automáticamente a `/onboarding`.
    * Si el usuario ya tiene `onboardingCompleted === true` e intenta entrar a `/onboarding`, redirigir a `/dashboard`.

---

### 🔹 FASE 3: Desarrollo UI/UX del Wizard de Onboarding (`/onboarding`)

#### Objetivo:
Construir una experiencia visual atractiva, fluida y con microinteracciones para los 4 pasos del wizard.

* [ ] **Tarea 3.1: Contenedor Base y Barra de Progreso del Wizard**
  * **Archivos:** `finanzia-web/src/app/onboarding/page.tsx`, `finanzia-web/src/presentation/components/onboarding/WizardLayout.tsx`
  * **Acciones:**
    * Header con logotipo de Finanzia y botón sutil de cierre de sesión.
    * Stepper / Progress Bar interactiva indicando el paso actual (1 de 4) con animación de transición suave.
    * Transición animada entre pasos (fade & slide).

* [ ] **Tarea 3.2: Paso 1 - Objetivos y Asistencia IA**
  * **Archivos:** `finanzia-web/src/presentation/components/onboarding/Step1Goals.tsx`
  * **Acciones:**
    * Grid de tarjetas seleccionables (Card Checkbox) con iconos visuales atractivos.
    * Destacar visualmente con un badge o gradiente sutil las opciones asistidas por IA.
    * Tarjeta "Otros": al activarse despliega suavemente un `textarea` accesible con contador de caracteres.
    * Botón "Siguiente" con validación reactiva.

* [ ] **Tarea 3.3: Paso 2 - Perfil Económico y Radios Sí/No**
  * **Archivos:** `finanzia-web/src/presentation/components/onboarding/Step2FinancialProfile.tsx`
  * **Acciones:**
    * Selector de profesión y rango de ingresos.
    * Grupo de preguntas Sí/No con componentes de Radio con diseño moderno tipo switch o pill-buttons (`[ Sí ]` / `[ No ]`).
    * Opciones recomendadas: Moneda base y nivel de familiaridad financiera.
    * Botón secundario "Omitir este paso" y botón primario "Siguiente".

* [ ] **Tarea 3.4: Paso 3 - Disclaimer Legal y Transparencia**
  * **Archivos:** `finanzia-web/src/presentation/components/onboarding/Step3Disclaimers.tsx`
  * **Acciones:**
    * 4 tarjetas informativas con iconos:
      1. 🛡️ Cero datos bancarios confidenciales ni contraseñas.
      2. 🔒 Sin anuncios, privacidad garantizada (Zero Ads).
      3. 👁️ Modo gestión manual y analítica (no pagos ni transferencias).
      4. ⚖️ No asesoramiento financiero legal ni recomendaciones de compraventa.
    * Checkbox de aceptación explícita: *"Entiendo los principios y limitaciones del servicio"*.
    * Botón "Continuar" que se activa únicamente tras marcar el checkbox.

* [ ] **Tarea 3.5: Paso 4 - Alta de Primera Cuenta Manual**
  * **Archivos:** `finanzia-web/src/presentation/components/onboarding/Step4InitialAccount.tsx`
  * **Acciones:**
    * Formulario de creación de cuenta:
      * Nombre de la cuenta (con sugerencias rápidas: "Efectivo", "Billetera", "Cuenta Ahorro").
      * Tipo de cuenta (Select).
      * Saldo inicial (Input numérico formateado en divisa).
      * Selector de color/icono.
    * Botón de envío final: *"Comenzar a usar Finanzia"*.
    * Estado de carga (Spinner / Skeleton) y redirección tras guardado exitoso a `/dashboard`.

---

### 🔹 FASE 4: Módulo de Perfil en la App (`/profile`)

#### Objetivo:
Permitir al usuario ver y actualizar todos los datos previamente recolectados sin solicitar nueva información no prevista.

* [ ] **Tarea 4.1: Vista y Layout de Perfil**
  * **Archivos:** `finanzia-web/src/app/(dashboard)/profile/page.tsx`, `finanzia-web/src/presentation/components/profile/ProfileLayout.tsx`
  * **Acciones:**
    * Header de usuario: Avatar con iniciales, nombre, email con badge "Verificado" y fecha de alta.
    * Sistema de pestañas accesibles (Tabs):
      1. *Información de Usuario*
      2. *Objetivos Financieros e IA*
      3. *Perfil Económico y Activos*
      4. *Privacidad y Términos*

* [ ] **Tarea 4.2: Tab 1 - Información de Usuario**
  * **Archivos:** `finanzia-web/src/presentation/components/profile/tabs/UserInfoTab.tsx`
  * **Acciones:**
    * Edición de nombre de visualización.
    * Visualización de correo (solo lectura con insignia de verificado).

* [ ] **Tarea 4.3: Tab 2 - Objetivos y Asistencia IA**
  * **Archivos:** `finanzia-web/src/presentation/components/profile/tabs/UserGoalsTab.tsx`
  * **Acciones:**
    * Mismos checkboxes del Paso 1 para actualizar prioridades financieras y relación con el Agente IA.
    * Edición de texto libre "Otros".
    * Botón "Guardar preferencias".

* [ ] **Tarea 4.4: Tab 3 - Perfil Económico**
  * **Archivos:** `finanzia-web/src/presentation/components/profile/tabs/FinancialProfileTab.tsx`
  * **Acciones:**
    * Modificación de profesión, salario anual y toggles/radios Sí/No para inmuebles, bolsa y cripto.
    * Modificación de divisa base y nivel de conocimiento.
    * Botón "Actualizar perfil económico".

* [ ] **Tarea 4.5: Tab 4 - Privacidad y Términos Legales**
  * **Archivos:** `finanzia-web/src/presentation/components/profile/tabs/PrivacyTermsTab.tsx`
  * **Acciones:**
    * Tarjetas de consulta de los 4 pilares de privacidad.
    * Registro de fecha y versión de aceptación legal.
    * Botón de acceso directo a "Mis Cuentas".

---

### 🔹 FASE 5: Pruebas Automatizadas, QA y Despliegue

#### Objetivo:
Garantizar la estabilidad, accesibilidad, seguridad y cobertura de pruebas de extremo a extremo.

* [ ] **Tarea 5.1: Pruebas Unitarias y de Componentes en Frontend**
  * **Archivos:**
    * `finanzia-web/tests/unit/onboarding/step1-goals.spec.tsx`
    * `finanzia-web/tests/unit/onboarding/step2-financial.spec.tsx`
    * `finanzia-web/tests/unit/onboarding/step3-disclaimer.spec.tsx`
    * `finanzia-web/tests/unit/onboarding/step4-account.spec.tsx`
    * `finanzia-web/tests/unit/profile/profile-page.spec.tsx`
  * **Acciones:** Pruebas con React Testing Library y Jest/Vitest validando renderizado, interacciones, validaciones de campo y envío de formularios.

* [ ] **Tarea 5.2: Pruebas de Integración E2E (Playwright)**
  * **Archivos:** `finanzia-web/tests/e2e/onboarding-flow.spec.ts`
  * **Acciones:**
    * Flujo completo: Usuario recién verificado ingresa -> Wizard Paso 1 a 4 -> Redirección a Dashboard -> Apertura de `/profile` y edición de campo.

* [ ] **Tarea 5.3: Auditoría de Accesibilidad (A11y) y Responsive Design**
  * **Acciones:** Validar navegación por teclado, lectores de pantalla (NVDA/VoiceOver) y compatibilidad móvil (pantallas 375px hasta 4K).

---

## 3. Matriz de Riesgos y Mitigación

| Riesgo Identificado | Probabilidad | Impacto | Estrategia de Mitigación |
| :--- | :--- | :--- | :--- |
| **Abandono del Wizard en pasos intermedios** | Media | Alto | Mantener el estado en `sessionStorage`; hacer opcional el Paso 2; pasos breves y claros sin campos innecesarios. |
| **Confusión legal sobre asesoramiento financiero** | Baja | Crítico | Disclaimer visible y obligatorio en el Paso 3 con lenguaje claro y directo que excluya expresamente la figura de asesor regulado. |
| **Pérdida de datos en caso de fallo de red en Paso 4** | Baja | Medio | Transacción atómica en backend (`$transaction` de Prisma) para que la creación de cuenta y perfil se procesen conjuntamente o no se procese nada. |
| **Fricción por solicitud de datos bancarios** | Baja | Alto | Aclarar expresamente en el Paso 3 y 4 que las cuentas son exclusivamente manuales y que jamás se pedirán claves bancarias. |

---

## 4. Definición de Hecho (Definition of Done - DoD)

1. [ ] Esquema Prisma migrado y probado en base de datos de desarrollo y test.
2. [ ] Todos los endpoints REST implementados con validación DTO y código de respuesta HTTP semántico.
3. [ ] Wizard de 4 pasos implementado en `finanzia-web` con validaciones y feedback visual.
4. [ ] Módulo `/profile` operativo con pestañas y guardado de datos.
5. [ ] Cobertura de pruebas unitarias > 80% en los nuevos componentes y casos de uso.
6. [ ] Revisión de cumplimiento de privacidad y disclaimers completada.
