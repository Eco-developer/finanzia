# FinanZIA — Plan de Arquitectura y Alcance del MVP (Fase 1 - Aprobado)

FinanZIA es una plataforma web de finanzas personales asistida por agentes de inteligencia artificial deterministas y verificables. El objetivo central es permitir al usuario registrar, importar, categorizar y analizar sus ingresos y gastos, gestionar presupuestos y metas de ahorro, e interactuar con un asistente financiero inteligente que opera bajo el principio de **cero alucinaciones**, con herramientas backend para cálculos y aprobación humana obligatoria (*human-in-the-loop*) antes de aplicar cualquier cambio o recomendación.

El desarrollo se estructura con base en el marco de Google Antigravity mediante cinco roles especializados: **Análisis y Diseño**, **UI/UX Designer**, **Developer**, **QA** y **DevOps**. Todo el ciclo actual se ejecuta **estrictamente en entorno local**, planificando y documentando el despliegue futuro en Microsoft Azure sin incurrir en costes cloud ni despliegues prematuros.

---

## Decisiones Aprobadas por el Propietario del Producto

1. **Estructura de Repositorios (Separación Frontend / Backend)**:
   - Se descarta el monorepo único a favor de **dos repositorios independientes**:
     - `finanzia-web`: Aplicación Frontend en Next.js con TypeScript, Storybook y Docker propio.
     - `finanzia-api`: Aplicación Backend en NestJS con TypeScript, Prisma, Swagger y Docker propio (incluyendo Docker Compose para PostgreSQL local).
2. **Mapeo de Extractos Bancarios (CSV)**:
   - Asistente interactivo genérico de mapeo de columnas (fecha, concepto, importe) en el frontend con capacidad de guardar plantillas por entidad bancaria (ej. Santander, BBVA, CaixaBank, Revolut).
3. **Categorización de Transacciones**:
   - Modelo híbrido: Reglas rápidas deterministas locales (palabras clave / comercios habituales) y clasificación semántica asistida por Gemini API para transacciones nuevas o no identificadas.
4. **Autenticación del MVP**:
   - Autenticación local mediante correo electrónico y contraseña con hash seguro (Argon2id/bcrypt) y tokens JWT transmitidos en cookies `HttpOnly` y `Secure`.
5. **ORM para Base de Datos**:
   - **Prisma ORM** confirmado para modelado, cliente tipado y migraciones declarativas sobre PostgreSQL.
6. **Arquitectura y Testing Frontend**:
   - **Arquitectura Hexagonal** (Puertos y Adaptadores) para desacoplar el dominio financiero de la capa de renderizado de React/Next.js.
   - **Storybook** para documentación interactiva y desarrollo aislado del catálogo de componentes UI.
   - Testing unitario y de integración con **React Testing Library** y **React Hook Testing Library**.
7. **Arquitectura y Testing Backend**:
   - **Arquitectura Hexagonal / Clean Architecture** en módulos de NestJS.
   - **Swagger / OpenAPI** integrado para documentación interactiva de la API en `/api/docs`.
   - Testing con **Jest** para pruebas unitarias y **Supertest** para integración y E2E (aprobado por el usuario).
8. **Infraestructura y Contenedores**:
   - Se confirma el uso de **Docker y Docker Compose** para la orquestación local y contenedores de desarrollo.

---

## Estructura de Dos Repositorios Independientes

### 1. Repositorio Backend: `finanzia-api`
```
finanzia-api/
├── src/
│   ├── core/                        # Núcleo del Dominio y Aplicación (Arquitectura Hexagonal)
│   │   ├── domain/                  # Entidades de dominio, Value Objects (Money, Currency), excepciones
│   │   │   ├── entities/            # User, Account, Transaction, Category, Budget, Goal, AiRecommendation
│   │   │   └── repositories/        # Interfaces de puertos de persistencia (IUserRepository, etc.)
│   │   └── application/             # Casos de uso y servicios de orquestación
│   │       ├── use-cases/           # CreateTransactionUseCase, ImportCsvUseCase, CalculateBalanceUseCase
│   │       ├── dtos/                # DTOs de entrada/salida tipados
│   │       └── ports/               # Interfaces para servicios externos (IAiAdvisorPort, etc.)
│   ├── infrastructure/              # Adaptadores secundarios
│   │   ├── database/                # Prisma service, repositorios Prisma implementando interfaces core
│   │   ├── ai/                      # Adaptador Gemini API (Tool Calling determinista)
│   │   └── security/                # Hash Argon2id, JWT service, Passport strategies
│   └── presentation/                # Adaptadores primarios (Inbound)
│       ├── controllers/             # Controladores REST NestJS con decoradores Swagger
│       ├── guards/                  # JwtAuthGuard, TenantIsolationGuard
│       └── middlewares/             # Logger, Rate-limiter
├── prisma/
│   ├── schema.prisma                # Definición del esquema relacional PostgreSQL
│   └── migrations/                  # Historial de migraciones SQL
├── test/
│   ├── unit/                        # Tests unitarios con Jest
│   ├── integration/                 # Tests de integración con Supertest
│   └── e2e/                         # Tests end-to-end de flujos completos
├── docker/
│   ├── Dockerfile                   # Dockerfile multistage optimizado para NestJS
│   ├── Dockerfile.dev               # Dockerfile para recarga en caliente
│   └── docker-compose.yml           # Orquestación local: PostgreSQL 16 + api
├── .env.example                     # Variables de entorno documentadas (sin credenciales reales)
├── package.json
└── tsconfig.json
```

