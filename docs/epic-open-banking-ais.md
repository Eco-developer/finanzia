# FinanZIA — Épica 6: Conexión Bancaria y Lectura de Movimientos en Tiempo Real (Open Banking AIS)

| Metadata | Detalle |
| :--- | :--- |
| **Identificador** | **ÉPICA-06 (FUTURO / BACKLOG)** |
| **Nombre** | Conexión Bancaria y Lectura de Movimientos en Tiempo Real (Open Banking AIS) |
| **Tipo de Característica** | Open Banking — Servicio de Información sobre Cuentas (AIS - Account Information Service) |
| **Restricción Crítica** | **Estrictamente Solo Lectura**. Prohibición total de funciones de pago o transferencias (PIS). |
| **Estado Actual** | **Backlog Priorizado para Futuras Versiones** (Diseñado y planificado; no en desarrollo activo). |
| **Documento de Referencia Técnica y Legal** | [`docs/open-banking-implementation-plan.md`](./open-banking-implementation-plan.md) |

---

## 1. Resumen y Propósito de la Épica

Esta épica tiene como finalidad sustituir o complementar la importación manual de archivos CSV mediante la conexión automatizada y segura con entidades bancarias europeas (con foco en España: Banco Santander, BBVA, CaixaBank, Sabadell, Revolut, ING, Openbank, etc.) a través de APIs oficiales normalizadas bajo la directiva **PSD2/PSD3**.

Permite que cuando el usuario realice un pago con tarjeta o reciba un movimiento en su cuenta bancaria, dicho movimiento sea detectado mediante webhooks, ingestando la transacción, convirtiendo su importe a céntimos enteros (`BigInt`), deduplicándola y asignándole automáticamente una categoría sin requerir ninguna acción manual del usuario.

> [!IMPORTANT]
> **DELIMITACIÓN LEGAL Y DE SEGURIDAD (INNEGOCIABLE):**
> 1. FinanZIA operará **únicamente en modalidad de lectura (AIS)**. No existirá ningún mecanismo ni botón para emitir pagos, transferencias o retenciones (PIS).
> 2. FinanZIA **nunca** capturará ni almacenará números de tarjetas (PAN de 16 dígitos), códigos CVV ni claves de acceso a la banca electrónica.
> 3. Toda la autenticación se realizará en los servidores y aplicaciones oficiales de los bancos mediante **Autenticación Reforzada de Clientes (SCA)** por redirección OAuth2.

---

## 2. Historias de Usuario (User Stories)

### HU-17: Vinculación Segura de Entidad Bancaria (SCA de Solo Lectura)
* **Como** usuario de FinanZIA,
* **quiero** seleccionar mi banco en una lista visual y autorizar el acceso de lectura a mis movimientos mediante la app o web oficial de mi entidad bancaria,
* **para** mantener sincronizada mi información financiera sin entregar mis contraseñas bancarias a la aplicación.

### HU-18: Detección e Ingesta de Movimientos en Tiempo Real
* **Como** usuario de FinanZIA,
* **quiero** que cuando efectúe un pago con tarjeta o se liquide un cargo en mi cuenta bancaria, la transacción se registre automáticamente en la aplicación,
* **para** no tener que descargar periódicamente extractos CSV ni introducir gastos a mano.

### HU-19: Deduplicación Robusta de Transacciones (Pending vs Booked)
* **Como** usuario de FinanZIA,
* **quiero** que el sistema reconozca cuando un pago pendiente (*retención*) se convierte en definitivo (*liquidado*),
* **para** que mis saldos y resúmenes de gasto no computen dos veces el mismo movimiento.

### HU-20: Autoclasificación Instantánea de Movimientos Bancarios
* **Como** usuario de FinanZIA,
* **quiero** que los nuevos movimientos bancarios sincronizados se asignen automáticamente a su categoría de gasto correspondiente (usando mis reglas guardadas o la IA de FinanZIA),
* **para** que mis presupuestos mensuales se actualicen en tiempo real sin requerir categorización manual.

