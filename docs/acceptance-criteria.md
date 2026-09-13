# FinanZIA — Criterios de Aceptación y Protocolo de Calidad (QA)

| Metadata | Detalle |
| :--- | :--- |
| **Rol Responsable** | Agente de QA (Quality Assurance Lead) |
| **Objetivo** | Verificación objetiva, cuantitativa y reproducible del sistema FinanZIA |
| **Criterio de Aprobación** | Evidencia empírica obligatoria. Queda prohibido declarar una tarea aprobada sin adjuntar logs, capturas o salidas de test verificables. |

---

## 1. Criterios de Bloqueo Inmediato (Stop-the-Line)

El Agente de QA **bloqueará inmediatamente** cualquier entrega o Pull Request si se produce cualquiera de las siguientes condiciones críticas:

1. **Error de Precisión Monetaria**: Cualquier operación contable que presente discrepancias de redondeo o utilice tipos `float`/`double`.
2. **Fuga de Aislamiento de Usuario**: Posibilidad de que un usuario autenticado acceda, modifique o borre registros de otro usuario.
3. **Alucinación de Cifras en la IA**: Respuestas del Asistente FinanZIA AI que afirmen saldos o gastos no respaldados al 100% por los resultados de las herramientas backend ejecutadas.
4. **Modificación de Datos sin Aprobación Humana**: Aplicación de recomendaciones de la IA sin la acción explícita `POST /api/recommendations/:id/apply` por parte del usuario.
5. **Secreto Expuesto**: Presencia de claves privadas, tokens o credenciales en el código fuente, repositorios Git, bundles del cliente web o logs.
6. **Fallo en Pipeline de CI**: Cualquier test roto, error de linting o incompatibilidad de TypeScript reportada en el pipeline.

---

## 2. Criterios de Aceptación por Módulo Funcional

### 2.1 Módulo 1: Autenticación y Gestión de Cuentas
- [ ] **CA-01.1**: El registro exige contraseñas con un mínimo de 8 caracteres, al menos una mayúscula, un número y un símbolo especial.
- [ ] **CA-01.2**: El token JWT viaja exclusivamente en cookie `HttpOnly`, con `Secure` habilitado y `SameSite=Strict`.
- [ ] **CA-01.3**: El saldo inicial de una cuenta se almacena como entero en céntimos y no admite valores `NaN` o cadenas de texto no numéricas.
- [ ] **CA-01.4**: La consulta `GET /api/accounts` solo devuelve las cuentas pertenecientes al usuario autenticado.

### 2.2 Módulo 2: Registro de Transacciones y Transferencias
- [ ] **CA-02.1**: La inserción de una transacción de gasto decrementa de manera atómica el `currentBalanceCents` de la cuenta asociada dentro de una transacción SQL (`prisma.$transaction`).
- [ ] **CA-02.2**: El registro de una transferencia genera dos transacciones enlazadas (`INCOME` y `EXPENSE`) asociadas por el `transferCounterpartId`, actualizando ambos saldos en la misma transacción atómica.
- [ ] **CA-02.3**: Si la transacción SQL falla por cualquier motivo, ambos saldos permanecen intactos sin estado intermedio inconsistente.
- [ ] **CA-02.4**: El componente visual `<MoneyDisplay />` en el frontend formatea correctamente cantidades positivas (verde) y negativas (rojo) conforme al estándar `es-ES` (ej. `-1.250,50 €`).

### 2.3 Módulo 3: Asistente de Importación de Extractos CSV
- [ ] **CA-03.1**: El parser identifica correctamente archivos CSV delimitados tanto por comas (`,`) como por punto y coma (`;`).
- [ ] **CA-03.2**: La pantalla de mapeo de columnas permite asignar dinámicamente qué columna corresponde a Fecha, Concepto e Importe, mostrando una vista previa inmediata.
- [ ] **CA-03.3**: El sistema calcula el hash SHA-256 para cada fila y detecta con 100% de precisión las transacciones ya presentes en la base de datos para esa cuenta.
- [ ] **CA-03.4**: Las filas duplicadas aparecen desmarcadas de forma predeterminada en la tabla de confirmación antes de la inserción.
- [ ] **CA-03.5**: Cualquier intento de inyección de fórmulas CSV (`=cmd|`, `@SUM`, etc.) queda neutralizado anteponiendo un apóstrofe de texto plano.

