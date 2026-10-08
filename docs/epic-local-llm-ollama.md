# FinanZIA — Épica 8: Motor de IA y LLM 100% Local (Ollama y ReAct Determinista con Privacidad Total)

| Metadata | Detalle |
| :--- | :--- |
| **Identificador** | **ÉPICA-08 (FUTURO / BACKLOG)** |
| **Nombre** | Motor de IA y LLM 100% Local (Ollama y ReAct Determinista) |
| **Tipo de Característica** | Inteligencia Artificial y Privacidad — Inferencia Local sin Salida a la Nube |
| **Restricción Crítica** | **Zero Data Training / Zero Data Retention**. Ningún dato financiero del usuario saldrá de la máquina local ni se utilizará para entrenar modelos de terceros. |
| **Estado Actual** | **Backlog Priorizado para Futuras Versiones** (Diseñado, especificado y planificado; diferido para el futuro). |
| **Documento de Referencia Técnica** | [`docs/local-llm-implementation-plan.md`](./local-llm-implementation-plan.md) |

---

## 1. Resumen y Propósito de la Épica

Esta épica tiene como finalidad dotar a FinanZIA de una infraestructura de Inteligencia Artificial que se ejecute íntegramente en la máquina del usuario (o servidor local), eliminando la dependencia obligatoria de APIs cloud de terceros (Google Gemini API) y garantizando que los datos financieros, transacciones y hábitos de consumo del usuario **nunca sean compartidos ni utilizados para entrenar modelos de lenguaje**.