### 2. Repositorio Frontend: `finanzia-web`
```
finanzia-web/
├── .storybook/                      # Configuración de Storybook (main.ts, preview.ts)
├── src/
│   ├── core/                        # Dominio y Lógica de Negocio en Frontend (Arquitectura Hexagonal)
│   │   ├── domain/                  # Modelos locales, Value Objects de formato monetario, tipos
│   │   ├── application/             # Casos de uso de UI (Mappers de CSV, reglas de categorización rápida)
│   │   └── ports/                   # Interfaces de clientes API (IApiClient, IStorage)
│   ├── infrastructure/              # Adaptadores de infraestructura
│   │   ├── api/                     # Implementación cliente HTTP (Fetch / Axios seguro con cookies HttpOnly)
│   │   └── storage/                 # LocalStorage / SessionStorage para plantillas de mapeo CSV
│   ├── presentation/                # Capa de Presentación React / Next.js
│   │   ├── components/              # Componentes UI puros y atómicos documentados en Storybook
│   │   │   ├── ui/                  # Button, Modal, Card, Input, Table, Badge, Dropdown
│   │   │   ├── financial/           # MoneyDisplay, BalanceCard, TransactionRow, BudgetProgressBar
│   │   │   ├── csv-wizard/          # ColumnMapper, PreviewTable, DuplicatesWarning
│   │   │   └── ai-advisor/          # ChatBubble, ToolExecutionPill, RecommendationCard
│   │   ├── hooks/                   # Custom hooks (useTransactions, useBudgets, useAdvisorChat)
│   │   └── styles/                  # Sistema de diseño con CSS Modules y variables CSS temáticas
│   └── app/                         # Enrutador Next.js (App Router)
│       ├── (auth)/                  # Login, Registro
│       ├── (dashboard)/             # Layout principal con navegación lateral
│       │   ├── accounts/
│       │   ├── transactions/
│       │   ├── budgets/
│       │   ├── goals/
│       │   ├── imports/
│       │   └── advisor/
│       ├── layout.tsx
│       └── page.tsx
├── stories/                         # Historias de Storybook (*.stories.tsx) para cada componente UI
├── tests/
│   ├── unit/                        # Tests unitarios de componentes (React Testing Library)
│   ├── hooks/                       # Tests de custom hooks con @testing-library/react-hooks
│   └── e2e/                         # Tests E2E de interfaz (Playwright)
├── docker/
│   ├── Dockerfile                   # Dockerfile multistage de producción (Node runtime para Next.js)
│   ├── Dockerfile.dev               # Dockerfile de desarrollo
│   └── docker-compose.yml           # Compose para levantar frontend en aislamiento si se desea
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Plan de Implementación por Épicas

- **Épica 1: Gobernanza, Setup de Dos Repositorios e Infraestructura Docker**:
  - Creación de las estructuras base `finanzia-api` y `finanzia-web`.
  - Configuración de `schema.prisma` y Docker Compose con PostgreSQL 16 en el backend.
  - Configuración de Storybook y librerías de testing en el frontend.
  - Workflows de CI en GitHub Actions para cada repositorio (lint, typecheck, tests).
- **Épica 2: Núcleo Financiero — Cuentas, Categorías y Transacciones**:
  - Backend: Autenticación JWT en cookies HttpOnly, CRUD de cuentas y transacciones con importes enteros en céntimos y transacciones SQL atómicas.
  - Frontend: Vistas de login/registro, dashboard de cuentas, tabla paginada de transacciones, modal de alta con formateo monetario estricto.
  - Tests unitarios y de integración (Jest + Supertest en API; React Testing Library en Web).
- **Épica 3: Motor de Conciliación e Importación CSV**:
  - Parser robusto con detección de separadores y protección contra CSV Injection.
  - Asistente de mapeo de columnas con persistencia de plantillas por banco.
  - Detección previa de duplicados mediante hash SHA-256.
- **Épica 4: Presupuestos, Metas de Ahorro y Dashboard Analítico**:
  - Backend: Métricas de ejecución presupuestaria en tiempo real y progreso de metas.
  - Frontend: Gráficos interactivos de desglose de gastos y barras de ritmo presupuestario.
- **Épica 5: Asistente FinanZIA AI y Motor de Recomendaciones Human-in-the-Loop**:
  - Adaptador de Gemini API con Tool Calling determinista en NestJS.
  - Chat con streaming en `/advisor`.
  - Tarjetas de recomendación con botón explícito [Aprobar y Aplicar].
  - Tests de QA con datasets de control para certificar cero alucinaciones.
- **Épica 6: End-to-End Testing, Hardening y Documentación PDF de Azure**:
  - Pruebas E2E completas con Playwright.
  - Auditoría de seguridad y revisión de aislamiento multi-tenant.
  - Generación del documento profesional `azure-deployment-plan.pdf`.
