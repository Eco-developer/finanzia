# FinanZIA — Contratos de API REST (OpenAPI / Swagger)

| Metadata | Detalle |
| :--- | :--- |
| **Protocolo** | RESTful sobre HTTP/HTTPS |
| **Formato de Carga Útil** | JSON (`application/json`) |
| **Documentación Interactiva** | Swagger UI disponible en `/api/docs` (OpenAPI 3.0) |
| **Autenticación** | Cookie `jwt_token` (`HttpOnly`, `Secure`, `SameSite=Strict`) o cabecera `Authorization: Bearer <token>` |
| **Manejo de Moneda** | Todos los importes viajan estrictamente como enteros en céntimos (ej. 15,50 € = `1550`) |

---

## 1. Estructura Estándar de Respuestas y Errores

### 1.1 Respuesta Exitosa Estándar
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-09-13T10:00:00.000Z"
  }
}
```

### 1.2 Respuesta Paginada
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalRecords": 142,
    "totalPages": 8
  }
}
```

### 1.3 Respuesta de Error Unificada (`ApiErrorResponse`)
```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "INVALID_TRANSACTION_AMOUNT",
  "message": "El importe de la transacción debe ser un número entero en céntimos diferente de cero",
  "errors": [
    {
      "field": "amountCents",
      "issue": "amountCents must not be equal to 0"
    }
  ],
  "timestamp": "2026-09-13T10:00:00.000Z",
  "path": "/api/transactions"
}
```

---

## 2. Catálogo de Endpoints del MVP

### 2.1 Módulo de Autenticación (`/api/auth`)

#### `POST /api/auth/register`
- **Descripción**: Registra un nuevo usuario en la plataforma y genera sus categorías base.
- **Request Body**:
  ```json
  {
    "email": "usuario@ejemplo.com",
    "password": "Password123!",
    "firstName": "Miguel",
    "lastName": "García",
    "defaultCurrency": "EUR"
  }
  ```
- **Responses**:
  - `201 Created`: Establece la cookie `jwt_token` y devuelve `{ "id": "...", "email": "...", "firstName": "..." }`.
  - `409 Conflict`: Si el email ya se encuentra registrado.

#### `POST /api/auth/login`
- **Descripción**: Valida credenciales y emite cookie de sesión.
- **Request Body**:
  ```json
  {
    "email": "usuario@ejemplo.com",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `200 OK`: Cookie `jwt_token` establecida.
  - `401 Unauthorized`: Credenciales inválidas.

#### `POST /api/auth/logout`
- **Descripción**: Limpia la cookie de autenticación.
- **Responses**: `200 OK`.

#### `GET /api/auth/me`
- **Descripción**: Devuelve el perfil del usuario autenticado.
- **Responses**: `200 OK` con datos del usuario.

---

### 2.2 Módulo de Cuentas (`/api/accounts`)

#### `GET /api/accounts`
- **Descripción**: Lista todas las cuentas activas del usuario con sus saldos actuales.
- **Responses**:
  - `200 OK`:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "acc-uuid-1",
        "name": "Cuenta Principal BBVA",
        "type": "CHECKING",
        "currentBalanceCents": 245050,
        "currency": "EUR",
        "isArchived": false
      }
    ]
  }
  ```

#### `POST /api/accounts`
- **Descripción**: Crea una nueva cuenta financiera con saldo inicial en céntimos.
- **Request Body**:
  ```json
  {
    "name": "Cuenta Ahorro N26",
    "type": "SAVINGS",
    "initialBalanceCents": 100000,
    "currency": "EUR"
  }
  ```
- **Responses**: `201 Created`.

---

### 2.3 Módulo de Transacciones (`/api/transactions`)

#### `GET /api/transactions`
- **Query Params**: `page=1`, `limit=20`, `accountId`, `categoryId`, `startDate`, `endDate`, `type`.
- **Responses**: `200 OK` (Paginada).

#### `POST /api/transactions`
- **Descripción**: Crea una transacción manual y actualiza atómicamente el saldo de la cuenta.
- **Request Body**:
  ```json
  {
    "accountId": "acc-uuid-1",
    "categoryId": "cat-uuid-supermercado",
    "amountCents": -4590,
    "type": "EXPENSE",
    "transactionDate": "2026-09-13T12:00:00Z",
    "description": "Compra semanal en Mercadona",
    "notes": "Incluye artículos de limpieza"
  }
  ```
