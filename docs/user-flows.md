# FinanZIA — Flujos de Usuario y Casos de Uso (User Flows)

Este documento detalla los flujos de interacción e intercambio de datos para las funcionalidades nucleares del MVP de FinanZIA.

---

## Flujo 1: Registro, Autenticación y Onboarding de Cuentas

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Web as Next.js (finanzia-web)
    participant API as NestJS (finanzia-api)
    participant DB as PostgreSQL (Prisma)

    Usuario->>Web: Introduce Email y Contraseña (Registro)
    Web->>API: POST /api/auth/register { email, password, firstName }
    API->>DB: Verifica si email existe
    API->>API: Genera Hash de contraseña con Argon2id
    API->>DB: Crea Usuario y asigna Categorías iniciales por defecto
    API->>Web: Set-Cookie: jwt_token (HttpOnly, Secure, SameSite=Strict) + User DTO
    Web->>Usuario: Redirige a pantalla de Onboarding: "Crea tu primera cuenta"
    
    Usuario->>Web: Introduce Cuenta ("N26", Tipo: CHECKING, Saldo: "1.250,50 €")
    Web->>Web: Convierte "1.250,50 €" a 125050 céntimos (Integer)
    Web->>API: POST /api/accounts { name: "N26", type: "CHECKING", initialBalanceCents: 125050 }
    API->>DB: Guarda Account con currentBalanceCents = 125050
    DB-->>API: Confirmación de cuenta creada
    API-->>Web: Cuenta creada correctamente
    Web->>Usuario: Muestra Dashboard principal con balance consolidado: 1.250,50 €
```

---

## Flujo 2: Registro Manual de Transacciones y Transferencias

### 2.1 Registro de Gasto / Ingreso
```mermaid
flowchart TD
    A[Usuario pulsa 'Nueva Transacción'] --> B[Selecciona Tipo: Gasto o Ingreso]
    B --> C[Introduce Importe en € ej. 45,90 €]
    C --> D[Introduce Fecha, Cuenta y Concepto ej. 'Compra semanal']
    D --> E{¿Asigna Categoría?}
    E -- Sí --> F[Selecciona Categoría ej. 'Alimentación']
    E -- No (Auto) --> G[Motor de Reglas Locales busca coincidencias]
    G --> H{¿Regla encontrada?}
    H -- Sí --> I[Asigna categoría automática ej. 'Supermercado']
    H -- No --> J[Llama a Gemini API para sugerencia semántica rápida]
    J --> K[Usuario valida o modifica la categoría sugerida]
    I --> L[Frontend convierte 45,90 € a 4590 céntimos]
    F --> L
    K --> L
    L --> M[POST /api/transactions]
    M --> N[Backend abre Transacción SQL prisma.$transaction]
    N --> O[Inserta fila TRANSACTION con amountCents = -4590]
    N --> P[Actualiza ACCOUNT restando 4590 a currentBalanceCents]
    O --> Q[Commit de la transacción]
    P --> Q
    Q --> R[Devuelve Transacción creada y Saldo actualizado]
    R --> S[UI actualiza saldo y gráfico de gastos en tiempo real]
```

### 2.2 Transferencia entre Cuentas Propias
```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Web as Next.js UI
    participant API as NestJS Backend
    participant DB as PostgreSQL

    Usuario->>Web: Selecciona "Transferencia": De Cuenta A a Cuenta B (Importe: 200,00 €)
    Web->>API: POST /api/transactions/transfer { fromAccountId, toAccountId, amountCents: 20000, date }
    API->>DB: Inicia prisma.$transaction
    API->>DB: Crea Transacción 1 (OUTFLOW en Cuenta A: -20000)
    API->>DB: Crea Transacción 2 (INFLOW en Cuenta B: +20000) con transferCounterpartId = Transacción 1
    API->>DB: Descuenta 20000 de Cuenta A y añade 20000 a Cuenta B
    DB-->>API: Commit satisfactorio
    API-->>Web: 200 OK { transferId, newBalances: { accountA, accountB } }
    Web->>Usuario: Muestra notificación de éxito y saldos actualizados
```

---

## Flujo 3: Asistente de Importación de Extracto Bancario (CSV)

```mermaid
flowchart TD
    A[Usuario sube archivo .csv en /imports] --> B[Frontend analiza delimitador: coma o punto y coma]
    B --> C[Frontend muestra primeras 5 filas en tabla de muestra]
    C --> D{¿Existe plantilla guardada para este banco?}
    D -- Sí --> E[Aplica mapeo automático de columnas preexistente]
    D -- No --> F[Usuario asocia selectores: Columna Fecha, Concepto e Importe]
    F --> G[Opción: 'Guardar plantilla para este banco' ej. 'BBVA']
    E --> H[Frontend procesa y normaliza todas las filas]
    G --> H
    H --> I[Genera Hash SHA-256 por fila: hash(fecha + importe + concepto)]
    I --> J[POST /api/imports/preview { rowsWithHashes }]
    J --> K[Backend consulta hashes existentes en la base de datos]
    K --> L[Backend marca filas: 'NUEVA' o 'DUPLICADA']
    L --> M[Frontend presenta pantalla de Confirmación con filas duplicadas desmarcadas por defecto]
    M --> N[Usuario revisa y pulsa 'Confirmar Importación']
    N --> O[POST /api/imports/commit { transactionsToInsert }]
    O --> P[Backend inserta en bloque y actualiza el saldo de la cuenta]
    P --> Q[Resumen: '48 transacciones importadas, 3 duplicados omitidos']
