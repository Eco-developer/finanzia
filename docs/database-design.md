# FinanZIA — Diseño de Base de Datos y Modelo de Datos (PostgreSQL & Prisma)

| Metadata | Detalle |
| :--- | :--- |
| **Motor de Base de Datos** | PostgreSQL 16 (Local en Docker Compose) |
| **ORM / Migraciones** | Prisma ORM 5.x / 6.x |
| **Regla Monetaria Crítica** | **Enteros estrictos en céntimos** (`Int` o `BigInt`). Prohibición absoluta de tipos de punto flotante (`float`, `double`). |
| **Aislamiento Multi-usuario** | Clave foránea `userId` indexada en todas las tablas transaccionales. |

---

## 1. Esquema Prisma Completo (`schema.prisma`)

El siguiente archivo define la fuente de la verdad para la base de datos que se ubicará en `finanzia-api/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ---------------------------------------------------------
// ENUMS
// ---------------------------------------------------------

enum AccountType {
  CHECKING       // Cuenta corriente
  SAVINGS        // Cuenta de ahorro
  CREDIT_CARD    // Tarjeta de crédito
  CASH           // Efectivo
  INVESTMENT     // Cuenta de inversión
}

enum CategoryType {
  INCOME         // Categoría de ingresos
  EXPENSE        // Categoría de gastos
}

enum TransactionType {
  INCOME         // Entrada de dinero
  EXPENSE        // Salida de dinero
  TRANSFER       // Movimiento entre cuentas propias
}

enum RecommendationType {
  BUDGET_ADJUSTMENT // Ajuste sugerido en presupuesto
  SAVINGS_BOOST     // Aporte extraordinario a meta de ahorro
  EXPENSE_ALERT     // Alerta de gasto excesivo o suscripción recurrente
}

enum RecommendationStatus {
  PROPOSED       // Generada por la IA, esperando decisión del usuario
  ACCEPTED       // Aprobada y ejecutada por el usuario
  REJECTED       // Descartada por el usuario
  EXPIRED        // Expirada por cambio de periodo
}

enum AiRole {
  USER           // Mensaje del usuario
  ASSISTANT      // Respuesta del asistente
  TOOL           // Resultado de ejecución de herramienta backend
  SYSTEM         // Instrucción del sistema
}

// ---------------------------------------------------------
// MODELOS DE DOMINIO
// ---------------------------------------------------------

/// Usuario del sistema FinanZIA
model User {
  id              String         @id @default(uuid())
  email           String         @unique
  passwordHash    String
  firstName       String
  lastName        String?
  defaultCurrency String         @default("EUR")
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  accounts        Account[]
  categories      Category[]
  transactions    Transaction[]
  budgets         Budget[]
  savingsGoals    SavingsGoal[]
  csvTemplates    CsvTemplate[]
  aiConversations AiConversation[]
  recommendations AiRecommendation[]

  @@map("users")
}

/// Cuenta financiera (banco, efectivo, tarjeta)
model Account {
  id                  String         @id @default(uuid())
  userId              String
  name                String
  type                AccountType    @default(CHECKING)
  initialBalanceCents BigInt         @default(0)  // Saldo de apertura en céntimos
  currentBalanceCents BigInt         @default(0)  // Saldo actual consolidado en céntimos
  currency            String         @default("EUR")
  isArchived          Boolean        @default(false)
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  user                User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions        Transaction[]

  @@index([userId])
  @@map("accounts")
}

/// Categoría de clasificación jerárquica
model Category {
  id              String         @id @default(uuid())
  userId          String?        // Null = Categoría del sistema; No null = Personalizada por el usuario
  parentId        String?        // Subcategoría opcional
  name            String
  icon            String?        // Identificador de icono (ej. 'shopping-cart')
  colorHex        String?        // Código de color para gráficos (ej. '#10B981')
  type            CategoryType   @default(EXPENSE)
  isArchived      Boolean        @default(false)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  user            User?          @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent          Category?      @relation("SubCategories", fields: [parentId], references: [id], onDelete: SetNull)
  subCategories   Category[]     @relation("SubCategories")
  transactions    Transaction[]
  budgets         Budget[]

  @@index([userId])
  @@index([parentId])
  @@map("categories")
}

/// Registro monetario individual (Ingreso, Gasto o Transferencia)
model Transaction {
  id                    String           @id @default(uuid())
  userId                String
  accountId             String
  categoryId            String?
  amountCents           BigInt           // En céntimos: Positivo para ingresos, Negativo para gastos
  type                  TransactionType  @default(EXPENSE)
  transactionDate       DateTime         // Fecha de la operación bancaria
  description           String           // Concepto o beneficiario
  notes                 String?          // Notas adicionales del usuario
  isPending             Boolean          @default(false)
  
  // Contrapartida para transferencias entre cuentas
  transferCounterpartId String?          @unique
  transferCounterpart   Transaction?     @relation("TransferPair", fields: [transferCounterpartId], references: [id], onDelete: SetNull)
  transferReverse       Transaction?     @relation("TransferPair")

  // Hash unívoco para prevenir duplicados en importaciones CSV
  deduplicationHash     String?
  
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  user                  User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  account               Account          @relation(fields: [accountId], references: [id], onDelete: Cascade)
  category              Category?        @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  @@unique([userId, deduplicationHash])
  @@index([userId, transactionDate])
  @@index([userId, accountId])
  @@index([userId, categoryId])
  @@map("transactions")
}

/// Límite de gasto mensual fijado para una categoría
model Budget {
  id                   String         @id @default(uuid())
  userId               String
  categoryId           String
  amountLimitCents     BigInt         // Límite mensual en céntimos
  periodMonth          Int            // 1 a 12
  periodYear           Int            // Año ej. 2026
  alertThresholdPct    Int            @default(80) // Porcentaje de consumo para disparar alerta
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt

  user                 User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  category             Category       @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([userId, categoryId, periodMonth, periodYear])
  @@index([userId, periodYear, periodMonth])
  @@map("budgets")
}

/// Meta u objetivo de ahorro programado
model SavingsGoal {
  id                  String         @id @default(uuid())
  userId              String
  name                String         // ej. "Fondo de Emergencia", "Vacaciones"
  targetAmountCents   BigInt         // Monto objetivo en céntimos
  currentAmountCents  BigInt         @default(0) // Monto acumulado en céntimos
  targetDate          DateTime?      // Fecha límite estimada
  isCompleted         Boolean        @default(false)
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  user                User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("savings_goals")
}

/// Plantilla de mapeo de columnas guardada para un banco específico
model CsvTemplate {
  id            String         @id @default(uuid())
  userId        String
  bankName      String         // ej. "BBVA", "Santander", "Revolut"
  columnMapping Json           // { "dateCol": "Fecha", "descCol": "Concepto", "amountCol": "Importe", "delimiter": ";", "dateFormat": "DD/MM/YYYY" }
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, bankName])
  @@map("csv_templates")
}

/// Sesión de conversación con el Asistente FinanZIA AI
model AiConversation {
  id            String         @id @default(uuid())
  userId        String
  title         String         @default("Nueva conversación")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages      AiMessage[]

  @@index([userId])
  @@map("ai_conversations")
}

/// Mensaje en el historial de conversación del asistente
model AiMessage {
  id              String         @id @default(uuid())
  conversationId  String
  role            AiRole         @default(USER)
  content         String         @db.Text
  toolCalls       Json?          // Lista de llamadas a herramientas emitidas por Gemini
  toolResults     Json?          // Resultados deterministas devueltos por el backend
  createdAt       DateTime       @default(now())

  conversation    AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@map("ai_messages")
}

/// Propuesta o recomendación de la IA sujeta a aprobación humana
model AiRecommendation {
  id              String                @id @default(uuid())
  userId          String
  type            RecommendationType
  title           String
  details         String                @db.Text
  proposedAction  Json                  // Payload estructurado ejecutable (ej. { action: "ADJUST_BUDGET", categoryId: "...", newAmountCents: 20000 })
  status          RecommendationStatus  @default(PROPOSED)
  reviewedAt      DateTime?
  createdAt       DateTime              @default(now())

  user            User                  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@map("ai_recommendations")
}
```

