# FinanZIA Web — Frontend

Aplicación frontend para **FinanZIA**, plataforma web de finanzas personales asistida por inteligencia artificial. Diseñada con interfaz moderna, visualización financiera precisa, catálogo de componentes interactivo y arquitectura desacoplada.

---

## 🎨 Arquitectura y Tecnologías

- **Framework**: [Next.js](https://nextjs.org/) 15 (App Router, React 19, TypeScript)
- **Diseño y Estilos**: Vanilla CSS Modules con variables de diseño temáticas (Dark/Light mode, tokens consistentes, glassmorphism y microinteracciones).
- **Catálogo UI Aislado**: [Storybook](https://storybook.js.org/) 8 para desarrollo guiado por componentes (*Component-Driven Development*).
- **Iconografía**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) y [React Testing Library](https://testing-library.com/) con soporte de JSDOM.
- **Regla Monetaria**: Formateo monetario centralizado mediante el componente `<MoneyDisplay />` basado en enteros en céntimos (cero floats) y formato regional estándar `es-ES`.

---

## 📁 Estructura del Código

```
finanzia-web/
├── .storybook/              # Configuración de Storybook (main.ts, preview.ts)
├── src/
│   ├── core/                # Dominio y Lógica Financiera en Frontend (Hexagonal)
│   │   ├── domain/          # Modelos y Value Objects (Money, Currency)
│   │   └── ports/           # Interfaces para clientes HTTP y almacenamiento
│   ├── infrastructure/      # Adaptadores de comunicación (Fetch seguro a API)
│       └── presentation/        # Capa de Presentación React / Next.js
│           ├── components/      # Componentes modulares e historias (*.stories.tsx)
│           │   ├── ui/          # Botones, modales, tarjetas, inputs
│           │   └── financial/   # MoneyDisplay, tarjetas de saldo, tablas
│           └── app/             # Enrutador Next.js (App Router)
│               ├── (auth)/      # Login y Registro
│               └── (dashboard)/ # Panel principal, Cuentas, Transacciones
├── tests/                   # Pruebas unitarias de componentes y hooks
└── docker/                  # Dockerfile de producción y desarrollo
```

---

## 🚀 Comandos del Proyecto

### 1. Instalación de Dependencias
```bash
npm install
```

### 2. Ejecución del Servidor Web (Next.js)

```bash
# Iniciar servidor de desarrollo en puerto 3000
npm run dev

# Compilar para producción
npm run build

# Iniciar servidor compilado en modo producción
npm run start
```

- **URL de la Aplicación**: [http://localhost:3000](http://localhost:3000)

### 3. Catálogo de Componentes (Storybook)

```bash
# Iniciar Storybook interactivo en puerto 6006
npm run storybook

# Generar bundle estático de Storybook para despliegue/documentación
npm run build-storybook
```

- **URL de Storybook**: [http://localhost:6006](http://localhost:6006)

### 4. Pruebas Automatizadas (Vitest + Testing Library)

```bash
# Ejecutar todas las pruebas unitarias una vez
npm test

# Ejecutar pruebas en modo interactivo con recarga en cambios (watch)
npm run test:watch

# Ejecutar pruebas con reporte de cobertura de código
npm run test:coverage
```

### 5. Calidad de Código y Linting

```bash
# Validar reglas de TypeScript y Next.js con ESLint
npm run lint
```

---

## 🔐 Variables de Entorno (`.env.local`)

Copia la plantilla `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```
