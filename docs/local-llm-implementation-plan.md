# FinanZIA — Plan Técnico de Implementación: Motor de IA y LLM 100% Local (Ollama y ReAct Determinista)

| Metadata | Detalle |
| :--- | :--- |
| **Documento** | Plan de Implementación Técnica de Arquitectura de IA Local |
| **Épica Vinculada** | [`docs/epic-local-llm-ollama.md`](./epic-local-llm-ollama.md) (ÉPICA-08) |
| **Estado** | **Backlog Diferido / Futuro** |
| **Rama Prevista** | `feature/local-llm-ollama` |

---

## 1. Cumplimiento de las Reglas Globales del Proyecto

En cumplimiento de la **Regla 6** de [`FINANZIA — REGLAS GLOBALES DEL PROYECTO.md`](file:///e:/personal-finance/FINANZIA%20%E2%80%94%20REGLAS%20GLOBALES%20DEL%20PROYECTO.md):

* **Qué se instalará/añadirá:**
  * Un nuevo servicio en [`docker-compose.yml`](file:///e:/personal-finance/docker-compose.yml): imagen `ollama/ollama:latest`.
  * Modelo de lenguaje cuantizado con soporte de *Function Calling* (`qwen2.5:7b` o `llama3.1:8b`), guardado en el volumen Docker `finanzia_ollama`.
  * API client ligero (HTTP nativo o SDK de Ollama) en `finanzia-api`.
* **Para qué se necesita:**
  * Para ejecutar la inferencia de lenguaje natural y la invocación de herramientas financieras localmente, eliminando el envío de datos de usuario a proveedores de terceros (Zero Data Training).
* **Qué cambios realizará:**
  * Creación de `OllamaAdvisorService` en `src/infrastructure/ai/`.
  * Modularización del motor determinista en `DeterministicReActAdvisorService`.
  * Inyección condicional mediante factoría en `src/app.module.ts` a través de la variable `AI_PROVIDER`.
* **Requisitos de hardware:**
  * RAM: 8 GB mínimo (16 GB recomendado en modo CPU).
  * VRAM: 6-8 GB si se usa GPU dedicada.
  * Disco: ~5 GB para almacenamiento del modelo cuantizado.
* **Procedimiento de reversión o desinstalación:**
  * `docker compose stop ollama && docker compose rm ollama`
  * `docker volume rm finanzia_ollama`
  * Configurar en `.env`: `AI_PROVIDER=gemini` o `AI_PROVIDER=react-local`.

---

## 2. Diseño Arquitectónico Hexagonal

```
┌────────────────────────────────────────────────────────┐
│               CAPA DE APLICACIÓN (CORE)                │
│                                                        │
│   AiAdvisorService ──────► IAiAdvisorPort (Interfaz)   │
│   AiToolsService ◄──────────────┐                      │
└─────────────────────────────────┼──────────────────────┘
                                  │ Implementan
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ GeminiAdvisor    │   │ OllamaAdvisorService │   │ DeterministicReAct   │
│ Service          │   │ (Nuevo Adaptador)    │   │ AdvisorService       │
└────────┬─────────┘   └──────────┬───────────┘   └──────────┬───────────┘
         │                        │                          │
         ▼ HTTPS                  ▼ HTTP Local               ▼ TypeScript
  Google Gemini API       Contenedor Ollama:11434       Cálculo en memoria
```

### 2.1 Selector Dinámico en `app.module.ts`

```typescript
{
  provide: AI_ADVISOR_PORT,
  useFactory: (
    config: ConfigService,
    gemini: GeminiAdvisorService,
    ollama: OllamaAdvisorService,
    react: DeterministicReActAdvisorService,
  ) => {
    const provider = config.get<string>('AI_PROVIDER', 'gemini');
    if (provider === 'ollama') return ollama;
    if (provider === 'react-local') return react;
    return gemini;
  },
  inject: [ConfigService, GeminiAdvisorService, OllamaAdvisorService, DeterministicReActAdvisorService],
}
```

---

## 3. Fases de Ejecución Técnica (Para cuando se reactive la épica)

### Fase 1: Infraestructura Docker y Configuración
1. Añadir servicio `ollama` y volumen `finanzia_ollama` en `docker-compose.yml`.
2. Actualizar variables de entorno en `.env.example`:
   * `AI_PROVIDER=ollama`
   * `OLLAMA_BASE_URL=http://ollama:11434`
   * `OLLAMA_MODEL=qwen2.5:7b`
3. Crear script `npm run ollama:pull` en `finanzia-api/package.json` para descargar el modelo inicial.

### Fase 2: Esquema Universal de Herramientas
1. Extraer la definición de herramientas de `gemini-advisor.service.ts` a `src/infrastructure/ai/schemas/advisor-tools.schema.ts` en formato JSON Schema estándar.
2. Garantizar compatibilidad bidireccional tanto para Google GenAI como para Ollama Tool Calling.

### Fase 3: Adaptadores Hexagonales
1. **`DeterministicReActAdvisorService`**:
   * Desacoplar el método `executeLocalFallback` de `gemini-advisor.service.ts` en su propia clase inyectable.
2. **`OllamaAdvisorService`**:
   * Implementar `IAiAdvisorPort`.
   * Integrar llamada a `/api/chat` de Ollama enviando el prompt del sistema, perfil financiero y herramientas.
   * Manejar la ejecución de *tool calls* a través de `AiToolsService`.
   * Implementar mecanismo de *failover* que derive la consulta a `DeterministicReActAdvisorService` ante caídas de Ollama.

### Fase 4: Pruebas y Validación
1. Crear suite unitaria `test/unit/ollama-advisor.service.spec.ts`.
2. Verificar reglas arquitectónicas con `npm run lint:arch` (`dependency-cruiser`).
3. Ejecutar suite de pruebas de regresión completa con `npm run test`.