La solución se apoya en la **Arquitectura Hexagonal desacoplada** de FinanZIA, implementando nuevos adaptadores sobre el puerto [`IAiAdvisorPort`](file:///e:/personal-finance/finanzia-api/src/core/application/ports/ai-advisor.port.ts):
1. **`OllamaAdvisorService`**: Conector con el motor de inferencia local **Ollama** ejecutándose en un contenedor Docker con modelos abiertos optimizados para *Function Calling* en español (ej. `qwen2.5:7b` o `llama3.1:8b`).
2. **`DeterministicReActAdvisorService`**: Modularización del motor ReAct determinista en memoria, que resuelve consultas analíticas directamente en TypeScript sin consumo de CPU/GPU de modelos de lenguaje.
3. **Selector Dinámico (`AI_PROVIDER`)**: Capacidad de alternar entre `gemini`, `ollama` y `react-local` sin modificar el código de la aplicación.

> [!IMPORTANT]
> **PRINCIPIOS INVIOLABLES DE LA ÉPICA:**
> 1. **Zero Data Training**: Garantía absoluta de que ningún prompt, respuesta ni dato de cuenta/transacción abandona la red local.
> 2. **Cero Coma Flotante**: Todo cálculo e intercambio de parámetros entre el LLM local y las herramientas backend se realiza en **céntimos enteros (`BigInt`)**.
> 3. **Human-in-the-Loop Obligatorio**: El LLM local jamás podrá mutar de forma directa datos contables sensibles (edición/borrado de presupuestos, metas o transacciones); siempre debe emitir propuestas para aprobación explícita del usuario.
> 4. **Resiliencia con Failover Automático**: Si el contenedor de Ollama no está levantado o se agota el tiempo de espera, el sistema debe conmutar automáticamente al motor ReAct determinista local para que el usuario nunca quede sin respuesta.

---

## 2. Historias de Usuario (User Stories)

### HU-29: Selección Dinámica del Proveedor de IA
* **Como** usuario o administrador de FinanZIA,
* **quiero** configurar mediante una variable de entorno (`AI_PROVIDER=gemini|ollama|react-local`) qué motor de inteligencia artificial atiende las peticiones del asesor,
* **para** tener libertad absoluta de elegir entre conveniencia cloud o privacidad y soberanía de datos 100% local.

### HU-30: Inferencia y Razonamiento 100% Local (Zero Cloud Leaks)
* **Como** usuario preocupado por la privacidad de mis datos bancarios,
* **quiero** interactuar con FinanZIA Advisor sabiendo que el modelo de lenguaje se ejecuta localmente en mi equipo mediante Ollama,
* **para** tener la certeza de que ningún proveedor externo entrena sus redes neuronales con mis cifras ni hábitos financieros.

### HU-31: Ejecución Local de Herramientas Financieras (Tool Calling en Ollama)
* **Como** usuario de FinanZIA,
* **quiero** que el LLM local invoque las herramientas analíticas existentes (`get_financial_summary`, `get_expenses_by_category`, etc.) con la misma precisión que el modelo cloud,
* **para** recibir respuestas verídicas calculadas directamente sobre mi base de datos local y sin datos inventados.

### HU-32: Resiliencia y Fallback al Motor ReAct Determinista
* **Como** usuario que ejecuta la aplicación en un equipo con recursos limitados (sin GPU potente o sin Ollama activo),
* **quiero** que el asesor financiero continúe respondiendo a mis preguntas de saldos, deudas y presupuestos mediante el motor ReAct determinista,
* **para** que el servicio no falle ni quede bloqueado ante la indisponibilidad del modelo generativo.

---

## 3. Criterios de Aceptación y Calidad (QA)

| Código | Criterio de Verificación | Nivel de Severidad |
| :--- | :--- | :--- |
| **CA-08.1** | **Aislamiento de Red (Zero Egress)**: Con `AI_PROVIDER=ollama`, el backend NestJS no realiza ninguna llamada HTTP/HTTPS hacia dominios de Google (`generativelanguage.googleapis.com`) ni otros servicios cloud. | **Bloqueante** |
| **CA-08.2** | **Conformidad Hexagonal**: Los nuevos adaptadores implementan estrictamente la interfaz [`IAiAdvisorPort`](file:///e:/personal-finance/finanzia-api/src/core/application/ports/ai-advisor.port.ts). `dependency-cruiser` (`npm run lint:arch`) aprueba sin errores arquitectónicos. | **Bloqueante** |
| **CA-08.3** | **Preservación de Human-in-the-Loop**: Cualquier intención del usuario de editar/borrar presupuestos, metas o deudas genera exclusivamente una propuesta interactiva (`PROPOSED`) que requiere aprobación manual. | **Bloqueante** |
| **CA-08.4** | **Precisión de Importes en Céntimos**: Las herramientas invocadas por Ollama reciben y devuelven valores en céntimos enteros, respetando la regla *Zero-Float Policy*. | **Bloqueante** |
| **CA-08.5** | **Failover Transparente**: Si el servicio de Ollama no responde en menos de 10 segundos o devuelve error de conexión, el backend conmuta de forma automática y transparente al motor determinista sin lanzar error 500 al cliente. | **Alta** |
| **CA-08.6** | **Despliegue Containerizado Reproducible**: El servicio `ollama` se define en `docker-compose.yml` con volumen persistente para modelos y sin dependencias obligatorias de instalación en el host. | **Alta** |
| **CA-08.7** | **Cobertura de Tests Unitarios**: La suite `test/unit/ollama-advisor.service.spec.ts` cubre respuestas directas, ejecución de herramientas y escenarios de failover con cobertura $\ge$ 85%. | **Alta** |

---

## 4. Dependencias y Pre-requisitos Técnicos

1. **Docker y Contenedores**:
   * Contenedor `ollama/ollama:latest` añadido a `docker-compose.yml`.
   * Volumen de Docker `finanzia_ollama` para almacenamiento persistente del modelo (~5 GB).
2. **Recursos de Hardware**:
   * 8 GB a 16 GB de RAM en la máquina anfitriona.
   * GPU NVIDIA opcional (soporte CPU nativo garantizado).
3. **Modelos Cualificados**:
   * `qwen2.5:7b` (prioritario para Function Calling y español).
   * `llama3.1:8b` (alternativa).

---

## 5. Estado y Decisión de Planificación

* **Decisión de Planificación**: Esta épica se encuentra formalmente **aprobada y especificada a nivel de arquitectura y casos de uso**, pero queda **diferida al backlog para su desarrollo en una versión futura (post-MVP)**.
* **Rama prevista para su desarrollo futuro**: `feature/local-llm-ollama`.