```

---

## Flujo 4: Gestión de Presupuestos y Metas de Ahorro

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Web as Next.js
    participant API as NestJS
    participant DB as PostgreSQL

    Note over Usuario,DB: Configuración y Seguimiento de Presupuesto Mensual
    Usuario->>Web: Define Presupuesto: Categoría "Restaurantes", Límite: 250,00 € (Mes 09/2026)
    Web->>API: POST /api/budgets { categoryId, amountLimitCents: 25000, month: 9, year: 2026 }
    API->>DB: Inserta o actualiza BUDGET
    API->>DB: Ejecuta agregación SUM(amountCents) de gastos de esa categoría en el mes
    DB-->>API: Total gastado = 18.500 céntimos (185,00 €)
    API-->>Web: 200 OK { budgetId, limitCents: 25000, spentCents: 18500, percentage: 74% }
    Web->>Usuario: Muestra barra de progreso en color Ámbar (74% consumido)
```

---

## Flujo 5: Asistente FinanZIA AI y Ejecución Determinista de Herramientas

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Web as Next.js Chat (/advisor)
    participant API as NestJS (AiAdvisorService)
    participant Gemini as Gemini API (Google Gen AI SDK)
    participant DB as PostgreSQL

    Usuario->>Web: Pregunta: "¿Cuánto he gastado en Ocio este mes y cómo voy de presupuesto?"
    Web->>API: POST /api/advisor/chat { conversationId, message }
    API->>Gemini: Inicia llamada con System Prompt + Historial + Declaración de Herramientas
    Note over Gemini: Gemini razona que necesita datos deterministas y emite Tool Calls
    Gemini-->>API: Tool Call: getCategoryExpenses(category="Ocio", month=9, year=2026)
    Gemini-->>API: Tool Call: getBudgetStatus(category="Ocio", month=9, year=2026)
    
    API->>DB: SELECT SUM(amountCents) WHERE category = 'Ocio' AND date in Sep 2026
    DB-->>API: Result: 14.200 céntimos (142,00 €)
    API->>DB: SELECT amountLimitCents FROM BUDGET WHERE category = 'Ocio'
    DB-->>API: Result: Límite = 15.000 céntimos (150,00 €)
    
    API->>Gemini: Devuelve resultados de herramientas (Tool Results en formato JSON)
    Note over Gemini: Gemini redacta respuesta fundamentada exclusivamente en 142 € y 150 €
    Gemini-->>API: Texto redactado: "En septiembre has gastado 142,00 € en Ocio sobre un límite de 150,00 € (94,6% consumido). Te quedan 8,00 € para terminar el mes."
    API-->>Web: Streaming del mensaje hacia la interfaz
    Web->>Usuario: Muestra la respuesta detallada con indicador de herramientas verificadas
```

---

## Flujo 6: Recomendaciones de IA y Aprobación Humana (Human-in-the-Loop)

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Web as Next.js UI
    participant API as NestJS Backend
    participant Gemini as Gemini API
    participant DB as PostgreSQL

    Note over API,Gemini: Durante el análisis proactivo de finanzas
    Gemini-->>API: Invocación de Tool: create_recommendation { type: "BUDGET_ADJUSTMENT", title: "Ajustar Ocio y Supermercado", details: "Has consumido el 95% de Ocio en los primeros 10 días...", proposedAction: { adjustBudget: { categoryId: "ocio-id", newLimitCents: 20000 } } }
    API->>DB: Guarda AI_RECOMMENDATION con status = "PROPOSED"
    
    Web->>API: GET /api/recommendations/pending
    API-->>Web: Lista de recomendaciones propuestas
    Web->>Usuario: Presenta Tarjeta Interactiva con la propuesta y botón: [Aprobar y Aplicar]
    
    alt Usuario Rechaza
        Usuario->>Web: Pulsa [Descartar]
        Web->>API: POST /api/recommendations/:id/reject
        API->>DB: Actualiza status = "REJECTED"
        Web->>Usuario: Oculta la sugerencia sin alterar ningún presupuesto
    else Usuario Aprueba
        Usuario->>Web: Pulsa [Aprobar y Aplicar]
        Web->>API: POST /api/recommendations/:id/apply
        API->>DB: Inicia transacción: Actualiza status = "ACCEPTED"
        API->>DB: Modifica amountLimitCents del presupuesto a 20000 céntimos
        DB-->>API: Commit completado
        API-->>Web: 200 OK { applied: true, updatedBudget }
        Web->>Usuario: Muestra mensaje de confirmación y actualiza la barra del presupuesto en directo
    end
```