---

## 2. Categorías Iniciales del Sistema (Seeder de Inicio)

Al inicializar la base de datos (`prisma db seed`), se insertarán las siguientes categorías por defecto accesibles para todos los usuarios:

| Tipo | Categoría Padre | Subcategorías Incluidas | Color Hex | Icono Sugerido |
| :--- | :--- | :--- | :--- | :--- |
| **EXPENSE** | Vivienda | Alquiler/Hipoteca, Suministros (Luz, Agua, Gas, Internet) | `#3B82F6` | `home` |
| **EXPENSE** | Alimentación | Supermercado, Restaurantes, Cafeterías | `#10B981` | `shopping-cart` |
| **EXPENSE** | Transporte | Gasolina, Transporte Público, Mantenimiento vehículo | `#F59E0B` | `truck` |
| **EXPENSE** | Ocio y Estilo de Vida | Cine/Eventos, Suscripciones (Netflix, Spotify), Viajes | `#8B5CF6` | `film` |
| **EXPENSE** | Salud y Bienestar | Farmacia, Médicos, Deporte/Gimnasio | `#EC4899` | `heart` |
| **EXPENSE** | Finanzas | Comisiones bancarias, Impuestos | `#6B7280` | `credit-card` |
| **INCOME** | Trabajo Principal | Nómina / Salario | `#059669` | `briefcase` |
| **INCOME** | Ingresos Secundarios | Freelance, Ventas de segunda mano | `#14B8A6` | `trending-up` |
| **INCOME** | Rendimientos | Dividendos, Intereses de cuentas | `#6366F1` | `dollar-sign` |