- **Responses**: `201 Created` con la transacción y nuevo saldo de la cuenta.

#### `POST /api/transactions/transfer`
- **Descripción**: Realiza un traspaso entre dos cuentas del usuario.
- **Request Body**:
  ```json
  {
    "fromAccountId": "acc-uuid-1",
    "toAccountId": "acc-uuid-2",
    "amountCents": 15000,
    "transactionDate": "2026-09-13T12:00:00Z",
    "description": "Traspaso a cuenta de ahorro"
  }
  ```
- **Responses**: `201 Created` con los identificadores de ambas transacciones creadas y saldos actualizados.

---

### 2.4 Módulo de Importación CSV (`/api/imports`)

#### `POST /api/imports/preview`
- **Descripción**: Recibe una lista de filas procesadas con su hash unívoco para verificar duplicados antes de insertar.
- **Request Body**:
  ```json
  {
    "accountId": "acc-uuid-1",
    "rows": [
      {
        "rowId": "row-1",
        "date": "2026-09-10T00:00:00Z",
        "description": "RESTAURANTE EL BODEGON",
        "amountCents": -3250,
        "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      }
    ]
  }
  ```
- **Responses**:
  - `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "totalRows": 1,
      "newCount": 1,
      "duplicateCount": 0,
      "preview": [
        {
          "rowId": "row-1",
          "isDuplicate": false,
          "suggestedCategoryId": "cat-uuid-restaurantes"
        }
      ]
    }
  }
  ```

#### `POST /api/imports/commit`
- **Descripción**: Inserta en bloque las transacciones aprobadas por el usuario y recalcula el saldo.
- **Responses**: `201 Created` con el resumen de la inserción.

---

### 2.5 Módulo de Presupuestos y Metas (`/api/budgets` y `/api/goals`)

#### `GET /api/budgets/pacing`
- **Query Params**: `month=9`, `year=2026`.
- **Descripción**: Devuelve la ejecución de cada presupuesto comparando el gasto real acumulado contra el límite.
- **Responses**:
  - `200 OK`:
  ```json
  {
    "success": true,
    "data": [
      {
        "budgetId": "bgt-1",
        "categoryId": "cat-uuid-ocio",
        "categoryName": "Ocio",
        "amountLimitCents": 20000,
        "spentCents": 16500,
        "remainingCents": 3500,
        "percentageUsed": 82.5,
        "status": "WARNING"
      }
    ]
  }
  ```

---

### 2.6 Módulo de Asistente de IA y Recomendaciones (`/api/advisor`)

#### `POST /api/advisor/chat`
- **Descripción**: Envía un mensaje al asesor financiero con streaming de eventos (SSE).
- **Request Body**:
  ```json
  {
    "conversationId": "conv-uuid-1",
    "message": "¿Cuánto he gastado este mes en restaurantes y cuánto me queda de presupuesto?"
  }
  ```
- **Responses**:
  - `200 OK` (Stream: `text/event-stream`): Eventos de progreso de herramientas invocadas y chunks de texto de la respuesta final.

#### `GET /api/recommendations/pending`
- **Descripción**: Lista las recomendaciones activas generadas por la IA pendientes de aprobación humana.
- **Responses**:
  - `200 OK`:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "rec-uuid-1",
        "type": "BUDGET_ADJUSTMENT",
        "title": "Optimización del presupuesto de Ocio",
        "details": "Has alcanzado el 82,5% de Ocio a mitad de mes. Te proponemos aumentar el límite en 30 € compensándolo con un ahorro en Suministros.",
        "proposedAction": {
          "actionType": "UPDATE_BUDGET_LIMIT",
          "budgetId": "bgt-1",
          "newLimitCents": 23000
        },
        "status": "PROPOSED"
      }
    ]
  }
  ```

#### `POST /api/recommendations/:id/apply`
- **Descripción**: Ejecuta de forma atómica la acción propuesta por la IA tras el clic explícito del usuario.
- **Responses**: `200 OK` con `{ "applied": true, "updatedEntity": { ... } }`.

#### `POST /api/recommendations/:id/reject`
- **Descripción**: Descarta la recomendación sin aplicar ninguna alteración de datos.
- **Responses**: `200 OK` con `{ "rejected": true }`.