### HU-21: Notificaciones y Actualización In-App en Vivo
* **Como** usuario con la aplicación abierta en mi ordenador o móvil,
* **quiero** ver reflejados los nuevos cargos bancarios al instante en pantalla mediante una alerta visual no invasiva,
* **para** tener constancia inmediata del impacto del gasto en mi presupuesto.

### HU-22: Gestión del Consentimiento y Derecho de Supresión (RGPD)
* **Como** usuario consciente de mi privacidad,
* **quiero** ver cuántos días restan para que expire mi autorización bancaria (máximo 180 días) y poder desvincular mi banco con un solo clic en cualquier momento,
* **para** ejercer mi derecho al olvido y revocar de forma inmediata el acceso a mis extractos bancarios.

---

## 3. Criterios de Aceptación y Calidad (QA)

| Código | Criterio de Verificación | Nivel de Severidad |
| :--- | :--- | :--- |
| **CA-06.1** | **Aislamiento Estricto AIS**: La integración carece por completo de endpoints o funciones para ordenar pagos. La API del agregador solo tiene permisos `GET /accounts` y `GET /transactions`. | **Bloqueante** |
| **CA-06.2** | **Cero Almacenamiento de Credenciales**: Ningún campo de formulario en el frontend solicita PIN bancario, contraseñas ni PAN/CVV de tarjeta. El flujo se canaliza 100% por redirección externa SCA. | **Bloqueante** |
| **CA-06.3** | **Cifrado de Tokens**: Los `accessToken` y `requisitionId` del agregador bancario se almacenan cifrados con **AES-256-GCM** en PostgreSQL. | **Bloqueante** |
| **CA-06.4** | **Integridad Monetaria**: Todo importe devuelto por la API bancaria se convierte a `BigInt` en céntimos antes de insertarse en la base de datos (ej. `-14.50 EUR` $\rightarrow$ `-1450n`). | **Bloqueante** |
| **CA-06.5** | **Validación Criptográfica de Webhooks**: El endpoint receptor de webhooks valida la firma HMAC del agregador bancario. Peticiones sin firma válida se descartan con `401 Unauthorized`. | **Bloqueante** |
| **CA-06.6** | **Deduplicación Determinista**: La inserción valida el `deduplicationHash`. Si la transacción bancaria ya existe en estado `isPending: true`, se actualiza a `isPending: false` sin duplicar filas. | **Alta** |
| **CA-06.7** | **Sanitización de Datos ante la IA**: Antes de enviar conceptos a Gemini para clasificar comercios desconocidos, se eliminan números IBAN, DNI/NIE y sufijos de tarjetas. | **Bloqueante** |
| **CA-06.8** | **Revocación Total en 1-Click**: Al pulsar "Desvincular cuenta", se invalida la requisición en la API del agregador y se eliminan los tokens cifrados de la base de datos local. | **Alta** |

---

## 4. Dependencias y Pre-requisitos Técnicos

1. **Agregador Bancario Homologado**:
   * Creación de cuenta de desarrollador en **GoCardless Bank Account Data** (anteriormente Nordigen) para disponer de `SECRET_ID` y `SECRET_KEY`.
   * Uso del banco de pruebas oficial `SANDBOXFINANCE_SBN0000` para testing en entorno local.
2. **Receptor de Webhooks en Desarrollo**:
   * En local, los webhooks de entidades bancarias requieren un túnel HTTPS (ej. ngrok o Cloudflare Tunnel) para redirigir tráfico al puerto `3001` de `finanzia-api`.
3. **Módulo Criptográfico en Backend**:
   * Clave maestra `BANK_ENCRYPTION_KEY` de 32 bytes configurada en `.env` (excluida del control de versiones).

---

## 5. Decisiones de Producto y Estado

* **Decisión de Planificación**: Esta épica se encuentra formalmente **aprobada a nivel de especificación y arquitectura**, pero su desarrollo queda **diferido al futuro** (post-MVP).
* **Motivo**: El MVP actual prioriza consolidar la estabilidad de la importación CSV, el asistente conversacional Gemini con Function Calling, el cálculo presupuestario determinista y la experiencia de usuario local sin dependencias externas de terceros.
