# FinanZIA API — Backend

Servicio backend RESTful para **FinanZIA**, plataforma web de finanzas personales asistida por inteligencia artificial verificable con arquitectura hexagonal, cantidades estrictas en enteros/céntimos (cero float), aislamiento multi-tenant y motor de base de datos PostgreSQL.

---

## 🏗️ Arquitectura y Tecnologías

- **Framework**: [NestJS](https://nestjs.com/) (TypeScript)
- **Patrón Arquitectónico**: Arquitectura Hexagonal / Puertos y Adaptadores (Clean Architecture)
  - `src/core/domain/`: Entidades de dominio, value objects e interfaces de puertos de persistencia.
  - `src/core/application/`: Servicios y casos de uso de negocio.
  - `src/infrastructure/`: Adaptadores secundarios (Prisma ORM, PostgreSQL, Hashing Argon2id, JWT).
  - `src/presentation/`: Adaptadores primarios (Controladores REST, DTOs validados, filtros de error).
- **ORM**: [Prisma ORM](https://www.prisma.io/)
- **Base de Datos**: PostgreSQL 16 (orquestado localmente mediante Docker Compose)
- **Seguridad**: Argon2id para contraseñas, JWT transmitido en cookies `HttpOnly` y cabeceras `Bearer`, aislamiento estricto por `userId`.
- **Regla Monetaria**: Todos los importes se manejan como enteros en céntimos (`BigInt` / `Int`), prohibiendo el uso de tipos de coma flotante.
- **Documentación API**: OpenAPI 3.0 / Swagger en `/api/docs`

---

## 📋 Requisitos Previos

- [Node.js](https://nodejs.org/) (v20 o superior)
- [npm](https://www.npmjs.com/) (v10 o superior)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (con Docker Compose)

---

## 🚀 Comandos del Proyecto

### 1. Instalación de Dependencias
```bash
npm install
```

### 2. Infraestructura Local (PostgreSQL 16 en Docker)
```bash
# Iniciar contenedor de PostgreSQL en segundo plano
docker compose -f docker/docker-compose.yml up -d postgres

# Ver estado de los contenedores
docker ps

# Detener base de datos
docker compose -f docker/docker-compose.yml down
```

### 3. Base de Datos y Prisma
```bash
# Generar tipos del cliente tipado de Prisma
npm run prisma:generate
# o alternativamente: npx prisma generate

# Sincronizar esquema de base de datos con PostgreSQL
npx prisma db push

# Ejecutar migraciones declarativas
npm run prisma:migrate

# Abrir panel interactivo Prisma Studio en el navegador
npm run prisma:studio
```

### 4. Ejecución del Servidor

```bash
# Modo desarrollo con recarga en caliente (Watch Mode)
npm run start:dev

# Modo producción (compila y corre desde dist/main)
npm run build
npm run start:prod

# Modo debug con inspector de Node.js
npm run start:debug
```

- **API Base URL**: `http://localhost:3001/api`
- **Health Check**: `http://localhost:3001/api/health`
- **Documentación Interactiva Swagger**: `http://localhost:3001/api/docs`

### 5. Pruebas Automatizadas (Testing)
```bash
# Ejecutar todas las pruebas unitarias con Jest
npm test

# Ejecutar pruebas en modo observador (watch)
npm run test:watch

# Ejecutar pruebas con reporte de cobertura de código
npm run test:cov

# Ejecutar pruebas end-to-end (E2E)
npm run test:e2e
```

### 6. Calidad de Código y Linting
```bash
# Comprobar y corregir formato y reglas de TypeScript con ESLint
npm run lint

# Formatear código fuente y tests con Prettier
npm run format
```

---

## 🔐 Variables de Entorno (`.env`)

Copia la plantilla de ejemplo y ajusta los valores locales si es necesario:
```bash
cp .env.example .env
```