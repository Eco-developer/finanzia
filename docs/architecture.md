# FinanZIA — Documento de Arquitectura del Sistema

| Metadata | Detalle |
| :--- | :--- |
| **Producto** | FinanZIA (Plataforma Web de Finanzas Personales con IA) |
| **Patrón Arquitectónico** | Arquitectura Hexagonal (Puertos y Adaptadores) desacoplada en dos repositorios |
| **Repositorio Frontend** | `finanzia-web` (Next.js 15, TypeScript, Storybook, React Testing Library, Docker) |
| **Repositorio Backend** | `finanzia-api` (NestJS 10, TypeScript, Prisma, PostgreSQL 16, Swagger, Docker) |
| **Proveedor de IA** | Gemini API (Google Gen AI SDK) integrado exclusivamente en el backend |

---

## 1. Visión General y Topología de Repositorios

El sistema se estructura en dos repositorios de código completamente independientes y autónomos. Cada repositorio mantiene su propio ciclo de vida, sus dependencias, su pipeline de CI, sus herramientas de pruebas y sus manifiestos de Docker.

```mermaid
flowchart LR
    subgraph ClientLayer["Capa Cliente (Navegador)"]
        Browser["Navegador Web (Next.js SPA/SSR)"]
        StorybookUI["Storybook UI (Puerto 6006)"]
    end

    subgraph FrontendRepo["Repositorio: finanzia-web"]
        NextApp["Next.js App Router\n(Puerto 3000)"]
        StorybookRunner["Storybook Server"]
        NextApp --> Browser
        StorybookRunner --> StorybookUI
    end

    subgraph BackendRepo["Repositorio: finanzia-api"]
        NestAPI["NestJS REST API\n(Puerto 3001)"]
        SwaggerUI["Swagger UI\n(/api/docs)"]
        PrismaORM["Prisma Client ORM"]
        NestAPI --> SwaggerUI
        NestAPI --> PrismaORM
    end

    subgraph DataAndAI["Persistencia e IA"]
        PostgresDB[("PostgreSQL 16\n(Docker Compose\nPuerto 5432)")]
        GeminiCloud["Google Gemini API\n(Cloud HTTPS)"]
        PrismaORM --> PostgresDB
        NestAPI -->|"Tool Calling / ReAct"| GeminiCloud
    end

    Browser -->|"HTTP / HTTPS (Cookies HttpOnly)"| NestAPI
```

---

## 2. Arquitectura Hexagonal en el Backend (`finanzia-api`)

El backend implementa Arquitectura Hexagonal (Puertos y Adaptadores) para aislar las reglas de negocio financiero de la infraestructura de persistencia (Prisma) y de los frameworks de entrega (NestJS REST):

```mermaid
flowchart TD
    subgraph DrivingAdapters["Adaptadores Primarios (Driving / Inbound)"]
        REST["NestJS Controllers\n(@Controller, Swagger DTOs)"]
        Guards["JwtAuthGuard / TenantGuard"]
    end

    subgraph PortsInbound["Puertos de Entrada (Inbound Ports)"]
        IAuthService["IAuthUseCase"]
        ITransactionService["ITransactionUseCase"]
        IBudgetService["IBudgetUseCase"]
        IAiAdvisorService["IAiAdvisorUseCase"]
    end

    subgraph ApplicationCore["Núcleo de Aplicación (Application Layer)"]
        UseCases["Casos de Uso:\n- CreateTransaction\n- ReconcileCsvImport\n- CalculateBudgetPacing\n- ExecuteAiToolCalling"]
    end

    subgraph DomainCore["Núcleo del Dominio (Domain Layer - Pure TS)"]
        Entities["Entidades:\n- Account\n- Transaction\n- Category\n- Budget\n- SavingsGoal"]
        ValueObjects["Value Objects:\n- Money (Integer Cents)\n- CurrencyCode ('EUR')\n- TransactionType"]
        DomainExceptions["Excepciones de Dominio:\n- InsufficientBalanceException\n- InvalidMonetaryAmountException"]
    end

    subgraph PortsOutbound["Puertos de Salida (Outbound Ports)"]
        IAccountRepo["IAccountRepository"]
        ITransactionRepo["ITransactionRepository"]
        IBudgetRepo["IBudgetRepository"]
        IAiModelPort["IAiModelPort (Gemini Port)"]
    end

    subgraph DrivenAdapters["Adaptadores Secundarios (Driven / Outbound)"]
        PrismaAdapters["Prisma Repositories\n(PostgreSQL Adapter)"]
        GeminiAdapter["GeminiSdkAdapter\n(Google Gen AI Tool Calling)"]
        ArgonSecurity["Argon2PasswordHasherAdapter"]
    end

    REST --> Guards
    Guards --> PortsInbound
    PortsInbound --> ApplicationCore
    ApplicationCore --> DomainCore
    ApplicationCore --> PortsOutbound
    IAccountRepo -.-> PrismaAdapters
    ITransactionRepo -.-> PrismaAdapters
    IBudgetRepo -.-> PrismaAdapters
    IAiModelPort -.-> GeminiAdapter
```

