# FinanZIA — Reporte de Diagnóstico y Configuración del Linter de Arquitectura

Este documento consolida la implementación del linter de arquitectura y dependencias basado en **`dependency-cruiser`**, evaluando la arquitectura hexagonal, la separación cliente/servidor y el aislamiento modular en el ecosistema **FinanZIA** ([`finanzia-api`](file:///e:/personal-finance/finanzia-api) y [`finanzia-web`](file:///e:/personal-finance/finanzia-web)).

---

## 1. Paso 1: Mapeo de Estructura de Carpetas y Plan de Migración

### 1.1 Correspondencia de Componentes
El proyecto está desacoplado en dos repositorios/subproyectos independientes conforme al [Plan de Arquitectura y Alcance del MVP](file:///e:/personal-finance/docs/implementation-plan.md):

| Concepto Requerido | Directorio en el Proyecto | Capas y Organización Interna |
| :--- | :--- | :--- |
| **`server`** | [`finanzia-api/src`](file:///e:/personal-finance/finanzia-api/src) | `core/domain` (reglas puras y Value Objects), `core/application` (casos de uso y servicios), `infrastructure` (Prisma, Gemini, Seguridad) y `presentation` (Controladores, DTOs, Filtros). |
| **`client`** | [`finanzia-web/src`](file:///e:/personal-finance/finanzia-web/src) | `core/domain` (modelos cliente), `core/application` (lógica de frontend), `infrastructure` (clientes API Fetch, LocalStorage), `presentation` (componentes React UI, estilos CSS Modules) y `app` (Next.js App Router). |

### 1.2 Plan de Migración Gradual Módulo por Módulo (Vertical Slices)
Si en fases futuras se desea transicionar hacia una estructura vertical estricta `src/modules/<nombre-del-modulo>/`, el plan de migración escalonado propuesto es:

1. **Fase A (Actual - Capas Hexagonales Estables)**:
   - Mantener `finanzia-api` y `finanzia-web` separados físicamente para preservar la independencia de Docker, CI y deployments.
   - Enforcear reglas hexagonales por capas mediante `dependency-cruiser`.
2. **Fase B (Modularización Interna por Feature en Backend)**:
   - Migrar progresivamente submódulos de `finanzia-api/src/core/application/<modulo>` hacia `finanzia-api/src/modules/<modulo>/` (comenzando por `accounts`, seguido de `categories`, `transactions`, `budgets`, `goals`, `imports`, `advisor`).
   - Cada módulo interno expondrá un archivo público `index.ts` que delimite su API pública.
3. **Fase C (Modularización de UI y Hooks en Frontend)**:
   - Consolidar `finanzia-web/src/presentation/components/<feature>` y sus futuros hooks en `finanzia-web/src/modules/<feature>/ui`.

---

## 2. Pasos 3 a 8: Catálogo de Reglas y Problemas que Previenen

| Regla | Entorno | Origen $\rightarrow$ Destino | Severidad | Problema que Previene |
| :--- | :--- | :--- | :--- | :--- |
| **`no-circular`** | Ambos | Todo $\rightarrow$ Dependencia Circular | `error` | Evita bloqueos en tiempo de ejecución, problemas en el árbol de módulos y acoplamientos rígidos. |
| **`no-orphans`** | Ambos | Archivo Huérfano | `warn` | Detecta código muerto o archivos en desuso no importados en ningún punto del proyecto. |
| **`server-domain-no-infra`** | Backend | `core/domain` $\rightarrow$ `infrastructure` | `error` | Garantiza que las reglas de negocio no sepan nada sobre bases de datos ni servicios externos. |
| **`server-domain-no-application`** | Backend | `core/domain` $\rightarrow$ `core/application` | `error` | Obliga a que la dependencia vaya siempre desde afuera hacia el dominio (DIP), nunca al revés. |
| **`server-domain-framework-agnostic`** | Backend | `core/domain` $\rightarrow$ `@nestjs/*`, `@prisma/*` | `error` | Preserva el dominio puro sin ataduras a frameworks ni librerías de infraestructura. |
| **`server-application-no-concrete-infra`** | Backend | `core/application` $\rightarrow$ `infrastructure` | `error` | Evita que los casos de uso dependan de implementaciones directas; obliga a usar interfaces/puertos. |
| **`server-application-no-web-framework`** | Backend | `core/application` $\rightarrow$ `express`, `next` | `error` | Mantiene la neutralidad de protocolo en los casos de uso, desacoplándolos de HTTP. |
| **`server-routes-no-direct-infra`** | Backend | `presentation/controllers` $\rightarrow$ `infrastructure/database` | `error` | Impide que los controladores accedan directamente a la persistencia sin pasar por casos de uso. |
| **`server-never-import-client`** | Backend | `src` $\rightarrow$ `finanzia-web`, `react`, `next` | `error` | Previene contaminación del backend con librerías o código de interfaz de usuario. |
| **`client-domain-no-react-next`** | Frontend | `core/domain` $\rightarrow$ `react`, `next` | `error` | Mantiene los modelos y lógica financiera del frontend independientes del framework visual. |
| **`client-application-no-react`** | Frontend | `core/application` $\rightarrow$ `react` | `error` | Separa la lógica de aplicación del ciclo de vida de componentes React. |
| **`client-application-no-concrete-infra`** | Frontend | `core/application` $\rightarrow$ `infrastructure` | `error` | Desacopla la lógica de clientes HTTP concretos y APIs específicas. |
| **`client-ui-components-no-infra`** | Frontend | `presentation/components` $\rightarrow$ `infrastructure` | `error` | Exige que los componentes usen hooks o casos de uso en vez de invocar endpoints directamente. |
| **`client-never-import-server`** | Frontend | `src` $\rightarrow$ `finanzia-api`, `@prisma`, `argon2` | `error` | **CRÍTICO**: Previene fugas de credenciales, secretos de backend y lógica privada hacia el bundle web. |
| **`pages-no-backend-infra`** | Frontend | `src/app` $\rightarrow$ `infrastructure` backend | `error` | Bloquea el empaquetado de drivers de base de datos o lógica server-side en páginas cliente. |

---

## 3. Paso 12: Informe de Violaciones Detectadas en el Código Existente

Al ejecutar la validación sobre el código actual, el linter detectó **25 infracciones en el backend** y **7 infracciones en el frontend**. Conforme a las instrucciones del Paso 12, **no se relajaron ni eliminaron las reglas a ciegas**. A continuación se detalla el diagnóstico y la propuesta de remediación:

### 3.1 Backend ([`finanzia-api`](file:///e:/personal-finance/finanzia-api))

#### A. 18 Errores: `server-application-no-concrete-infra`
Los siguientes servicios de aplicación importan implementaciones concretas de Prisma en vez de depender de interfaces (puertos) del dominio:
1. `src/core/application/accounts/accounts.service.ts` $\rightarrow$ `PrismaAccountRepository`
2. `src/core/application/categories/categories.service.ts` $\rightarrow$ `PrismaCategoryRepository`
3. `src/core/application/transactions/transactions.service.ts` $\rightarrow$ `PrismaTransactionRepository`, `PrismaAccountRepository`, `PrismaCategoryRepository`
4. `src/core/application/budgets/budgets.service.ts` $\rightarrow$ `PrismaBudgetRepository`, `PrismaCategoryRepository`
5. `src/core/application/goals/goals.service.ts` $\rightarrow$ `PrismaSavingsGoalRepository`
6. `src/core/application/imports/imports.service.ts` $\rightarrow$ 4 repositorios Prisma concretos
7. `src/core/application/auth/auth.service.ts` $\rightarrow$ `PrismaUserRepository`, `HashingService`
8. `src/core/application/recommendations/recommendations.service.ts` $\rightarrow$ `PrismaService`
9. `src/core/application/ai/ai-tools.service.ts` $\rightarrow$ `PrismaService`
10. `src/core/application/ai/ai-advisor.service.ts` $\rightarrow$ `PrismaService`, `GeminiAdvisorService`

#### B. 7 Advertencias: `no-orphans`
Las interfaces de repositorios creadas en `src/core/domain/repositories/` (`IAccountRepository`, `ITransactionRepository`, `IBudgetRepository`, etc.) figuran como módulos huérfanos precisamente porque los servicios de aplicación importaron las clases de infraestructura en su lugar.

#### Plan de Remediación Backend:
- En `src/app.module.ts`, proveer los repositorios mediante tokens de inyección:
  ```typescript
  { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository }
  ```
- En cada servicio de `core/application`, inyectar la interfaz con `@Inject(ACCOUNT_REPOSITORY) private readonly accountRepo: IAccountRepository`.
- Limpiar el import de `@prisma/client` residual en `account.repository.interface.ts`.

---

### 3.2 Frontend ([`finanzia-web`](file:///e:/personal-finance/finanzia-web))

#### A. 1 Error: `client-application-no-concrete-infra`
- `src/core/application/auth/auth.context.tsx` $\rightarrow$ `src/infrastructure/api/auth.api.ts`.
- **Causa**: `auth.context.tsx` es un contexto de estado de React (`createContext`, `useContext`) que fue ubicado por error dentro de `src/core/application/auth/`.
- **Plan de Remediación**: Mover `auth.context.tsx` a `src/presentation/context/auth.context.tsx` (o encapsularlo en `src/presentation/hooks/useAuth.ts`), ya que los contextos de React pertenecen estrictamente a la capa de presentación.

#### B. 6 Errores: `client-ui-components-no-infra`
Los siguientes modales de presentación invocan clientes HTTP directamente:
1. `src/presentation/components/financial/CreateAccountModal.tsx` $\rightarrow `accounts.api.ts`
2. `src/presentation/components/financial/CreateTransactionModal.tsx` $\rightarrow `transactions.api.ts`
3. `src/presentation/components/financial/CreateTransferModal.tsx` $\rightarrow `transactions.api.ts`
4. `src/presentation/components/financial/CreateBudgetModal.tsx` $\rightarrow `budgets.api.ts`
5. `src/presentation/components/financial/CreateGoalModal.tsx` $\rightarrow `goals.api.ts`
6. `src/presentation/components/financial/ContributeGoalModal.tsx` $\rightarrow `goals.api.ts`

#### Plan de Remediación Frontend:
- Crear la carpeta [`src/presentation/hooks/`](file:///e:/personal-finance/finanzia-web/src/presentation/hooks) con hooks especializados (`useAccounts`, `useTransactions`, `useBudgets`, `useGoals`).
- Los modales consumirán estos custom hooks, desacoplando los componentes visuales de la capa de infraestructura HTTP.

---

## 4. Paso 13: Evidencia Visual de la Arquitectura

Los diagramas visuales interactivos de dependencias han sido generados exitosamente en formato HTML navegable:

- [api-dependencies.html](file:///e:/personal-finance/docs/architecture/api-dependencies.html): Mapa interactivo de dependencias y capas del Backend NestJS.
- [web-dependencies.html](file:///e:/personal-finance/docs/architecture/web-dependencies.html): Mapa interactivo de dependencias y capas del Frontend Next.js.

Comandos para regenerar los diagramas en cualquier momento:
```bash
# Backend
cd finanzia-api && npm run graph:arch

# Frontend
cd finanzia-web && npm run graph:arch
```

---

## 5. Estado Final Post-Remediación: 0 Violaciones Logradas

Tras la ejecución integral de las remediaciones arquitectónicas, se alcanzaron **0 violaciones en ambos proyectos** sin relajar ninguna regla:

### 5.1 Resumen de Remediaciones Implementadas

1. **Backend (`finanzia-api`)**:
   - **Tipos de Dominio Puros**: Se crearon `src/core/domain/types/financial.types.ts` con tipos desacoplados de Prisma (`AccountType`, `TransactionType`, `CategoryType`, `RecommendationType`, `RecommendationStatus`), eliminando cualquier dependencia de base de datos en el dominio.
   - **Puertos de Aplicación**: Se definieron `hashing.port.ts`, `ai-advisor.port.ts` y `financial-analytics.port.ts` en `src/core/application/ports/`.
   - **Puertos de Repositorio**: Se crearon `ai-recommendation.repository.interface.ts` y `advisor-history.repository.interface.ts`.
   - **Adaptadores de Infraestructura**: Se implementaron `PrismaAiRecommendationRepository`, `PrismaAdvisorHistoryRepository` y `PrismaFinancialAnalyticsAdapter` desacoplando completamente a los servicios de `PrismaService`.
   - **Inversión de Dependencias (IoC)**: Todos los servicios de aplicación (`AccountsService`, `TransactionsService`, `BudgetsService`, `CategoriesService`, `GoalsService`, `ImportsService`, `AuthService`, `RecommendationsService`, `AiToolsService`, `AiAdvisorService`) ahora inyectan tokens de interfaz mediante `@Inject(...)`.
   - **Módulo Principal NestJS**: Se registraron todos los pares Token $\rightarrow$ Adaptador en `src/app.module.ts`.

2. **Frontend (`finanzia-web`)**:
   - **Reubicación de Contexto React**: `auth.context.tsx` se movió a `src/presentation/context/auth.context.tsx`, actualizando todas sus importaciones a través de la aplicación.
   - **Custom Hooks de Presentación**: Se crearon `useAccounts`, `useTransactions`, `useBudgets` y `useGoals` en `src/presentation/hooks/`.
   - **Modales Desacoplados**: Los 6 modales financieros (`CreateAccountModal`, `CreateTransactionModal`, `CreateTransferModal`, `CreateBudgetModal`, `CreateGoalModal`, `ContributeGoalModal`) ahora consumen hooks de presentación sin importar clientes de infraestructura API.

### 5.2 Tabla de Métricas de Validación

| Métrica / Proyecto | Backend (`finanzia-api`) | Frontend (`finanzia-web`) |
| :--- | :--- | :--- |
| **Violaciones de Arquitectura (`lint:arch`)** | **0 errores / 0 advertencias** (102 módulos, 177 dependencias) | **0 errores / 0 advertencias** (97 módulos, 173 dependencias) |
| **Suites de Tests Unitarios (`npm test`)** | **10 / 10 pasando** (90 tests) | **9 / 9 pasando** (44 tests) |
| **Compilación de Producción (`npm run build`)** | **Exitosa (NestJS)** | **Exitosa (Next.js 15 App Router)** |
| **Estado CI / Pre-push Hook** | **100% Validado** | **100% Validado** |

