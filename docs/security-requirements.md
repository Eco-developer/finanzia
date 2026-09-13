# FinanZIA — Requisitos de Seguridad, Privacidad y Cumplimiento

| Metadata | Detalle |
| :--- | :--- |
| **Clasificación de Datos** | Datos Financieros Sensibles y Privados del Usuario |
| **Cumplimiento de Referencia** | Principios del RGPD (Protección de datos por diseño y por defecto) y OWASP Top 10 |
| **Modelo de Amenazas** | Fuga de datos entre usuarios, inyección de fórmulas CSV, inyección de prompt en LLM, exposición de claves |

---

## 1. Aislamiento Estricto Multi-Inquilino (Tenant Isolation)

El riesgo más crítico en una aplicación financiera es la filtración de transacciones o cuentas entre diferentes usuarios.

1. **Gobernanza a nivel de Token**:
   - Cada solicitud protegida es validada por el `JwtAuthGuard`, extrayendo el `userId` verificado criptográficamente.
   - Prohibición absoluta de aceptar el `userId` desde el cuerpo de la petición (`body`) o parámetros de consulta (`query params`).
2. **Filtrado Incondicional en Repositorios Prisma**:
   - Todas las consultas de lectura y mutación incluyen obligatoriamente la cláusula:
     ```typescript
     where: { id, userId: currentUser.id }
     ```
   - Intentar acceder a un recurso ajeno provocará una respuesta genérica `404 Not Found` (para no revelar la existencia del registro) o `403 Forbidden`.

---

## 2. Privacidad de Datos Financieros y Anonimización ante la IA

Para salvaguardar la intimidad del usuario y cumplir con la legislación de protección de datos:

1. **Filtro de Anonimización Previo a Gemini**:
   - El adaptador `GeminiSdkAdapter` pasa todas las cadenas por una capa de sanitización antes de enviarlas al modelo:
     - Detección y eliminación de códigos **IBAN** (mediante regex `[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}`).
     - Eliminación de identificadores fiscales personales (**DNI/NIE/CIF**).
     - Seudonimización de nombres de titulares bancarios.
   - A la API de Gemini únicamente se transfieren categorías, importes numéricos en céntimos y conceptos comerciales genéricos indispensables para el razonamiento.
2. **Aislamiento de Claves de API**:
   - La clave `GEMINI_API_KEY` reside exclusivamente en el entorno de `finanzia-api`.
   - El frontend `finanzia-web` no posee acceso a la clave ni a dependencias de Google Gen AI.

---

## 3. Seguridad en la Gestión de Autenticación y Sesiones

1. **Almacenamiento de Contraseñas**:
   - Hash mediante **Argon2id** (o alternativamente `bcrypt` con factor de coste 12).
   - Aplicación de sal (*salt*) aleatorio único por usuario gestionado automáticamente por la librería criptográfica.
2. **Almacenamiento de Tokens JWT**:
   - Transmisión en cabecera `Set-Cookie` con los atributos:
     - `HttpOnly`: Impide el acceso al token desde JavaScript en el navegador (mitigación total de robo de sesión por XSS).
     - `Secure`: Solo se transmite sobre conexiones HTTPS (excepto en `localhost` durante desarrollo).
     - `SameSite=Strict`: Previene de forma nativa ataques de falsificación de peticiones en sitios cruzados (CSRF).

---

## 4. Protección contra Ataques Específicos

### 4.1 Inyección de Fórmulas en Importaciones CSV (CSV Injection)
Los archivos CSV descargados de bancos pueden contener celdas con fórmulas maliciosas pensadas para ejecutarse al exportar o abrir el fichero en Excel/LibreOffice (`=cmd|`, `@SUM`, `+`, `-`).
- **Mitigación**:
  - El parser de CSV en el frontend y backend inspecciona el primer carácter de los campos de texto.
  - Si el primer carácter es `=`, `+`, `-`, `@`, `\t` o `\r`, se antepone un apóstrofe `'` para forzar su interpretación como texto plano inofensivo.

### 4.2 Inyección de Prompts y Jailbreaks en el Asistente de IA
- **Mitigación**:
  - Los datos proporcionados por el usuario o extraídos de transacciones se formatean como argumentos estructurados de herramientas o se delimitan con etiquetas XML claras dentro del contexto del mensaje (`<transaction_data>...</transaction_data>`).
  - Las herramientas backend validan estrictamente los tipos de datos recibidos y no ejecutan sentencias de texto libre en la base de datos.

### 4.3 Limitación de Tasa de Peticiones (Rate Limiting)
- Implementación de `@nestjs/throttler` para prevenir ataques de fuerza bruta y denegación de servicio:
  - `/api/auth/*`: Máximo 5 intentos por minuto por IP.
  - `/api/advisor/chat`: Máximo 15 mensajes por minuto por usuario (para control de cuota de Gemini).
  - `/api/*` (general): 100 peticiones por minuto.

### 4.4 Cabeceras de Seguridad HTTP (Helmet)
- Configuración de `helmet()` en NestJS para habilitar:
  - `Content-Security-Policy` (CSP)
  - `X-Frame-Options: DENY` (prevención de Clickjacking)
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security` (HSTS)

---

## 5. Gestión de Secretos y Configuración

1. **Prohibición de Secretos en Control de Versiones**:
   - Los archivos `.env`, `.env.local` y `.env.production` están incluidos en el `.gitignore` de ambos repositorios.
   - Se mantiene un archivo `.env.example` versionado con valores ficticios y documentación de cada variable requerida.
2. **Escaneo Automatizado de Secretos**:
   - Se integrará en el pipeline de CI un escáner de secretos (`gitleaks` o `trufflehog`) para bloquear cualquier commit accidental que contenga claves privadas.