### 2.1 Principios del Backend:
1. **Independencia del Dominio**: `core/domain` no importa ningún paquete externo de NestJS ni de Prisma. Las entidades y Value Objects son clases puras de TypeScript.
2. **Representación de Dinero (`Money`)**: El Value Object `Money` garantiza que cualquier cálculo monetario se exprese en céntimos enteros (`amountInCents: number`) y valida que no existan fracciones de céntimo ni valores `NaN`.
3. **Documentación Swagger Automática**: Todos los DTOs de entrada y salida utilizan decoradores `@ApiProperty()` para generar el esquema OpenAPI 3.0 en `/api/docs`.
4. **Estrategia de Testing Backend**:
   - **Jest (Unit Tests)**: Ejecutados sobre las entidades de dominio y casos de uso con repositorios mockeados en memoria.
   - **Supertest (Integration & E2E Tests)**: Ejecutados levantando la aplicación NestJS completa con una base de datos PostgreSQL de prueba para validar transacciones SQL, migraciones y códigos de estado HTTP.

---

## 3. Arquitectura Hexagonal en el Frontend (`finanzia-web`)

El frontend traslada los principios de código limpio al cliente web desacoplando la lógica de negocio y mapeo de datos de la capa de renderizado de React:

```mermaid
flowchart TD
    subgraph UIComponents["Capa de Presentación (Next.js 15 & Storybook)"]
        AppRouter["Next.js App Router (Pages & Layouts)"]
        StorybookCatalog["Storybook Stories (*.stories.tsx)"]
        UIWidgets["Componentes Atómicos (Button, Modal, Card, Table)"]
        FinancialWidgets["Componentes de Dominio (MoneyDisplay, BudgetPacingBar, TransactionList)"]
    end

    subgraph CustomHooks["Adaptadores Primarios de Vista (React Hooks)"]
        Hooks["useTransactions()\nuseBudgets()\nuseCsvMapper()\nuseAdvisorChat()"]
    end

    subgraph FrontendAppCore["Casos de Uso de Cliente (Application Layer)"]
        CsvParserService["CsvParserService (Parseo y detección de duplicados en cliente)"]
        QuickCategorizer["RuleBasedCategorizer (Motor regex local)"]
    end

    subgraph FrontendDomain["Dominio del Cliente (Domain Layer)"]
        ClientModels["Modelos Tipados, Formateador Monetario (Intl.NumberFormat)"]
    end

    subgraph OutboundPorts["Puertos de Infraestructura"]
        IApiPort["IApiClientPort"]
        IStoragePort["IStoragePort"]
    end

    subgraph OutboundAdapters["Adaptadores de Infraestructura"]
        FetchApiClient["FetchApiClient (Credentials: include, CSRF-safe)"]
        LocalStorageAdapter["LocalStorageAdapter (Guarda plantillas bancarias)"]
    end

    AppRouter --> CustomHooks
    UIWidgets --> StorybookCatalog
    FinancialWidgets --> StorybookCatalog
    CustomHooks --> FrontendAppCore
    FrontendAppCore --> FrontendDomain
    FrontendAppCore --> OutboundPorts
    IApiPort -.-> FetchApiClient
    IStoragePort -.-> LocalStorageAdapter
```

