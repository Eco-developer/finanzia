# FinanZIA — Product Requirements Document (PRD)

| Metadata | Detalle |
| :--- | :--- |
| **Producto** | FinanZIA (Finanzas Personales con IA Verificable) |
| **Fase actual** | Fase 1 — Análisis y Diseño de Arquitectura (MVP) |
| **Product Owner & Supervisor Técnico** | Usuario |
| **Rol de Desarrollo** | Agente de Análisis y Diseño (Google Antigravity) |
| **Estado** | Aprobado para Especificación Detallada |

---

## 1. Visión del Producto

**FinanZIA** es una aplicación web local de finanzas personales diseñada para proporcionar control total, trazabilidad rigurosa y análisis inteligente sobre la economía del usuario. A diferencia de las herramientas convencionales, integra un asistente de inteligencia artificial (FinanZIA Advisor) basado en **Gemini API** que opera bajo principios estrictos de **cero alucinaciones**, utilizando herramientas de cálculo deterministas en el backend y un modelo de **aprobación humana obligatoria (*human-in-the-loop*)** para cualquier recomendación o cambio de datos.

El producto se concibe como una solución privada, modular y local-first, estructurada en dos repositorios independientes (`finanzia-web` y `finanzia-api`), preparada para una futura transición documentada hacia Microsoft Azure sin incurrir en costes anticipados.

---

## 2. Objetivos de Negocio y de Producto

1. **Control y Centralización**: Permitir al usuario registrar y consolidar cuentas financieras (cuentas corrientes, ahorro, efectivo, tarjetas) en un único panel de control.
2. **Importación Flexible y Conciliación**: Facilitar la carga de extractos bancarios en formato CSV mediante un asistente de mapeo interactivo de columnas, con detector de transacciones duplicadas.
3. **Categorización Híbrida Eficiente**: Clasificar transacciones al instante mediante reglas locales deterministas para comercios comunes, apoyándose en la IA de Gemini para transacciones complejas o no reconocidas.
4. **Presupuestación Activa y Metas de Ahorro**: Establecer techos de gasto mensuales por categoría con alertas tempranas y seguimiento del progreso hacia objetivos de ahorro específicos.
5. **Asesoría Financiera Explicable**: Ofrecer consultas en lenguaje natural donde cada dato numérico proviene de consultas verificables en la base de datos, evitando cifras inventadas o aproximaciones no fundamentadas.

---

## 3. Alcance del MVP vs. Roadmap Futuro

### 3.1 Dentro del Alcance (MVP - Fase 1)
- **Autenticación y Sesión**:
  - Registro de usuario y login local con email/contraseña.
  - Almacenamiento seguro de contraseñas con Argon2id o bcrypt.
  - Sesiones gestionadas con tokens JWT en cookies `HttpOnly` y `Secure`.
  - Aislamiento estricto de datos por `userId`.
- **Gestión de Cuentas Financieras**:
  - Creación, edición, archivado y consulta de cuentas (cuenta corriente, ahorros, efectivo, tarjeta de crédito).
  - Cálculo automático y actualización transaccional del saldo actual en céntimos de euro.
- **Gestión de Categorías**:
  - Catálogo de categorías del sistema por defecto (Alimentación, Vivienda, Transporte, Ocio, Salud, Salario, etc.).
  - Categorías personalizadas creadas por el usuario con icono y color hexadecimal.
  - Soporte para subcategorías (jerarquía de 2 niveles).
- **Gestión de Transacciones**:
  - Alta, edición, eliminación y listado paginado/filtrable de transacciones (ingresos, gastos y transferencias entre cuentas).
  - Integridad de importes mediante enteros en céntimos (regla innegociable de cero números flotantes).
- **Importación de Extractos CSV**:
  - Subida de archivos CSV bancarios con detección de separador.
  - Asistente de mapeo visual de columnas (Fecha, Concepto, Importe).
  - Guardado de plantillas de mapeo por entidad bancaria en el navegador/backend.
  - Previsualización previa con detección de transacciones duplicadas mediante hash unívoco.
- **Presupuestos y Objetivos de Ahorro**:
  - Presupuestos mensuales por categoría con barra de progreso y umbrales de alerta (70%, 90%, 100%).
  - Metas de ahorro con importe objetivo, fecha límite y registro de aportaciones.
- **Asistente de IA (FinanZIA Advisor)**:
  - Chat conversacional en `/advisor` con streaming de respuestas.
  - Invocación de herramientas deterministas en el backend (Function Calling) para obtener saldos, gastos por categoría y estado de presupuestos.
  - Sistema de recomendaciones con estado `PROPOSED`: el usuario debe pulsar [Aprobar y Aplicar] para que cualquier acción se ejecute.
- **Calidad y Documentación**:
  - Documentación interactiva de la API con **Swagger / OpenAPI** en `/api/docs`.
  - Catálogo de componentes UI en el frontend con **Storybook**.
  - Suite de tests unitarios y de integración con Jest/Supertest en backend y React Testing Library en frontend.
  - Contenedores Docker y Docker Compose para desarrollo local con PostgreSQL.

