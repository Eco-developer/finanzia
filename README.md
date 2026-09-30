# FinanZIA — Plataforma Web de Finanzas Personales con IA Verificable

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2010-ea2845?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%205-2d3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Containers-Docker%20Compose-2496ed?style=flat-square&logo=docker)](https://www.docker.com/)
[![Storybook](https://img.shields.io/badge/UI%20Catalog-Storybook%208-ff4785?style=flat-square&logo=storybook)](https://storybook.js.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Hexagonal%20%2F%20Clean-00b894?style=flat-square)](#-arquitectura-del-sistema)
[![Policy](https://img.shields.io/badge/Financial%20Rule-Zero%20Floats%20(Cents)-e17055?style=flat-square)](#-principios-y-reglas-financieras-inviolables)

**FinanZIA** es una solución integral y profesional de finanzas personales asistida por Inteligencia Artificial generativa verificable (*Human-in-the-Loop*). Ha sido diseñada bajo una arquitectura limpia y hexagonal desacoplada, con aislamiento multi-tenant estricto, gestión contable exacta basada en números enteros en céntimos (cero coma flotante) y capacidad de ejecución 100% reproducible en entorno local libre de dependencias obligatorias en la nube.

---

## 📑 Tabla de Contenidos

1. [Características Principales](#-características-principales)
2. [Principios y Reglas Financieras Inviolables](#-principios-y-reglas-financieras-inviolables)
3. [Arquitectura del Sistema](#-arquitectura-del-sistema)
   - [Arquitectura Hexagonal en el Backend (`finanzia-api`)](#backend-finanzia-api---puertos-y-adaptadores)
   - [Arquitectura Hexagonal en el Frontend (`finanzia-web`)](#frontend-finanzia-web---component-driven--ports)
4. [Stack Tecnológico](#-stack-tecnológico)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Requisitos Previos](#-requisitos-previos)
7. [Puesta en Marcha e Instalación](#-puesta-en-marcha-e-instalación)
   - [Configuración de Variables de Entorno](#1-configuración-de-variables-de-entorno)
   - [Red y Volúmenes de Docker](#2-preparación-de-red-y-volúmenes-de-docker)
   - [Opción A: Ejecución Integral con Docker Compose](#opción-a-ejecución-integral-con-docker-compose)
   - [Opción B: Modo Híbrido para Desarrollo Activo (Recomendado)](#opción-b-modo-híbrido-para-desarrollo-activo-recomendado)
8. [Matriz de Puertos y Servicios](#-matriz-de-puertos-y-servicios)
9. [Batería de Pruebas Automatizadas (Testing)](#-batería-de-pruebas-automatizadas-testing)
10. [Seguridad y Protección de Datos](#-seguridad-y-protección-de-datos)
11. [Aviso Regulatorio (MiFID II / CNMV)](#-aviso-regulatorio-mifid-ii--cnmv)
12. [Estrategia de Ramas y Reglas de Desarrollo](#-estrategia-de-ramas-y-reglas-de-desarrollo)

---

## 🚀 Características Principales

- **Gestión Multi-Cuenta y Consolidación Patrimonial**: Control de cuentas corrientes, cajas de ahorro, tarjetas de crédito, fondos de inversión y efectivo con cálculo de patrimonio neto en tiempo real.
- **Módulo Integral de Pasivos y Deudas**:
  - Registro de préstamos personales, hipotecas y tarjetas de crédito con amortizaciones dinámicas (capital e intereses).
  - Simulador de amortización anticipada con estrategias **Avalancha** (mayor interés primero) y **Bola de Nieve** (menor capital primero).
  - Historial inmutable de auditoría para deudas liquidadas al 100% (protección estricta contra eliminación accidental o fraudulenta).
- **Presupuestos y Pacing de Gasto**: Control mensual por categoría con umbrales de alerta temprana progresivos (70% atención, 90% alerta crítica, >100% rebasado).
- **Metas de Ahorro Inteligentes**: Seguimiento de objetivos con plazos temporales, cálculo de tasa de ahorro mensual recomendada y aportaciones directas desde cuentas activas.
- **Asistente Financiero IA (FinanZIA Advisor)**:
  - Motor conversacional impulsado por Gemini 1.5 con ejecución de herramientas (*Function Calling / ReAct*).
  - Consulta y análisis en tiempo real de transacciones, saldos, presupuestos y amortizaciones.
  - **Human-in-the-Loop**: La IA no puede mutar datos financieros directamente; genera tarjetas de propuesta interactiva que el usuario debe validar y aprobar explícitamente antes de su ejecución.
  - Historial persistente de chats con modales de confirmación de borrado protegidos y seguros.
- **Asistente de Importación Bancaria CSV**: Asistente visual paso a paso para carga de ficheros bancarios con detector automático de duplicados y mapeo dinámico de columnas.
- **Servidor SMTP Local (Mailpit)**: Verificación de cuentas por correo electrónico localmente sin coste ni dependencias de terceros.

---

## 💎 Principios y Reglas Financieras Inviolables

1. **Cero Coma Flotante (`Zero-Float Policy`)**: 
   - Prohibido el uso de tipos de datos `Float` o `Double` para cantidades de dinero tanto en base de datos como en APIs y clientes.
   - Todos los importes monetarios se almacenan, procesan y transmiten como **enteros en céntimos** (`BigInt` / `Int`, ej. `10,50 €` se representa estrictamente como `1050`).
2. **Aislamiento Multi-Tenant Absoluto**:
   - Cada consulta a base de datos y cada tool de IA incluye forzosamente el predicado `where: { userId }`, impidiendo cualquier fuga de información transversal.
3. **Inmutabilidad de Auditoría**:
   - Los registros contables y las deudas amortizadas en su totalidad quedan blindados con reglas de dominio que impiden su borrado para garantizar trazabilidad.
4. **Verificación Estricta de Dependencias**:
   - Se ejecutan reglas automáticas mediante `dependency-cruiser` (`npm run lint:arch`) que prohíben dependencias circulares y violaciones de capas arquitectónicas.

---

## 🏗️ Arquitectura del Sistema

El ecosistema FinanZIA se estructura desacoplado en dos capas independientes que aplican **Arquitectura Hexagonal (Puertos y Adaptadores)** y principios DDD (*Domain-Driven Design*):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA CLIENTE (NAVEGADOR)                        │
│   Next.js 15 (App Router)  │  Storybook 8 Catalog  │  CSS Modules      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST / Cookies HttpOnly
┌───────────────────────────────────▼────────────────────────────────────┐
│                    API BACKEND (HEXAGONAL ARCHITECTURE)                │
│  [Presentation: Controllers] ──► [Application: Services & Use Cases]  │
│                                              │                         │
│                                    [Domain: Pure TS & Money VO]        │
│                                              │                         │
│  [Infrastructure: Prisma Adapters, Argon2, JWT, Mailer, Gemini SDK]   │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
       ┌───────────────────────┐         ┌───────────────────────┐
       │   PostgreSQL 16 DB    │         │   Google Gemini API   │
       │   (Docker Local)      │         │   (Backend AI Tool)   │
       └───────────────────────┘         └───────────────────────┘
```

---

### Backend (`finanzia-api`) — Puertos y Adaptadores

- **`src/core/domain/`**:
  - Núcleo agnóstico en TypeScript puro, sin dependencias de NestJS ni de Prisma.
  - Entidades de negocio: `Account`, `Transaction`, `Budget`, `SavingsGoal`, `Debt`, `DebtPayment`.
  - Value Objects: `Money` (validación de enteros, céntimos y no-negatividad según operación).
  - Interfaces de repositorios (Puertos de salida: `IAccountRepository`, `ITransactionRepository`, `IDebtRepository`, etc.).
- **`src/core/application/`**:
  - Casos de uso y orquestación de negocio: `accounts.service`, `debts.service`, `budgets.service`, `ai-tools.service`.
  - Puerto del modelo de IA: `IAiAdvisorPort`.
- **`src/infrastructure/`**:
  - Adaptadores secundarios: Repositorios Prisma (`PrismaAccountRepository`, etc.), Adaptador Google Gen AI SDK (`GeminiAdvisorService`), hashing criptográfico Argon2id y adaptador de correos Nodemailer con Mailpit.
- **`src/presentation/`**:
  - Adaptadores primarios: Controladores REST NestJS expuestos en `/api/*`, DTOs validados con `class-validator`, guardas de autenticación JWT y documentación interactiva OpenAPI/Swagger en `/api/docs`.

---

### Frontend (`finanzia-web`) — Component-Driven & Ports

- **`src/core/domain/`**:
  - Definición de tipos de dominio financiero, Value Objects y formateador monetario unificado `MoneyDisplay` con `Intl.NumberFormat` regional `es-ES`.
- **`src/core/application/`**:
  - Servicios de cliente como `csv-parser.service.ts` para validación y parseo local de transacciones.
- **`src/infrastructure/`**:
  - Clientes de comunicación tipados (`api-client.ts`, `auth.api.ts`, `debts.api.ts`, `advisor.api.ts`) que transmiten credenciales mediante cookies seguras `HttpOnly`.
- **`src/presentation/`**:
  - **Enrutador Next.js 15 (`app/`)**: Rutas de autenticación, panel principal, presupuestos, metas, deudas y asesor con SSR y Client Components reactivos.
  - **Custom Hooks**: Manejo de estado desacoplado (`useDebts`, `useAccounts`, `useTransactions`, `useBudgets`, `useGoals`).
  - **Diseño Vanilla CSS Modules**: Sistema de diseño con variables CSS (`globals.css`), tema oscuro de alto contraste, glassmorphism, microanimaciones y soporte responsivo móvil integral (`MobileTopBar`, `MobileBottomNav`).
  - **Storybook 8 (`stories/`)**: Catálogo interactivo aislado para pruebas de componentes (*Component-Driven Development*).

---

## 🛠️ Stack Tecnológico

| Capa / Módulo | Tecnología | Versión | Propósito |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | [Next.js](https://nextjs.org/) | `15.1.0` | Framework web React con App Router |
| **Librería UI** | [React](https://react.dev/) | `19.0.0` | Renderizado declarativo y concurrencia |
| **Estilos & Diseño** | Vanilla CSS Modules | — | Variables de diseño, sin frameworks CSS pesados |
| **Componentes Base** | [Radix UI](https://www.radix-ui.com/) | `Latest` | Primitivas accesibles sin estilos (Dialog, Select) |
| **Iconografía** | [Lucide React](https://lucide.dev/) | `^0.468.0` | Iconos vectoriales consistentes |
| **Catálogo de UI** | [Storybook](https://storybook.js.org/) | `8.4.7` | Desarrollo aislado de componentes visuales |
| **Testing Frontend** | [Vitest](https://vitest.dev/) + [RTL](https://testing-library.com/) | `2.1.9` | Pruebas unitarias de componentes y hooks |
| **Backend API** | [NestJS](https://nestjs.com/) | `10.4.15` | Framework backend TypeScript modular |
| **ORM & Database** | [Prisma](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/) | `5.22` / `16-alpine` | Mapeo relacional y motor SQL transaccional |
| **Seguridad Backend** | [Argon2](https://github.com/ranisalt/node-argon2) + [Passport JWT](http://www.passportjs.org/) | `0.41` / `10.2` | Hashing resistente de contraseñas y tokens HttpOnly |
| **Inteligencia Artificial** | [Google Gemini API](https://ai.google.dev/) (`@google/genai`) | `^0.2.0` | Modelo generativo con Tool Calling estructurado |
| **Testing Backend** | [Jest](https://jestjs.io/) + [Supertest](https://github.com/ladjs/supertest) | `29.7` | Pruebas unitarias y de integración end-to-end |
| **Linter de Arquitectura** | [Dependency Cruiser](https://github.com/sverweij/dependency-cruiser) | `16.4.0` | Validación estricta de capas arquitectónicas |
| **Infraestructura Local** | [Docker](https://www.docker.com/) & [Mailpit](https://mailpit.axllent.org/) | `29.7+` / `Latest` | Contenedores reproducibles y servidor SMTP local |

---

## 📂 Estructura del Proyecto

```
personal-finance/
├── docker-compose.yml             # Orquestación raíz (PostgreSQL, Mailpit, API, Web)
├── docs/                          # Documentación formal de arquitectura, producto y API
│   ├── architecture.md            # Especificación formal de arquitectura de software
│   ├── database-design.md         # Modelo relacional, tipos e integridad referencial
│   └── product-requirements.md    # Requisitos funcionales y no funcionales
│
├── finanzia-api/                  # Backend RESTful en NestJS (Arquitectura Hexagonal)
│   ├── prisma/                    # Esquema Prisma (schema.prisma), migraciones y seed
│   ├── src/
│   │   ├── core/                  # Dominio puro y casos de uso de negocio
│   │   │   ├── domain/            # Entidades, Value Objects (Money) e interfaces de repositorios
│   │   │   └── application/       # Servicios de aplicación y definición de herramientas IA
│   │   ├── infrastructure/        # Adaptadores Prisma, hashing Argon2, JWT y Gemini SDK
│   │   └── presentation/          # Controladores REST, DTOs validados y Swagger OpenAPI
│   ├── test/                      # Batería de pruebas Jest (unitarias y E2E)
│   └── docker/                    # Dockerfile de producción y desarrollo para la API
│
└── finanzia-web/                  # Frontend Web en Next.js 15 (Hexagonal + Storybook)
    ├── .storybook/                # Configuración de Storybook 8
    ├── src/
    │   ├── app/                   # Páginas y rutas del App Router (dashboard, advisor, etc.)
    │   ├── core/                  # Dominio del cliente, Value Objects y parser CSV
    │   ├── infrastructure/        # Clientes HTTP y adaptadores de comunicación con la API
    │   └── presentation/          # Componentes modulares (UI, Financieros, AI Asistente),
    │                              # hooks personalizados y estilos globales temáticos
    ├── tests/                     # Batería de pruebas unitarias con Vitest y Testing Library
    └── docker/                    # Dockerfiles para desarrollo y producción del frontend
```

---

## 📋 Requisitos Previos

- **Node.js**: `v20.x` o superior (LTS recomendado).
- **npm**: `v10.x` o superior.
- **Docker Desktop**: Con soporte para Docker Compose v2 y motor Linux activo.
- **Git**: Para control de versiones local.

---

## ⚙️ Puesta en Marcha e Instalación

### 1. Configuración de Variables de Entorno

Ambos servicios disponen de plantillas `.env.example`. Copia los archivos a sus destinos locales:

#### Backend (`finanzia-api/.env`):
```bash
cd finanzia-api
cp .env.example .env
```
*Variables clave configuradas por defecto para el entorno local:*
- `PORT=3001`
- `DATABASE_URL="postgresql://finanzia_user:finanzia_password@localhost:5432/finanzia_db?schema=public"`
- `JWT_SECRET="dev_jwt_secret_finanzia_super_secure_32_chars_local"`
- `SMTP_HOST=localhost` / `SMTP_PORT=1025`
- `GEMINI_API_KEY=""` *(Opcional: Añade tu clave de Google AI Studio para activar el asesor inteligente)*

#### Frontend (`finanzia-web/.env.local`):
```bash
cd ../finanzia-web
cp .env.example .env.local
```
*Variables clave configuradas:*
- `NEXT_PUBLIC_API_URL=http://localhost:3001/api`
- `INTERNAL_API_URL=http://localhost:3001`

---

### 2. Preparación de Red y Volúmenes de Docker

En la raíz del proyecto ([`docker-compose.yml`](file:///e:/personal-finance/docker-compose.yml)), la red `finanzia-network` y el volumen persistente `finanzia_pgdata` están fijados para garantizar persistencia y aislamiento entre servicios. Ejecuta una sola vez en tu terminal:

```bash
docker network create finanzia-network
docker volume create finanzia_pgdata
```

---

### Opción A: Ejecución Integral con Docker Compose

Si deseas ejecutar toda la plataforma (Base de datos, Mailpit, API de NestJS y Frontend Web con Storybook) dentro de contenedores:

```bash
# 1. Asegúrate de tener Docker Desktop abierto y en ejecución
# 2. Situarse en la raíz del repositorio
cd e:\personal-finance

# 3. Construir y levantar todos los contenedores en segundo plano
docker compose up -d --build

# 4. Inspeccionar el estado de los contenedores
docker compose ps

# 5. Visualizar logs en directo
docker compose logs -f

# 6. Detener los contenedores cuando termines
docker compose down
```

---

### Opción B: Modo Híbrido para Desarrollo Activo (Recomendado)

El modo híbrido levanta la infraestructura auxiliar en Docker (PostgreSQL y Mailpit) y ejecuta el Backend y el Frontend nativamente con Node.js en tu máquina, permitiendo **recarga rápida instantánea (Fast Refresh)** y depuración directa con breakpoints:

#### Paso 1: Levantar PostgreSQL y Mailpit con Docker
```bash
cd e:\personal-finance
docker compose up -d postgres mailpit
```

#### Paso 2: Iniciar la API Backend (`finanzia-api`)
Abre una terminal:
```bash
cd e:\personal-finance\finanzia-api

# Instalar dependencias
npm install

# Generar el cliente tipado de Prisma
npx prisma generate

# Sincronizar el esquema de base de datos con PostgreSQL
npx prisma db push

# Iniciar el servidor en modo desarrollo (Watch Mode)
npm run start:dev
```

#### Paso 3: Iniciar el Frontend Web (`finanzia-web`)
Abre una segunda terminal:
```bash
cd e:\personal-finance\finanzia-web

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en puerto 3000
npm run dev
```

*(Opcional) Para iniciar el catálogo interactivo de Storybook en otra terminal:*
```bash
cd e:\personal-finance\finanzia-web
npm run storybook
```

---

## 🌐 Matriz de Puertos y Servicios

| Componente | Servicio | URL Local | Descripción |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js 15 Web App | [http://localhost:3000](http://localhost:3000) | Interfaz web de la plataforma |
| **Storybook** | Catálogo UI Interactivo | [http://localhost:6006](http://localhost:6006) | Catálogo de componentes visuales aislados |
| **Backend** | NestJS REST API | [http://localhost:3001/api](http://localhost:3001/api) | API RESTful modular |
| **Swagger** | Documentación OpenAPI 3.0 | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) | Explorador interactivo de endpoints |
| **Health Check** | Monitor de Salud | [http://localhost:3001/api/health](http://localhost:3001/api/health) | Estado del servidor y conexión SQL |
| **Mailpit Web** | Servidor SMTP Local | [http://localhost:8025](http://localhost:8025) | Bandeja de correos de verificación |
| **Mailpit SMTP** | Servidor de Envío SMTP | `localhost:1025` | Puerto de retransmisión local |
| **PostgreSQL** | Base de Datos Relacional | `localhost:5432` | Usuario: `finanzia_user` / DB: `finanzia_db` |
| **Prisma Studio** | Explorador de Base de Datos | `npm run prisma:studio` | GUI interactiva en `http://localhost:5555` |

---

## 🧪 Batería de Pruebas Automatizadas (Testing)

Siguiendo la metodología **Test-Driven Development (TDD)** y validación rigurosa de calidad:

### Pruebas en el Backend (`finanzia-api`)
```bash
cd finanzia-api

# Ejecutar pruebas unitarias con Jest
npm test

# Ejecutar pruebas en modo observador (watch)
npm run test:watch

# Generar reporte de cobertura de código
npm run test:cov

# Ejecutar pruebas de integración End-to-End (E2E)
npm run test:e2e

# Validar arquitectura hexagonal y reglas de dependencias
npm run lint:arch

# Comprobar formato y sintaxis con ESLint
npm run lint
```

### Pruebas en el Frontend (`finanzia-web`)
```bash
cd finanzia-web

# Ejecutar todas las pruebas unitarias con Vitest
npm test

# Ejecutar pruebas unitarias con reporte de cobertura
npm run test:coverage

# Validar arquitectura hexagonal y reglas de dependencias
npm run lint:arch

# Comprobar reglas de código y accesibilidad con Next.js ESLint
npm run lint
```

---

## 🔒 Seguridad y Protección de Datos

- **Aislamiento Multi-Tenant Estricto**: Todo acceso a los datos de cuentas, deudas, transacciones y presupuestos está restringido por el identificador del usuario autenticado (`userId`).
- **Autenticación Robusta**:
  - Hashing de contraseñas mediante **Argon2id** (algoritmo resistente a ataques por GPU/ASIC).
  - Tokens JWT transmitidos en cookies seguras `HttpOnly`, `SameSite=Lax` y con expiración controlada.
- **Protección de Cabeceras HTTP**: Integración de middleware [Helmet](https://helmetjs.github.io/) para protección contra XSS, clickjacking y MIME-sniffing.
- **Limitación de Tasa (Rate Limiting)**: Control de peticiones abusivas con `@nestjs/throttler` (por defecto 100 peticiones / 60 segundos).
- **Aislamiento de Secretos**: Ningún token, API key ni credencial de base de datos se expone en el código cliente. Las llamadas a Gemini se procesan única y exclusivamente a través de los adaptadores del backend.

---

## ⚖️ Aviso Regulatorio (MiFID II / CNMV)

> [!NOTE]  
> **Aviso de Responsabilidad Legal y Financiera:**  
> FinanZIA y su módulo de inteligencia artificial **FinanZIA AI Advisor** tienen como único propósito proporcionar herramientas analíticas, simulaciones matemáticas e información estadística de finanzas personales.  
> Las respuestas, proyecciones y sugerencias emitidas por el asistente de IA **no constituyen asesoramiento financiero, crediticio, fiscal ni de inversión regulado** conforme a la Directiva Europea **MiFID II**, ni cuentan con la supervisión de la **Comisión Nacional del Mercado de Valores (CNMV)** o del **Banco de España**.  
> Ninguna acción de mutación contable, amortización de préstamos o modificación de límites presupuestarios se ejecutará sin el consentimiento y confirmación expresa del usuario final (*Human-in-the-Loop*).

---

## 🌿 Estrategia de Ramas y Reglas de Desarrollo

1. **Ramas Dedicadas por Hito**: Está prohibido desarrollar directamente sobre la rama principal `main`. Cada funcionalidad o épica se construye en una rama específica (`feature/debt-management`, `feature/ai-advisor`, etc.).
2. **Revisión Previa a Commits**: Cada commit debe ser atómico, describir con exactitud el cambio implementado y ser revisado antes de aplicarse.
3. **Prohibición de `git push` Automático**: El repositorio remoto permanece bajo custodia y control directo del usuario.
4. **Validación de Arquitectura Obligatoria**: Antes de completar cualquier entrega, es mandatorio ejecutar y superar satisfactoriamente `npm run lint:arch` y la suite de pruebas unitarias.

---

## 📄 Licencia

Este proyecto es de uso privado y confidencial. Todos los derechos reservados. Desarrollado con ❤️ para el control financiero personal consciente y responsable.