### 3.1 Principios del Frontend:
1. **Aislamiento en Storybook**: Cada componente visual (`src/presentation/components/ui` y `financial`) se desarrolla y prueba de forma aislada en Storybook antes de integrarse en las páginas de Next.js.
2. **Testing de Frontend**:
   - **React Testing Library**: Pruebas de integración visual y accesibilidad en componentes (interacciones de usuario, modales, tablas).
   - **React Hook Testing**: Pruebas sobre la máquina de estados de los hooks (`useCsvMapper`, `useTransactions`).
   - **Playwright**: Pruebas end-to-end de los flujos críticos (registro, creación de cuenta, subida de CSV).
3. **Formateo Monetario Centralizado**: Ningún componente formatea números por su cuenta; se utiliza un componente unificado `<MoneyDisplay cents={125050} currency="EUR" />` que renderiza de manera accesible `"1.250,50 €"`.

---

## 4. Arquitectura de Infraestructura Local (Docker)

Cada repositorio cuenta con sus herramientas de contenedorización individuales:

### 4.1 Infraestructura de `finanzia-api`
- **`Dockerfile`**: Compilación multi-etapa (etapa de build con dependencias de desarrollo y etapa de producción ligera `node:20-alpine`).
- **`docker-compose.yml`**: Orquestación del backend y servicios asociados:
  - **Servicio `postgres`**: Imagen `postgres:16-alpine`, puerto `5432:5432`, volumen persistente `finanzia_pgdata`, healthcheck con `pg_isready`.
  - **Servicio `api`** (opcional para desarrollo, indispensable para pruebas reproducibles): Ejecuta la API de NestJS comunicándose por la red interna Docker.
  - **Variables de entorno**: Inyectadas desde `.env` local (no versionado en Git).

### 4.2 Infraestructura de `finanzia-web`
- **`Dockerfile`**: Compilación multi-etapa para Next.js con soporte de standalone output para optimizar peso y memoria en ejecución.
- **`docker-compose.yml`**: Permite levantar el frontend y Storybook de forma independiente si se desea ejecutar el entorno totalmente dockerizado.

---

## 5. Plan Futuro de Despliegue en Microsoft Azure (Diseño y Documentación)

Conforme a las reglas del proyecto, el despliegue en la nube **no se ejecutará** en esta fase, pero queda planificado con la siguiente topología de referencia:

```mermaid
flowchart TD
    subgraph AzureCloud["Microsoft Azure (Entorno Futuro de Producción)"]
        subgraph FrontDoorDNS["Borde de Red y DNS"]
            AFD["Azure Front Door / Custom Domain + Managed TLS"]
        end

        subgraph ContainerEnv["Azure Container Apps (ACA) Environment"]
            ACA_Web["Container App: finanzia-web\n(Replicas 1-3, Autoscale CPU/Mem)"]
            ACA_API["Container App: finanzia-api\n(Replicas 1-5, Autoscale HTTP)"]
        end

        subgraph ManagedData["Datos Gestionados"]
            AzurePG[("Azure Database for PostgreSQL Flexible Server\n(Zone-redundant, Automated Backups)")]
        end

        subgraph SecurityAndMonitoring["Seguridad y Monitorización"]
            AKV["Azure Key Vault (Secretos, JWT Keys, Gemini API Key)"]
            AppInsights["Application Insights & Azure Monitor (Logs y Telemetría)"]
        end
    end

    AFD -->|"Enruta / (Frontend)"| ACA_Web
    AFD -->|"Enruta /api/* (Backend)"| ACA_API
    ACA_Web -->|"Llamadas API cliente"| ACA_API
    ACA_API --> AzurePG
    ACA_API --> AKV
    ACA_API --> AppInsights
    ACA_Web --> AppInsights
```

*Nota: La especificación completa, dimensionamiento, cálculo de costes y checklist para Azure se entregará en el documento formal PDF en la Épica 6.*