### 3.2 Fuera del Alcance (Roadmap Futuro)
- Agregación bancaria automática mediante APIs PSD2 / Open Banking (Nordigen, GoCardless, Plaid).
- Digitalización y escaneo OCR de tickets y facturas mediante visión por computador.
- Gestión de carteras de inversión complejas (acciones, criptomonedas, cálculo de plusvalías y fiscalidad IRPF).
- Cuentas multidivisa con conversión histórica y cobertura de tipo de cambio en tiempo real.
- Cuentas compartidas / multi-usuario familiar con permisos granulares.
- Despliegue efectivo en producción en Microsoft Azure (queda limitado a diseño arquitectónico y plan en PDF).

---

## 4. Requisitos de Usuario (Historias de Usuario)

### Épica 1: Autenticación y Cuentas
- **HU-01**: Como usuario, quiero registrarme con mi correo y una contraseña segura para mantener mis finanzas privadas e inaccesibles para otros.
- **HU-02**: Como usuario, quiero iniciar y cerrar sesión de forma segura, manteniendo mi sesión activa mediante cookies protegidas.
- **HU-03**: Como usuario, quiero dar de alta mis diferentes cuentas bancarias y de efectivo con su saldo inicial en céntimos para conocer mi patrimonio líquido total.

### Épica 2: Transacciones y Categorización
- **HU-04**: Como usuario, quiero registrar manualmente un ingreso o gasto indicando fecha, cuenta, categoría, concepto e importe para mantener actualizado mi balance.
- **HU-05**: Como usuario, quiero registrar transferencias entre dos de mis cuentas para que el saldo de una disminuya y el de la otra aumente sin alterar mis gastos reales.
- **HU-06**: Como usuario, quiero que el sistema categorice automáticamente los comercios habituales mediante reglas locales rápidas para ahorrar tiempo.
- **HU-07**: Como usuario, quiero que la IA me sugiera la categoría más probable cuando ingrese un gasto ambiguo o desconocido.

### Épica 3: Importación de Extractos Bancarios
- **HU-08**: Como usuario, quiero subir un extracto en archivo CSV emitido por mi banco para registrar meses de transacciones en segundos.
- **HU-09**: Como usuario, quiero seleccionar interactivamente qué columna del CSV corresponde a la fecha, cuál al concepto y cuál al importe, guardando esta configuración para futuros extractos de la misma entidad.
- **HU-10**: Como usuario, quiero ver una tabla de previsualización antes de guardar el CSV que me avise de transacciones que ya existen (duplicadas) para no descuadrar mis saldos.

### Épica 4: Presupuestos y Metas de Ahorro
- **HU-11**: Como usuario, quiero definir un tope de gasto mensual para cada categoría (ej. 400 € en Supermercados) para evitar sobrepasar mis posibilidades.
- **HU-12**: Como usuario, quiero ver indicadores visuales del consumo de mi presupuesto con códigos de color para reaccionar antes de que termine el mes.
- **HU-13**: Como usuario, quiero crear metas de ahorro (ej. Fondo de Emergencia: 3.000 €) y registrar aportaciones para monitorizar mi avance porcentual.

### Épica 5: Asistente Financiero Inteligente (FinanZIA Advisor)
- **HU-14**: Como usuario, quiero preguntar a la IA cosas como *"¿Cuánto he gastado en ocio este mes?"* y recibir una respuesta exacta basada en mis números reales sin datos inventados.
- **HU-15**: Como usuario, quiero que la IA me ofrezca consejos de ahorro fundamentados y me presente propuestas de ajuste concretas.
- **HU-16**: Como usuario, quiero tener el control absoluto para aprobar o descartar explícitamente cualquier sugerencia de la IA antes de que modifique mis presupuestos o datos.

---

## 5. Requisitos No Funcionales (NFR)

1. **Integridad Monetaria**: Prohibición absoluta de tipos de datos de punto flotante (`float`, `double`). Todo cálculo se efectúa en céntimos (enteros).
2. **Rendimiento**:
   - Tiempos de respuesta de endpoints CRUD en la API < 100 ms en entorno local.
   - Procesamiento y detección de duplicados de un CSV de 1.000 filas en < 2 segundos.
   - Primer token de respuesta conversacional con streaming de Gemini en < 1,5 segundos.
3. **Privacidad de Datos Financieros**:
   - Anonimización previa al envío de datos al LLM: nunca enviar nombres de titulares, números de cuenta IBAN ni identificadores fiscales a la API de Gemini.
4. **Aislamiento Multi-inquilino**: Cada consulta a la base de datos debe estar incondicionalmente restringida al `userId` del usuario autenticado.
5. **Mantenibilidad y Código Limpio**:
   - Arquitectura Hexagonal en ambos repositorios (`finanzia-web` y `finanzia-api`).
   - Cobertura de pruebas unitarias y de integración mínima del 80% en lógica de negocio.
6. **Reproducibilidad Local**:
   - Ejecución del sistema completa mediante Docker Compose y scripts locales documentados.