### 2.4 Módulo 4: Presupuestos y Objetivos de Ahorro
- [ ] **CA-04.1**: La consulta `GET /api/budgets/pacing` calcula en tiempo real la suma exacta de gastos para cada categoría en el mes seleccionado.
- [ ] **CA-04.2**: El frontend muestra los estados de progreso de presupuesto con la siguiente convención de colores:
  - **Verde**: Consumo < 70%.
  - **Ámbar / Naranja**: Consumo entre 70% y 90%.
  - **Rojo**: Consumo > 90% o superado (> 100%).
- [ ] **CA-04.3**: La creación de aportaciones a metas de ahorro actualiza el `currentAmountCents` y calcula el porcentaje de avance restante hacia la fecha meta.

### 2.5 Módulo 5: Asistente FinanZIA AI y Recomendaciones
- [ ] **CA-05.1**: Cuando el usuario formula una pregunta que involucra cifras ("¿Cuánto gasté en X?"), el asistente invoca obligatoriamente una herramienta backend (`get_expenses_by_category` o `get_financial_summary`).
- [ ] **CA-05.2**: Cada número monetario incluido en el texto de respuesta del asistente coincide exactamente con el valor devuelto por la herramienta backend.
- [ ] **CA-05.3**: Las propuestas generadas por la IA se almacenan con el estado `PROPOSED` y aparecen en la interfaz como tarjetas interactivas con botones explícitos `[Aprobar y Aplicar]` y `[Descartar]`.
- [ ] **CA-05.4**: Ninguna tabla o fila de la base de datos es modificada antes de que el usuario pulse en `[Aprobar y Aplicar]`.
- [ ] **CA-05.5**: El frontend muestra el streaming de texto con latencia de primer token inferior a 1,5 segundos en entorno local.

---

## 3. Matriz de Pruebas Automatizadas Exigidas

| Nivel | Herramienta | Ámbito | Cobertura Mínima |
| :--- | :--- | :--- | :--- |
| **Unitarias Backend** | **Jest** | Entidades de dominio, Value Objects (`Money`), Casos de uso | ≥ 85% de ramas |
| **Integración Backend** | **Supertest** | Endpoints REST, validación DTO, transacciones Prisma con DB de test | ≥ 80% de endpoints |
| **Unitarias Frontend** | **React Testing Library** | Componentes UI (`src/presentation/components`), renderizado de saldo | ≥ 80% de componentes |
| **Hooks Frontend** | **React Hook Testing** | Custom hooks de estado (`useTransactions`, `useCsvMapper`) | 100% de hooks clave |
| **End-to-End (E2E)** | **Playwright** | Flujo completo: Registro -> Crear Cuenta -> Subir CSV -> Consultar IA | 100% de flujos críticos |
| **Catálogo Visual** | **Storybook** | Todos los componentes atómicos y estados visuales (Loading, Error, Vacío) | 100% historias UI |

---

## 4. Plantilla de Informe de Evidencias de QA

Cada informe de validación entregado por el Agente de QA deberá ajustarse a la siguiente estructura:

```markdown
### Informe de Validación de QA — Tarea / Épica [ID]
- **Fecha de Ejecución**: AAAA-MM-DD
- **Resultado Global**: [APROBADO / RECHAZADO]
- **Evidencias Automatizadas**:
  - Salida de tests unitarios: [Adjuntar resumen de cobertura]
  - Salida de tests de integración: [Adjuntar salida de Supertest]
  - Salida de tests E2E: [Adjuntar reporte de Playwright]
- **Comprobaciones de Seguridad y Casos Límite**:
  - Precisión de céntimos: [Verificada]
  - Aislamiento multi-usuario: [Verificado con intento de cruce de ID]
  - Verificación anti-alucinaciones en IA: [Verificada con dataset de control]
- **Defectos Detectados**: [Detallar con pasos de reproducción si existen]
- **Recomendación**: [Pase a producción / Corrección por parte del Developer]
```
