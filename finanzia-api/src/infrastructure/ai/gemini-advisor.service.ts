import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI, Type } from "@google/genai";
import { AiToolsService } from "../../core/application/ai/ai-tools.service";
import { FinancialProfileService } from "../../core/application/ai/financial-profile.service";
import { RecommendationsService } from "../../core/application/recommendations/recommendations.service";
import { ToolCallExecution } from "../../core/application/ai/dtos/chat.dto";
import {
  IAiAdvisorPort,
  AdvisorExecutionResult,
} from "../../core/application/ports/ai-advisor.port";

@Injectable()
export class GeminiAdvisorService implements IAiAdvisorPort {
  private readonly logger = new Logger(GeminiAdvisorService.name);
  private readonly aiClient: GoogleGenAI | null = null;
  private readonly apiKey: string | undefined;

  private readonly baseSystemInstruction = `Eres FinanZIA Advisor, el asistente inteligente de finanzas personales de la plataforma FinanZIA.

TUS PRINCIPIOS INNEGOCIABLES SON:
1. NUNCA inventes cifras, saldos, importes, transacciones ni fechas. Si necesitas conocer cualquier dato del usuario para responder, DEBES invocar la herramienta correspondiente antes de emitir tu respuesta.
2. Si una herramienta devuelve 0 resultados o no hay transacciones para un periodo, infórmalo con total claridad. No asumas gastos no registrados.
3. Todos los importes en las herramientas se expresan en CÉNTIMOS ENTEROS (ejemplo: 1250 céntimos = 12,50 €). Siempre debes formatear las cifras para el usuario en euros legibles con dos decimales (ejemplo: 12,50 €) utilizando coma como separador decimal.
4. SUPERVISIÓN HUMANA OBLIGATORIA (Human-in-the-Loop): NUNCA edites ni elimines transacciones/movimientos, presupuestos ni metas de ahorro de forma directa o unilateral. Ante peticiones de editar o eliminar cualquier movimiento, presupuesto o meta, DEBES invocar OBLIGATORIAMENTE 'propose_recommendation' con el tipo y actionPayload correspondiente para que el usuario pueda aprobar o rechazar la acción. La creación directa de nuevos gastos/ingresos ('create_transaction') y nuevos presupuestos ('create_budget') está permitida solo al crearlos inicialmente si el usuario lo pide expresamente.
5. DIFERENCIACIÓN FINANCIERA ESTRICTA: Diferencia siempre entre gastos fijos esenciales (vivienda, suministros, salud, impuestos) y gastos variables o discrecionales (restaurantes, ocio, compras). Cuando propongas recortes, hazlo ÚNICAMENTE sobre gastos variables, jamás sobre obligaciones fijas.
6. TONO Y EMPATÍA: Sé siempre empático, motivador, no juzgón y constructivo. Las finanzas pueden generar estrés; nunca digas "has gastado demasiado" o "tu control es malo", sino "veo una oportunidad de ahorro aquí" o "podemos ajustar este apartado".
7. CUMPLIMIENTO REGULATORIO: NO eres un asesor financiero regulado bajo MiFID II ni CNMV. No recomiendes productos de inversión específicos ni prometas rentabilidades garantizadas. Incluye siempre una actitud prudente de educación financiera.
8. GESTIÓN Y AMORTIZACIÓN DE DEUDAS (Cero Flotantes e Inmutabilidad):
- Para consultar pasivos o préstamos, invoca 'get_debts'.
- Para registrar un nuevo préstamo o deuda, invoca 'create_debt'.
- Para amortizar capital (parcial o total), invoca 'amortize_debt'. Si el usuario indica pagar desde una cuenta bancaria (ej. "desde Cuenta Nómina"), especifica 'fromAccountName'.
- Si la deuda se liquida al 100%, felicita calurosamente al usuario informándole de que la deuda queda sellada y archivada de forma inmutable en su historial.
- Para proyecciones y comparación de métodos (Avalancha vs Bola de nieve), invoca 'simulate_debt_payoff'.
- Para analizar recortes en gastos prescindibles orientados a amortizar antes, invoca 'analyze_debt_optimization'.`;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiToolsService: AiToolsService,
    @Inject(forwardRef(() => FinancialProfileService))
    private readonly financialProfileService: FinancialProfileService,
    @Inject(forwardRef(() => RecommendationsService))
    private readonly recommendationsService: RecommendationsService,
  ) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (this.apiKey && this.apiKey.trim().length > 0) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: this.apiKey.trim() });
        this.logger.log(
          "Cliente Google Gen AI inicializado con GEMINI_API_KEY.",
        );
      } catch (error) {
        this.logger.warn(
          "Error al inicializar GoogleGenAI, se usará el motor ReAct local.",
          error,
        );
        this.aiClient = null;
      }
    } else {
      this.logger.log(
        "GEMINI_API_KEY no configurada. Activando Motor ReAct Local Determinista (Offline Ready).",
      );
    }
  }

  /**
   * Ejecuta una consulta conversacional a través de Gemini API con Tool Calling
   * o mediante el motor local determinista si la API no está configurada o falla.
   */
  async executeChat(
    userId: string,
    message: string,
    history: Array<{ role: string; content: string }> = [],
  ): Promise<AdvisorExecutionResult> {
    if (this.aiClient) {
      try {
        return await this.executeGeminiWithTools(userId, message, history);
      } catch (error: any) {
        this.logger.warn(
          `Error en llamada a Gemini API (${error?.message || error}). Activando fallback local determinista.`,
        );
        return await this.executeLocalFallback(userId, message, history);
      }
    }

    return await this.executeLocalFallback(userId, message, history);
  }

  /**
   * Ejecución oficial mediante SDK @google/genai con Function Calling
   */
  private async executeGeminiWithTools(
    userId: string,
    userMessage: string,
    history: Array<{ role: string; content: string }> = [],
  ): Promise<AdvisorExecutionResult> {
    const executedTools: ToolCallExecution[] = [];

    const toolsConfig = [
      {
        functionDeclarations: [
          {
            name: "get_financial_summary",
            description:
              "Obtiene el total de ingresos, gastos, ahorro neto y ratio de ahorro para un mes y año concretos.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                month: {
                  type: Type.INTEGER,
                  description: "Mes del año (1 a 12)",
                },
                year: {
                  type: Type.INTEGER,
                  description: "Año de cuatro dígitos (ej. 2026)",
                },
              },
              required: ["month", "year"],
            },
          },
          {
            name: "get_expenses_by_category",
            description:
              "Desglose agrupado de gastos por categoría en un rango de fechas.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                startDate: {
                  type: Type.STRING,
                  description: "Fecha inicial YYYY-MM-DD",
                },
                endDate: {
                  type: Type.STRING,
                  description: "Fecha final YYYY-MM-DD",
                },
                categoryId: {
                  type: Type.STRING,
                  description: "Opcional: ID de una categoría específica",
                },
              },
              required: ["startDate", "endDate"],
            },
          },
          {
            name: "get_budget_status",
            description:
              "Consulta el estado de ejecución y alertas de presupuestos del usuario para un mes y año.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                month: { type: Type.INTEGER, description: "Mes (1 a 12)" },
                year: { type: Type.INTEGER, description: "Año (ej. 2026)" },
              },
              required: ["month", "year"],
            },
          },
          {
            name: "get_account_balances",
            description:
              "Consulta los saldos actuales consolidados y el desglose de todas las cuentas bancarias o de ahorro activas del usuario.",
            parameters: {
              type: Type.OBJECT,
              properties: {},
            },
          },
          {
            name: "get_savings_goals",
            description:
              "Consulta todas las metas de ahorro activas del usuario, sus importes actuales, objetivos y porcentaje de progreso.",
            parameters: {
              type: Type.OBJECT,
              properties: {},
            },
          },
          {
            name: "calculate_savings_plan",
            description:
              "Planificación multi-paso determinista: descompone un objetivo de ahorro, calcula la cuota mensual requerida, evalúa el ahorro real de los últimos 3 meses y propone recortes en gastos variables si hay déficit.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                targetAmountCents: {
                  type: Type.INTEGER,
                  description:
                    "Importe objetivo a ahorrar en céntimos (ej. 500000 para 5.000 €)",
                },
                months: {
                  type: Type.INTEGER,
                  description:
                    "Plazo en meses para alcanzar el objetivo (ej. 8)",
                },
                goalName: {
                  type: Type.STRING,
                  description:
                    "Nombre descriptivo de la meta (ej. Vacaciones, Fondo de Emergencia)",
                },
              },
              required: ["targetAmountCents", "months"],
            },
          },
          {
            name: "categorize_transaction",
            description:
              "Clasifica un concepto de gasto o ingreso utilizando el sistema de reglas aprendidas del usuario y diccionario inteligente.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                description: {
                  type: Type.STRING,
                  description:
                    "Concepto o comercio bancario (ej. 'COMPRA MERCADONA SANT CUGAT', 'SPOTIFY')",
                },
              },
              required: ["description"],
            },
          },
          {
            name: "get_proactive_insights",
            description:
              "Detecta alertas proactivas: incrementos inusuales de gasto (+30% en categorías vs histórico) o metas cercanas al 100% de cumplimiento.",
            parameters: {
              type: Type.OBJECT,
              properties: {},
            },
          },
          {
            name: "propose_recommendation",
            description:
              "Registra una propuesta formal de ajuste presupuestario o meta sujeta a aprobación humana obligatoria.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description:
                    "Tipo: BUDGET_ADJUSTMENT, SAVINGS_BOOST, EXPENSE_ALERT o GOAL_CREATION",
                },
                title: {
                  type: Type.STRING,
                  description: "Título claro y conciso",
                },
                details: {
                  type: Type.STRING,
                  description: "Explicación detallada y beneficio cuantitativo",
                },
                actionPayload: {
                  type: Type.OBJECT,
                  description:
                    "Datos estructurados de la acción a ejecutar tras la aprobación del usuario",
                },
              },
              required: ["type", "title", "details", "actionPayload"],
            },
          },
          {
            name: "create_budget",
            description:
              "Crea o actualiza un presupuesto mensual asignando un límite de gasto en euros para una categoría concreta a partir de cualquier formato o lenguaje natural del usuario.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                categoryName: {
                  type: Type.STRING,
                  description:
                    "Nombre o descripción de la categoría (ej. 'Alimentación', 'Supermercado', 'Ocio y Estilo de Vida', 'Restaurantes y Bares', 'Transporte'). Si el usuario indica explícitamente 'categoria: alimentacion', pasa 'Alimentación'.",
                },
                amountLimitEur: {
                  type: Type.NUMBER,
                  description:
                    "Límite máximo de gasto mensual en euros (ej. 200, 300, 150.50). Si se indica '200/mes' o 'limite mensual: 200', es 200.",
                },
                month: {
                  type: Type.INTEGER,
                  description:
                    "Mes opcional (1 a 12). Por ejemplo si se dice 'septiembre', pasa 9. Si se omite, se usa el mes actual.",
                },
                year: {
                  type: Type.INTEGER,
                  description:
                    "Año opcional de cuatro dígitos (ej. 2026). Si se omite, se usa el año actual.",
                },
                alertThresholdPct: {
                  type: Type.INTEGER,
                  description:
                    "Porcentaje de alerta temprana de 1 a 100 (ej. 90 para '90%'). Por defecto 80.",
                },
              },
              required: ["categoryName", "amountLimitEur"],
            },
          },
          {
            name: "create_transaction",
            description:
              "Registra un nuevo gasto o ingreso en las cuentas bancarias del usuario cuando este lo pida explícitamente.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description:
                    "Tipo de transacción: 'EXPENSE' para gastos, 'INCOME' para ingresos",
                },
                amountEur: {
                  type: Type.NUMBER,
                  description: "Importe positivo en euros (ej. 45.50)",
                },
                description: {
                  type: Type.STRING,
                  description:
                    "Concepto, comercio o motivo de la transacción (ej. 'Gasolina Repsol', 'Mercadona', 'Nómina')",
                },
                accountName: {
                  type: Type.STRING,
                  description:
                    "Nombre opcional de la cuenta bancaria. Si se omite, se usa la cuenta principal.",
                },
                categoryName: {
                  type: Type.STRING,
                  description:
                    "Nombre opcional de la categoría. Si se omite, el sistema la predecirá automáticamente.",
                },
                date: {
                  type: Type.STRING,
                  description:
                    "Fecha opcional YYYY-MM-DD. Si se omite, se usa hoy.",
                },
              },
              required: ["type", "amountEur", "description"],
            },
          },
          {
            name: "create_debt",
            description:
              "Registra una nueva deuda o pasivo financiero del usuario (préstamo, tarjeta de crédito, hipoteca, etc.).",
            parameters: {
              type: Type.OBJECT,
              properties: {
                concept: {
                  type: Type.STRING,
                  description:
                    "Concepto o nombre de la deuda (ej. 'Préstamo Coche', 'Tarjeta Revolving BBVA')",
                },
                amountEur: {
                  type: Type.NUMBER,
                  description:
                    "Importe original o saldo pendiente en euros (ej. 4500)",
                },
                interestRatePercent: {
                  type: Type.NUMBER,
                  description:
                    "Tasa de interés en porcentaje (ej. 6.5 para 6.50%)",
                },
                interestRateType: {
                  type: Type.STRING,
                  description:
                    "Tipo de tasa: 'ANNUAL' (anual, por defecto) o 'MONTHLY' (mensual)",
                },
                creditor: {
                  type: Type.STRING,
                  description:
                    "Entidad o acreedor (ej. 'Banco Santander', 'Cofidis')",
                },
                minimumMonthlyPaymentEur: {
                  type: Type.NUMBER,
                  description:
                    "Cuota mensual mínima o pactada en euros (ej. 150)",
                },
                dueDate: {
                  type: Type.STRING,
                  description:
                    "Fecha de vencimiento final YYYY-MM-DD si aplica",
                },
                notes: {
                  type: Type.STRING,
                  description: "Notas u observaciones adicionales",
                },
              },
              required: ["concept", "amountEur", "interestRatePercent"],
            },
          },
          {
            name: "get_debts",
            description:
              "Consulta todas las deudas activas del usuario, sus saldos vivos, tasas de interés, cuotas mensuales e impacto en intereses, o el historial inmutable de deudas liquidadas al 100%.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                includePaidOff: {
                  type: Type.BOOLEAN,
                  description:
                    "Si es true, incluye el historial inmutable de deudas ya pagadas al 100%. Por defecto false.",
                },
              },
            },
          },
          {
            name: "amortize_debt",
            description:
              "Aplica un abono o amortización a una deuda activa. Desglosa automáticamente capital e intereses, y si llega al 100% de liquidación, la deuda queda sellada de forma inmutable.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                debtId: {
                  type: Type.STRING,
                  description:
                    "UUID de la deuda (opcional si se provee conceptKeyword)",
                },
                conceptKeyword: {
                  type: Type.STRING,
                  description:
                    "Nombre o palabra clave de la deuda (ej. 'coche', 'tarjeta', 'hipoteca')",
                },
                amountEur: {
                  type: Type.NUMBER,
                  description: "Importe a amortizar en euros (ej. 250)",
                },
                fromAccountName: {
                  type: Type.STRING,
                  description:
                    "Nombre de la cuenta bancaria de origen de los fondos (ej. 'Cuenta Nómina')",
                },
                notes: {
                  type: Type.STRING,
                  description: "Notas de la amortización",
                },
              },
              required: ["amountEur"],
            },
          },
          {
            name: "simulate_debt_payoff",
            description:
              "Simula un plan de aceleración de pagos mediante estrategia AVALANCHA (mayor interés primero) o BOLA DE NIEVE (menor saldo primero), calculando meses ahorrados y ahorro en intereses.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                extraMonthlyBudgetEur: {
                  type: Type.NUMBER,
                  description:
                    "Ahorro mensual extra destinado a acelerar el pago de deudas (ej. 100 para 100 €/mes)",
                },
                strategy: {
                  type: Type.STRING,
                  description:
                    "Estrategia: 'AVALANCHE' (por defecto, máximo ahorro) o 'SNOWBALL' (victorias psicológicas rápidas)",
                },
              },
              required: ["extraMonthlyBudgetEur"],
            },
          },
          {
            name: "analyze_debt_optimization",
            description:
              "Examina gastos no esenciales en los últimos meses y recomienda un recorte realista en una categoría prescindible (ej. Restaurantes, Ocio) para amortizar anticipadamente las deudas más caras.",
            parameters: {
              type: Type.OBJECT,
              properties: {},
            },
          },
        ],
      },
    ];

    // Inyectar perfil financiero como memoria de largo plazo en las instrucciones
    const profileContext =
      await this.financialProfileService.buildSystemContext(userId);
    const completeInstruction = `${this.baseSystemInstruction}\n${profileContext}`;

    const contents: any[] = [];
    for (const h of history.slice(-10)) {
      contents.push({
        role: h.role.toUpperCase() === "USER" ? "user" : "model",
        parts: [{ text: h.content }],
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const response = await this.aiClient!.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction: completeInstruction,
        tools: toolsConfig as any,
      },
    });

    const candidate = response.candidates?.[0];
    const functionCalls =
      candidate?.content?.parts?.filter((p: any) => p.functionCall) || [];

    if (functionCalls.length === 0) {
      const text =
        candidate?.content?.parts
          ?.map((p: any) => p.text || "")
          .join("")
          .trim() || "No he podido generar una respuesta para tu consulta.";
      return {
        content: text,
        toolExecutions: executedTools,
      };
    }

    // Procesar Function Calls de Gemini
    const functionResponsesParts: any[] = [];
    for (const part of functionCalls) {
      const call = part.functionCall!;
      const toolName = call.name || "unknown_tool";
      const args = (call.args as Record<string, any>) || {};

      let result: any = {};
      if (toolName === "get_financial_summary") {
        result = await this.aiToolsService.getFinancialSummary(
          userId,
          Number(args.month),
          Number(args.year),
        );
      } else if (toolName === "get_expenses_by_category") {
        result = await this.aiToolsService.getExpensesByCategory(
          userId,
          String(args.startDate),
          String(args.endDate),
          args.categoryId,
        );
      } else if (toolName === "get_budget_status") {
        result = await this.aiToolsService.getBudgetStatus(
          userId,
          Number(args.month),
          Number(args.year),
        );
      } else if (toolName === "get_account_balances") {
        result = await this.aiToolsService.getAccountBalances(userId);
      } else if (toolName === "get_savings_goals") {
        result = await this.aiToolsService.getSavingsGoals(userId);
      } else if (toolName === "calculate_savings_plan") {
        result = await this.aiToolsService.calculateSavingsPlan(
          userId,
          Number(args.targetAmountCents),
          Number(args.months),
          args.goalName,
        );
      } else if (toolName === "categorize_transaction") {
        result = await this.aiToolsService.categorizeTransaction(
          userId,
          String(args.description),
        );
      } else if (toolName === "get_proactive_insights") {
        result = await this.aiToolsService.getProactiveInsights(userId);
      } else if (toolName === "propose_recommendation") {
        result = await this.aiToolsService.proposeRecommendation(
          userId,
          args.type,
          args.title,
          args.details,
          args.actionPayload,
        );
      } else if (toolName === "create_budget") {
        const catTarget = String(
          args.categoryName || args.category || args.categoryNameOrId || "",
        );
        const amountVal = Number(
          args.amountLimitEur ??
            args.amountLimit ??
            args.amount ??
            args.limit ??
            0,
        );
        result = await this.aiToolsService.createBudget(userId, {
          categoryNameOrId: catTarget,
          amountLimitEur: amountVal,
          month: args.month ? Number(args.month) : undefined,
          year: args.year ? Number(args.year) : undefined,
          alertThresholdPct: args.alertThresholdPct
            ? Number(args.alertThresholdPct)
            : args.threshold
              ? Number(args.threshold)
              : undefined,
        });
      } else if (toolName === "create_transaction") {
        result = await this.aiToolsService.createTransaction(userId, {
          type:
            String(args.type).toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE",
          amountEur: Number(args.amountEur),
          description: String(args.description),
          accountNameOrId: args.accountName
            ? String(args.accountName)
            : undefined,
          categoryNameOrId: args.categoryName
            ? String(args.categoryName)
            : undefined,
          date: args.date ? String(args.date) : undefined,
        });
      } else if (toolName === "create_debt") {
        result = await this.aiToolsService.createDebt(userId, {
          concept: String(args.concept),
          amountEur: Number(args.amountEur),
          interestRatePercent: Number(args.interestRatePercent),
          interestRateType: args.interestRateType,
          creditor: args.creditor,
          minimumMonthlyPaymentEur: args.minimumMonthlyPaymentEur
            ? Number(args.minimumMonthlyPaymentEur)
            : undefined,
          dueDate: args.dueDate,
          notes: args.notes,
        });
      } else if (toolName === "get_debts") {
        result = await this.aiToolsService.getDebts(
          userId,
          Boolean(args.includePaidOff),
        );
      } else if (toolName === "amortize_debt") {
        result = await this.aiToolsService.amortizeDebt(userId, {
          debtId: args.debtId,
          conceptKeyword: args.conceptKeyword,
          amountEur: Number(args.amountEur),
          fromAccountName: args.fromAccountName,
          notes: args.notes,
        });
      } else if (toolName === "simulate_debt_payoff") {
        result = await this.aiToolsService.simulateDebtPayoff(userId, {
          extraMonthlyBudgetEur: Number(args.extraMonthlyBudgetEur),
          strategy: args.strategy,
        });
      } else if (toolName === "analyze_debt_optimization") {
        result = await this.aiToolsService.analyzeDebtOptimization(userId);
      }

      executedTools.push({
        toolName,
        args,
        result,
      });

      functionResponsesParts.push({
        functionResponse: {
          name: toolName,
          response: { output: result },
        },
      });
    }

    // Segunda vuelta a Gemini con los resultados verificados deterministas
    const followUpContents = [
      ...contents,
      candidate!.content,
      {
        role: "user",
        parts: functionResponsesParts,
      },
    ];

    const followUpResponse = await this.aiClient!.models.generateContent({
      model: "gemini-2.0-flash",
      contents: followUpContents,
      config: {
        systemInstruction: completeInstruction,
      },
    });

    const finalText =
      followUpResponse.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || "")
        .join("")
        .trim() || "He procesado los datos de tu cuenta.";

    return {
      content: finalText,
      toolExecutions: executedTools,
    };
  }

  /**
   * Motor ReAct Local Determinista:
   * Analiza la intención de la consulta, mantiene memoria conversacional a corto plazo,
   * ejecuta las herramientas en PostgreSQL con cero alucinaciones y formatea la respuesta en euros.
   */
  private async executeLocalFallback(
    userId: string,
    message: string,
    history: Array<{ role: string; content: string }> = [],
  ): Promise<AdvisorExecutionResult> {
    const textLower = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const executedTools: ToolCallExecution[] = [];

    // Memoria conversacional a corto plazo: extraer contexto de turnos recientes
    const conversationContext = history
      .slice(-6)
      .map((h) => h.content)
      .join(" ")
      .toLowerCase();

    // =========================================================================
    // INTENCIÓN PRE-1: APROBACIÓN O RECHAZO CONVERSACIONAL (HUMAN-IN-THE-LOOP)
    // =========================================================================
    const isApprovalIntent =
      /\b(?:si\s*,?\s*)?(?:apruebo|acepto|confirmo|adelante|aplica(?:lo)?|hazlo|de acuerdo|procede)\b/i.test(
        textLower,
      ) &&
      !textLower.includes("no ") &&
      !textLower.includes("rechazo") &&
      !textLower.includes("cancela");

    const isRejectionIntent =
      /\b(?:no\s*,?\s*)?(?:rechazo|rechazar|cancela|cancelar|descarta|descartar|no lo hagas|dejalo|anula|anular)\b/i.test(
        textLower,
      ) &&
      !textLower.includes("si ") &&
      !textLower.includes("apruebo") &&
      !textLower.includes("acepto");

    if (isApprovalIntent || isRejectionIntent) {
      const pendingRecs =
        await this.recommendationsService.getPendingRecommendations(userId);
      if (pendingRecs && pendingRecs.length > 0) {
        const targetRec = pendingRecs[0];
        if (isApprovalIntent) {
          await this.recommendationsService.applyRecommendation(
            userId,
            targetRec.id,
          );
          return {
            content: `✅ **Propuesta Aprobada y Ejecutada con Éxito:**\n\nHe aplicado la acción autorizada: **${targetRec.title}**.\n\nTus registros y saldos han sido actualizados en la plataforma según lo acordado.`,
            toolExecutions: executedTools,
          };
        } else {
          await this.recommendationsService.rejectRecommendation(
            userId,
            targetRec.id,
          );
          return {
            content: `❌ **Propuesta Descartada:**\n\nHe rechazado la propuesta: **${targetRec.title}**.\n\nNo se ha realizado ninguna modificación en tus movimientos, presupuestos ni metas.`,
            toolExecutions: executedTools,
          };
        }
      }
    }

    // =========================================================================
    // INTENCIÓN 0-HITL: EDITAR O ELIMINAR BAJO SUPERVISIÓN HUMANA
    // (Movimientos, Presupuestos y Metas)
    // =========================================================================
    const isDeleteVerb =
      /\b(?:elimina|eliminar|borra|borrar|quita|quitar|suprime|suprimir)\b/i.test(
        textLower,
      );
    const isEditVerb =
      /\b(?:edita|editar|modifica|modificar|cambia|cambiar|ajusta|ajustar|actualiza|actualizar|corrige|corregir)\b/i.test(
        textLower,
      );

    // --- A) ELIMINAR O EDITAR PRESUPUESTOS ---
    const isBudgetKeyword =
      textLower.includes("presupuesto") ||
      textLower.includes("tope mensual") ||
      textLower.includes("limite mensual");

    if (isBudgetKeyword && (isDeleteVerb || isEditVerb)) {
      let periodMonth = currentMonth;
      let periodYear = currentYear;
      const MONTH_MAP: Record<string, number> = {
        enero: 1,
        febrero: 2,
        marzo: 3,
        abril: 4,
        mayo: 5,
        junio: 6,
        julio: 7,
        agosto: 8,
        septiembre: 9,
        setiembre: 9,
        octubre: 10,
        noviembre: 11,
        diciembre: 12,
      };
      for (const [mName, mNum] of Object.entries(MONTH_MAP)) {
        if (new RegExp(`\\b${mName}\\b`, "i").test(textLower)) {
          periodMonth = mNum;
          break;
        }
      }
      const yearMatch = textLower.match(/\b(202\d|203\d)\b/);
      if (yearMatch) periodYear = parseInt(yearMatch[1], 10);

      let categoryQuery = textLower
        .replace(
          /\b(?:elimina|eliminar|borra|borrar|edita|editar|modifica|modificar|cambia|cambiar|ajusta|ajustar|actualiza|actualizar|presupuesto|mensual|mes|de|del|en|para|el|la|los|las|por|al|a)\b/gi,
          " ",
        )
        .replace(/\b(202\d|203\d)\b/g, " ")
        .replace(/[\d\.,]+\s*(?:€|euros?|eur)?/gi, " ")
        .replace(/\d{1,3}\s*%/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!categoryQuery && conversationContext) {
        for (const catName of [
          "alimentacion",
          "supermercado",
          "ocio",
          "restaurantes",
          "transporte",
          "vivienda",
          "salud",
        ]) {
          if (conversationContext.includes(catName)) {
            categoryQuery = catName;
            break;
          }
        }
      }

      const budget = await this.aiToolsService.findBudgetForCategory(
        userId,
        categoryQuery || "alimentacion",
        periodMonth,
        periodYear,
      );

      if (!budget) {
        return {
          content: `No he encontrado ningún presupuesto configurado para "${categoryQuery || "la categoría solicitada"}" en el periodo ${periodMonth}/${periodYear}. Puedes revisar tus presupuestos activos en la sección de Presupuestos.`,
          toolExecutions: executedTools,
        };
      }

      if (isDeleteVerb) {
        const limitFormatted = (budget.amountLimitCents / 100)
          .toFixed(2)
          .replace(".", ",");
        const propResult = await this.aiToolsService.proposeRecommendation(
          userId,
          "BUDGET_ADJUSTMENT",
          `Eliminar presupuesto: ${budget.categoryName}`,
          `Se propone eliminar el límite presupuestario mensual de ${limitFormatted} € para la categoría "${budget.categoryName}" en ${periodMonth}/${periodYear}. Las transacciones registradas no se verán afectadas.`,
          {
            actionType: "DELETE_BUDGET",
            budgetId: budget.budgetId,
            categoryName: budget.categoryName,
            amountLimitCents: budget.amountLimitCents,
            periodMonth,
            periodYear,
          },
        );

        executedTools.push({
          toolName: "propose_recommendation",
          args: { actionType: "DELETE_BUDGET", budgetId: budget.budgetId },
          result: {
            ...propResult,
            actionType: "DELETE_BUDGET",
            budgetId: budget.budgetId,
            categoryName: budget.categoryName,
            amountLimitCents: budget.amountLimitCents,
            periodMonth,
            periodYear,
          },
        });

        return {
          content: `⚠️ **Propuesta de Eliminación de Presupuesto:**\n\nHe localizado el presupuesto de **${budget.categoryName}** (${limitFormatted} €/mes para ${periodMonth}/${periodYear}).\n\nPor seguridad y supervisión humana, esta acción requiere tu aprobación previa antes de aplicarse.\n\n¿Deseas **aprobar** o **rechazar** esta eliminación? Puedes usar los botones de la tarjeta o responderme en el chat.`,
          toolExecutions: executedTools,
        };
      } else {
        let newLimitEur = 0;
        const amountMatch =
          textLower.match(
            /(?:a|por|en|limite\s*[:=]?)\s*([\d\.,]+)\s*(?:€|euros?|eur)?/i,
          ) || textLower.match(/([\d\.,]+)\s*(?:€|euros?|eur)/i);
        if (amountMatch) {
          const raw = amountMatch[1].replace(/\./g, "").replace(",", ".");
          newLimitEur = parseFloat(raw);
        }

        if (!newLimitEur || newLimitEur <= 0) {
          return {
            content: `He localizado el presupuesto de **${budget.categoryName}** (actualmente ${(budget.amountLimitCents / 100).toFixed(2).replace(".", ",")} €/mes), pero no he identificado el nuevo límite deseado. Por favor, indícame la nueva cifra (por ejemplo: *"cambia el presupuesto de ${budget.categoryName} a 300€"*).`,
            toolExecutions: executedTools,
          };
        }

        const oldLimitFormatted = (budget.amountLimitCents / 100)
          .toFixed(2)
          .replace(".", ",");
        const newLimitFormatted = newLimitEur.toFixed(2).replace(".", ",");
        const newLimitCents = Math.round(newLimitEur * 100);

        const propResult = await this.aiToolsService.proposeRecommendation(
          userId,
          "BUDGET_ADJUSTMENT",
          `Ajustar presupuesto: ${budget.categoryName}`,
          `Se propone modificar el límite de "${budget.categoryName}" de ${oldLimitFormatted} € a ${newLimitFormatted} €/mes para ${periodMonth}/${periodYear}.`,
          {
            actionType: "UPDATE_BUDGET_LIMIT",
            budgetId: budget.budgetId,
            categoryName: budget.categoryName,
            newLimitCents,
            oldLimitCents: budget.amountLimitCents,
            alertThresholdPct: budget.alertThresholdPct,
            periodMonth,
            periodYear,
          },
        );

        executedTools.push({
          toolName: "propose_recommendation",
          args: {
            actionType: "UPDATE_BUDGET_LIMIT",
            budgetId: budget.budgetId,
            newLimitCents,
          },
          result: {
            ...propResult,
            actionType: "UPDATE_BUDGET_LIMIT",
            budgetId: budget.budgetId,
            categoryName: budget.categoryName,
            newLimitCents,
            oldLimitCents: budget.amountLimitCents,
            periodMonth,
            periodYear,
          },
        });

        return {
          content: `📊 **Propuesta de Ajuste Presupuestario:**\n\nHe preparado la modificación para el presupuesto de **${budget.categoryName}**:\n- Límite actual: **${oldLimitFormatted} €/mes**\n- Nuevo límite propuesto: **${newLimitFormatted} €/mes**\n\n¿Deseas **aprobar** o **rechazar** este ajuste?`,
          toolExecutions: executedTools,
        };
      }
    }

    // --- B) ELIMINAR O EDITAR METAS DE AHORRO ---
    const isGoalKeyword =
      textLower.includes("meta") ||
      textLower.includes("objetivo") ||
      textLower.includes("meta de ahorro");

    if (isGoalKeyword && (isDeleteVerb || isEditVerb)) {
      const goalQuery = textLower
        .replace(
          /\b(?:elimina|eliminar|borra|borrar|edita|editar|modifica|modificar|cambia|cambiar|ajusta|ajustar|actualiza|actualizar|meta|objetivo|de|del|en|para|el|la|los|las|por|al|a|ahorro)\b/gi,
          " ",
        )
        .replace(/[\d\.,]+\s*(?:€|euros?|eur)?/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

      const goal = await this.aiToolsService.findSavingsGoalByName(
        userId,
        goalQuery || "",
      );

      if (!goal) {
        return {
          content: `No he encontrado ninguna meta de ahorro que coincida con "${goalQuery || "tu búsqueda"}". Puedes revisar tus metas activas desde la sección de **Metas** o indicarme el nombre exacto.`,
          toolExecutions: executedTools,
        };
      }

      if (isDeleteVerb) {
        const targetFormatted = (goal.targetAmountCents / 100)
          .toFixed(2)
          .replace(".", ",");
        const curFormatted = (goal.currentAmountCents / 100)
          .toFixed(2)
          .replace(".", ",");

        const propResult = await this.aiToolsService.proposeRecommendation(
          userId,
          "SAVINGS_BOOST",
          `Eliminar meta de ahorro: "${goal.name}"`,
          `Se propone eliminar la meta "${goal.name}" (objetivo: ${targetFormatted} €, acumulado: ${curFormatted} €). Los saldos bancarios no se verán afectados.`,
          {
            actionType: "DELETE_SAVINGS_GOAL",
            goalId: goal.goalId,
            name: goal.name,
            targetAmountCents: goal.targetAmountCents,
            currentAmountCents: goal.currentAmountCents,
          },
        );

        executedTools.push({
          toolName: "propose_recommendation",
          args: { actionType: "DELETE_SAVINGS_GOAL", goalId: goal.goalId },
          result: {
            ...propResult,
            actionType: "DELETE_SAVINGS_GOAL",
            goalId: goal.goalId,
            name: goal.name,
            targetAmountCents: goal.targetAmountCents,
            currentAmountCents: goal.currentAmountCents,
          },
        });

        return {
          content: `⚠️ **Propuesta de Eliminación de Meta de Ahorro:**\n\nHe localizado la meta **"${goal.name}"** (Objetivo: **${targetFormatted} €**, Acumulado: **${curFormatted} €**).\n\nEliminar la meta detendrá el seguimiento sin modificar tus fondos bancarios.\n\n¿Deseas **aprobar** o **rechazar** esta eliminación?`,
          toolExecutions: executedTools,
        };
      } else {
        let newTargetEur = 0;
        const amountMatch =
          textLower.match(
            /(?:a|por|en|objetivo\s*[:=]?)\s*([\d\.,]+)\s*(?:€|euros?|eur)?/i,
          ) || textLower.match(/([\d\.,]+)\s*(?:€|euros?|eur)/i);
        if (amountMatch) {
          const raw = amountMatch[1].replace(/\./g, "").replace(",", ".");
          newTargetEur = parseFloat(raw);
        }

        if (!newTargetEur || newTargetEur <= 0) {
          return {
            content: `He localizado la meta **"${goal.name}"** (objetivo actual: ${(goal.targetAmountCents / 100).toFixed(2).replace(".", ",")} €), pero no he identificado el nuevo importe objetivo. Por favor, indícame la cifra (ejemplo: *"cambia la meta ${goal.name} a 5000€"*).`,
            toolExecutions: executedTools,
          };
        }

        const oldTargetFormatted = (goal.targetAmountCents / 100)
          .toFixed(2)
          .replace(".", ",");
        const newTargetFormatted = newTargetEur.toFixed(2).replace(".", ",");
        const newTargetCents = Math.round(newTargetEur * 100);

        const propResult = await this.aiToolsService.proposeRecommendation(
          userId,
          "SAVINGS_BOOST",
          `Editar meta de ahorro: "${goal.name}"`,
          `Se propone actualizar el objetivo financiero de la meta "${goal.name}" de ${oldTargetFormatted} € a ${newTargetFormatted} €.`,
          {
            actionType: "UPDATE_SAVINGS_GOAL",
            goalId: goal.goalId,
            name: goal.name,
            targetAmountCents: newTargetCents,
            oldTargetAmountCents: goal.targetAmountCents,
          },
        );

        executedTools.push({
          toolName: "propose_recommendation",
          args: {
            actionType: "UPDATE_SAVINGS_GOAL",
            goalId: goal.goalId,
            targetAmountCents: newTargetCents,
          },
          result: {
            ...propResult,
            actionType: "UPDATE_SAVINGS_GOAL",
            goalId: goal.goalId,
            name: goal.name,
            targetAmountCents: newTargetCents,
            oldTargetAmountCents: goal.targetAmountCents,
          },
        });

        return {
          content: `🎯 **Propuesta de Modificación de Meta de Ahorro:**\n\nHe preparado la actualización para la meta **"${goal.name}"**:\n- Objetivo actual: **${oldTargetFormatted} €**\n- Nuevo objetivo propuesto: **${newTargetFormatted} €**\n\n¿Deseas **aprobar** o **rechazar** esta modificación?`,
          toolExecutions: executedTools,
        };
      }
    }

    // --- C) ELIMINAR O EDITAR MOVIMIENTOS ---
    const isTxKeyword =
      textLower.includes("movimiento") ||
      textLower.includes("transaccion") ||
      textLower.includes("gasto") ||
      textLower.includes("ingreso");

    if (isTxKeyword && (isDeleteVerb || isEditVerb)) {
      let searchAmountEur: number | undefined;
      const numMatch = textLower.match(/([\d\.,]+)\s*(?:€|euros?|eur)/i);
      if (numMatch) {
        const parsed = parseFloat(
          numMatch[1].replace(/\./g, "").replace(",", "."),
        );
        if (!isNaN(parsed) && parsed > 0) searchAmountEur = parsed;
      }

      const txQuery = textLower
        .replace(
          /\b(?:elimina|eliminar|borra|borrar|edita|editar|modifica|modificar|cambia|cambiar|ajusta|ajustar|actualiza|actualizar|movimiento|transaccion|gasto|ingreso|de|del|en|para|el|la|los|las|por|al|a)\b/gi,
          " ",
        )
        .replace(/[\d\.,]+\s*(?:€|euros?|eur)?/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

      const matchedTxs = await this.aiToolsService.findRecentTransactions(
        userId,
        {
          searchQuery: txQuery || undefined,
          amountEur: searchAmountEur,
          limit: 10,
        },
      );

      if (!matchedTxs || matchedTxs.length === 0) {
        return {
          content: `No he encontrado ningún movimiento reciente que coincida con "${txQuery || (searchAmountEur ? searchAmountEur + "€" : "tu solicitud")}". Por favor, indícame con mayor detalle el concepto o importe de la transacción.`,
          toolExecutions: executedTools,
        };
      }

      const tx = matchedTxs[0];
      const amountFormatted = (Math.abs(Number(tx.amountCents)) / 100)
        .toFixed(2)
        .replace(".", ",");

      if (isDeleteVerb) {
        const propResult = await this.aiToolsService.proposeRecommendation(
          userId,
          "EXPENSE_ALERT",
          `Eliminar movimiento: "${tx.description}"`,
          `Se propone eliminar el movimiento "${tx.description}" de ${amountFormatted} €. El saldo de tu cuenta se revertirá automáticamente tras tu aprobación.`,
          {
            actionType: "DELETE_TRANSACTION",
            transactionId: tx.id,
            description: tx.description,
            amountCents: Number(tx.amountCents),
            accountName: tx.accountName,
          },
        );

        executedTools.push({
          toolName: "propose_recommendation",
          args: { actionType: "DELETE_TRANSACTION", transactionId: tx.id },
          result: {
            ...propResult,
            actionType: "DELETE_TRANSACTION",
            transactionId: tx.id,
            description: tx.description,
            amountCents: Number(tx.amountCents),
          },
        });

        return {
          content: `⚠️ **Propuesta de Eliminación de Movimiento:**\n\nHe localizado el movimiento **"${tx.description}"** por importe de **${amountFormatted} €**.\n\nPor seguridad y supervisión humana, esta acción requiere tu confirmación previa antes de eliminar el movimiento y revertir el saldo.\n\n¿Deseas **aprobar** o **rechazar** esta eliminación?`,
          toolExecutions: executedTools,
        };
      } else {
        let newAmountEur = 0;
        const newAmtMatch =
          textLower.match(
            /(?:a|por|importe\s*[:=]?)\s*([\d\.,]+)\s*(?:€|euros?|eur)?/i,
          ) || textLower.match(/([\d\.,]+)\s*(?:€|euros?|eur)/i);
        if (newAmtMatch) {
          const raw = newAmtMatch[1].replace(/\./g, "").replace(",", ".");
          newAmountEur = parseFloat(raw);
        }

        if (!newAmountEur || newAmountEur <= 0) {
          return {
            content: `He localizado el movimiento **"${tx.description}"** (${amountFormatted} €), pero no he identificado el nuevo importe. Por favor, especifícalo (ejemplo: *"cambia el movimiento de ${tx.description} a 25€"*).`,
            toolExecutions: executedTools,
          };
        }

        const newAmountFormatted = newAmountEur.toFixed(2).replace(".", ",");
        const isExpense = Number(tx.amountCents) < 0 || tx.type === "EXPENSE";
        const newAmountCents =
          (isExpense ? -1 : 1) * Math.round(newAmountEur * 100);

        const propResult = await this.aiToolsService.proposeRecommendation(
          userId,
          "EXPENSE_ALERT",
          `Editar movimiento: "${tx.description}"`,
          `Se propone modificar el movimiento "${tx.description}" de ${amountFormatted} € a ${newAmountFormatted} €. El saldo de tu cuenta se recalculará tras tu aprobación.`,
          {
            actionType: "UPDATE_TRANSACTION",
            transactionId: tx.id,
            description: tx.description,
            amountCents: newAmountCents,
            oldAmountCents: Number(tx.amountCents),
          },
        );

        executedTools.push({
          toolName: "propose_recommendation",
          args: {
            actionType: "UPDATE_TRANSACTION",
            transactionId: tx.id,
            amountCents: newAmountCents,
          },
          result: {
            ...propResult,
            actionType: "UPDATE_TRANSACTION",
            transactionId: tx.id,
            description: tx.description,
            amountCents: newAmountCents,
            oldAmountCents: Number(tx.amountCents),
          },
        });

        return {
          content: `✏️ **Propuesta de Modificación de Movimiento:**\n\nHe preparado la modificación para el movimiento **"${tx.description}"**:\n- Importe actual: **${amountFormatted} €**\n- Nuevo importe propuesto: **${newAmountFormatted} €**\n\n¿Deseas **aprobar** o **rechazar** esta modificación?`,
          toolExecutions: executedTools,
        };
      }
    }

    // =========================================================================
    // INTENCIÓN 0A: CREAR O ACTUALIZAR PRESUPUESTO DESDE TEXTO NATURAL
    // Cubre todas las formas y expresiones libres:
    // - "crea un presupuesto para supermercado mes septiembre 2026, categoria: alimentacion, limite mensual: 200, 90%."
    // - "crea un presupuesto para supermercado, categoria: alimentacion, limite mensual: 200, 90%."
    // - "crea un presupuesto para supermercado, 200/mes, 90%"
    // - "pon un presupuesto de 300€ para Ocio al 85%"
    // - "limite mensual de 150 en restaurantes"
    // =========================================================================
    const hasBudgetKeyword =
      textLower.includes("presupuesto") ||
      textLower.includes("limite mensual") ||
      textLower.includes("limite de gasto") ||
      textLower.includes("tope mensual") ||
      /\b(?:presupuest|limite|tope)\b/i.test(textLower);

    const hasActionKeyword =
      textLower.includes("crea") ||
      textLower.includes("crear") ||
      textLower.includes("pon") ||
      textLower.includes("poner") ||
      textLower.includes("asigna") ||
      textLower.includes("asignar") ||
      textLower.includes("defin") ||
      textLower.includes("nuevo") ||
      textLower.includes("nueva") ||
      textLower.includes("establec") ||
      textLower.includes("haz") ||
      textLower.includes("hacer") ||
      textLower.includes("configur") ||
      textLower.includes("anad") ||
      textLower.includes("agreg") ||
      textLower.includes("quiero") ||
      /^presupuesto\s+(?:para|de|en)\b/i.test(textLower) ||
      /^nuevo\s+presupuesto\b/i.test(textLower);

    const isBudgetCreationIntent =
      hasBudgetKeyword &&
      hasActionKeyword &&
      !textLower.includes("como va mi presupuesto") &&
      !textLower.includes("estado de mi presupuesto") &&
      !textLower.includes("ritmo de mi presupuesto") &&
      !textLower.includes("cuanto me queda en el presupuesto") &&
      !textLower.includes("como van mis presupuestos");

    if (isBudgetCreationIntent) {
      // 1. Extraer porcentaje de alerta temprana (ej. "90%", "al 90%", "alerta: 90", "aviso: 90%")
      let alertThresholdPct = 80;
      const pctMatch = textLower.match(/(\d{1,3})\s*%/);
      if (pctMatch) {
        const parsedPct = parseInt(pctMatch[1], 10);
        if (parsedPct >= 1 && parsedPct <= 100) {
          alertThresholdPct = parsedPct;
        }
      } else {
        const alertMatch = textLower.match(
          /(?:alerta|aviso|notificacion)(?:\s+temprana)?\s*[:=]?\s*(?:al\s*)?(\d{1,3})\b/i,
        );
        if (alertMatch) {
          const parsedAlert = parseInt(alertMatch[1], 10);
          if (parsedAlert >= 1 && parsedAlert <= 100) {
            alertThresholdPct = parsedAlert;
          }
        }
      }

      // 2. Extraer Mes y Año
      let periodMonth = currentMonth;
      let periodYear = currentYear;

      const MONTH_MAP: Record<string, number> = {
        enero: 1,
        febrero: 2,
        marzo: 3,
        abril: 4,
        mayo: 5,
        junio: 6,
        julio: 7,
        agosto: 8,
        septiembre: 9,
        setiembre: 9,
        octubre: 10,
        noviembre: 11,
        diciembre: 12,
      };

      const yearMatch = textLower.match(/\b(202\d|203\d)\b/);
      if (yearMatch) {
        periodYear = parseInt(yearMatch[1], 10);
      }

      let foundMonth = false;
      for (const [mName, mNum] of Object.entries(MONTH_MAP)) {
        const mRegex = new RegExp(`\\b${mName}\\b`, "i");
        if (mRegex.test(textLower)) {
          periodMonth = mNum;
          foundMonth = true;
          break;
        }
      }

      if (!foundMonth) {
        const numMonthSlash = textLower.match(
          /\b(0?[1-9]|1[0-2])\/(202\d|203\d)\b/,
        );
        if (numMonthSlash) {
          periodMonth = parseInt(numMonthSlash[1], 10);
          periodYear = parseInt(numMonthSlash[2], 10);
          foundMonth = true;
        }
      }
      if (!foundMonth) {
        const explicitNumMonth = textLower.match(
          /\bmes\s*[:=]?\s*(0?[1-9]|1[0-2])\b/i,
        );
        if (explicitNumMonth) {
          periodMonth = parseInt(explicitNumMonth[1], 10);
          foundMonth = true;
        }
      }

      // 3. Extraer importe límite en euros (amountLimitEur)
      let amountLimitEur: number | null = null;

      // Patrón 3.1: Etiquetado explícito ("limite mensual: 200", "limite: 200", "monto: 200", "tope: 200")
      const labeledAmountMatch = textLower.match(
        /(?:limite(?:\s+mensual)?|tope(?:\s+mensual)?|monto(?:\s+mensual)?|importe(?:\s+mensual)?|cantidad)\s*[:=]?\s*([\d\.,]+)/i,
      );
      if (labeledAmountMatch) {
        const raw = labeledAmountMatch[1].replace(/\./g, "").replace(",", ".");
        const parsed = parseFloat(raw);
        if (
          !isNaN(parsed) &&
          parsed > 0 &&
          parsed !== periodYear &&
          parsed !== alertThresholdPct
        ) {
          amountLimitEur = parsed;
        }
      }

      // Patrón 3.2: Formato recurrente "/mes", "al mes", "por mes" (ej. "200/mes", "200 / mes", "200 al mes")
      if (!amountLimitEur) {
        const perMonthMatch = textLower.match(
          /([\d\.,]+)\s*(?:\/|\s*al\s*|\s*por\s*|\s*cada\s*)\s*mes\b/i,
        );
        if (perMonthMatch) {
          const raw = perMonthMatch[1].replace(/\./g, "").replace(",", ".");
          const parsed = parseFloat(raw);
          if (
            !isNaN(parsed) &&
            parsed > 0 &&
            parsed !== periodYear &&
            parsed !== alertThresholdPct
          ) {
            amountLimitEur = parsed;
          }
        }
      }

      // Patrón 3.3: Con símbolo de divisa (ej. "200€", "200 €", "200 euros", "200 eur")
      if (!amountLimitEur) {
        const currencyMatch = textLower.match(
          /([\d\.,]+)\s*(?:€|euros?|eur)\b/i,
        );
        if (currencyMatch) {
          const raw = currencyMatch[1].replace(/\./g, "").replace(",", ".");
          const parsed = parseFloat(raw);
          if (!isNaN(parsed) && parsed > 0) {
            amountLimitEur = parsed;
          }
        }
      }

      // Patrón 3.4: Preposición "de 200", "por 200"
      if (!amountLimitEur) {
        const prepMatch = textLower.match(
          /(?:presupuesto|limite|tope)\s+(?:de|por)\s+([\d\.,]+)(?!\s*%)/i,
        );
        if (prepMatch) {
          const raw = prepMatch[1].replace(/\./g, "").replace(",", ".");
          const parsed = parseFloat(raw);
          if (
            !isNaN(parsed) &&
            parsed > 0 &&
            parsed !== periodYear &&
            parsed !== alertThresholdPct
          ) {
            amountLimitEur = parsed;
          }
        }
      }

      // Patrón 3.5: Cifra numérica residual
      if (!amountLimitEur) {
        const allNumbers = [...textLower.matchAll(/\b([\d\.,]+)\b/g)];
        for (const m of allNumbers) {
          const raw = m[1].replace(/\./g, "").replace(",", ".");
          const parsed = parseFloat(raw);
          if (
            !isNaN(parsed) &&
            parsed > 0 &&
            parsed !== periodYear &&
            parsed !== alertThresholdPct &&
            !(foundMonth && parsed === periodMonth && parsed <= 12)
          ) {
            amountLimitEur = parsed;
            break;
          }
        }
      }

      // 4. Extraer Categoría y Concepto
      let explicitCategory = "";
      let conceptCategory = "";

      // 4.1. Etiqueta explícita "categoria: alimentacion", "categoria=ocio"
      const explicitCatMatch = textLower.match(
        /categor(?:i|í)a\s*[:=]\s*([a-z0-9\s/&]+?)(?:,|$|\s+(?:limite|monto|tope|alerta|mes|año|ano|\d))/i,
      );
      if (explicitCatMatch && explicitCatMatch[1]) {
        explicitCategory = explicitCatMatch[1].trim();
      }

      // 4.2. Concepto tras "para", "en", "de" (ej. "para supermercado", "en ocio", "para compras")
      const conceptMatch = textLower.match(
        /(?:presupuesto|limite|tope)\s+(?:para|en|de)\s+([a-z0-9\s/&]+?)(?:,|$|\s+(?:mes|categor|limite|monto|tope|con|alerta|\d+\/mes|\d+\s*€|\d+\s*euros|\d+\s*eur))/i,
      );
      if (conceptMatch && conceptMatch[1]) {
        const cand = conceptMatch[1]
          .replace(/[\d\.,]+/, "")
          .replace(/(?:€|euros?|eur)/i, "")
          .replace(/\s+(?:en|de|para|este|mes)$/i, "")
          .trim();
        if (cand.length >= 2) {
          conceptCategory = cand;
        }
      }

      // 4.3. Lista de categorías comunes en el texto completo
      let fallbackCommonCat = "";
      const commonCategoriesList = [
        "restaurantes y bares",
        "restaurantes",
        "alimentacion y supermercado",
        "supermercado y alimentacion",
        "alimentacion",
        "supermercado",
        "ocio y estilo de vida",
        "ocio y cultura",
        "ocio",
        "transporte publico",
        "transporte",
        "combustible",
        "gasolina",
        "viajes y vacaciones",
        "viajes",
        "salud y bienestar",
        "salud",
        "farmacia",
        "mantenimiento y hogar",
        "hogar",
        "vivienda",
        "alquiler",
        "hipoteca",
        "ropa",
        "compras",
        "suministros",
        "educacion",
        "hobbies y deportes",
        "hobbies",
        "suscripciones",
      ];
      for (const c of commonCategoriesList) {
        if (textLower.includes(c)) {
          fallbackCommonCat = c;
          break;
        }
      }

      const primaryCategory =
        explicitCategory || conceptCategory || fallbackCommonCat;
      const secondaryCategory = explicitCategory
        ? conceptCategory || fallbackCommonCat
        : undefined;

      if (primaryCategory && amountLimitEur && amountLimitEur > 0) {
        try {
          const budgetResult = await this.aiToolsService.createBudget(userId, {
            categoryNameOrId: primaryCategory,
            amountLimitEur,
            month: periodMonth,
            year: periodYear,
            alertThresholdPct,
            fallbackCategoryNameOrId: secondaryCategory,
          });

          executedTools.push({
            toolName: "create_budget",
            args: {
              categoryName: budgetResult.categoryName,
              amountLimitEur: budgetResult.amountLimitEur,
              month: budgetResult.periodMonth,
              year: budgetResult.periodYear,
              alertThresholdPct: budgetResult.alertThresholdPct,
            },
            result: budgetResult,
          });

          const limitEurStr = budgetResult.amountLimitEur
            .toFixed(2)
            .replace(".", ",");
          let reply = `✅ **Presupuesto creado con éxito:**\n\n`;
          reply += `- 🏷️ **Categoría:** ${budgetResult.categoryName}\n`;
          reply += `- 💶 **Límite mensual:** ${limitEurStr} €\n`;
          reply += `- 📅 **Periodo:** ${budgetResult.periodMonth}/${budgetResult.periodYear}\n`;
          reply += `- 🔔 **Alerta de ritmo:** Al superar el ${budgetResult.alertThresholdPct}% del límite.\n\n`;
          reply += `Ya puedes consultar su evolución en la sección de **Presupuestos**.`;

          return {
            content: reply,
            toolExecutions: executedTools,
          };
        } catch (err: any) {
          return {
            content: `⚠️ No he podido crear el presupuesto: ${err.message || err}`,
            toolExecutions: executedTools,
          };
        }
      } else if (!amountLimitEur && primaryCategory) {
        return {
          content: `He detectado que deseas crear un presupuesto para **${primaryCategory}**, pero no he podido identificar el importe mensual. Por favor, indícame el límite deseado (por ejemplo: *200€ al mes* o *límite mensual: 200*).`,
          toolExecutions: executedTools,
        };
      } else if (amountLimitEur && !primaryCategory) {
        const eurStr = amountLimitEur.toFixed(2).replace(".", ",");
        return {
          content: `He detectado que deseas crear un presupuesto de **${eurStr} €**, pero necesito saber a qué categoría asignarlo (por ejemplo: *Alimentación*, *Supermercado*, *Ocio*, *Transporte*).`,
          toolExecutions: executedTools,
        };
      }
    }

    // =========================================================================
    // INTENCIÓN 0B: SUBIR O REGISTRAR UN GASTO (EXPENSE) DESDE TEXTO
    // Ej: "añade un gasto de 45 euros en gasolina", "he gastado 12,50€ en Mercadona"
    // =========================================================================
    const isExpenseCreationIntent =
      textLower.match(
        /(?:crear?|nuevo|registra(?:r)?|anad(?:e|ir)|agreg(?:a|ar)|apunt(?:a|ar)|anot(?:a|ar))\s+(?:un\s+)?gasto/i,
      ) ||
      textLower.match(
        /(?:he\s+gastado|he\s+pagado|pague|compre|pago\s+de|gasto\s+de|compra\s+de)\s+([\d\.,]+)\s*(?:€|euros?|eur)?/i,
      ) ||
      (textLower.includes("gasto") &&
        /[\d\.,]+\s*(?:€|euros?|eur)/i.test(textLower) &&
        !textLower.includes("cuanto") &&
        !textLower.includes("desglose"));

    if (isExpenseCreationIntent) {
      const amountMatch =
        textLower.match(/([\d\.,]+)\s*(?:€|euros?|eur)/i) ||
        textLower.match(/(?:de|por)\s+([\d\.,]+)/i);

      if (amountMatch) {
        const rawAmount = amountMatch[1].replace(/\./g, "").replace(",", ".");
        const amountEur = parseFloat(rawAmount);

        if (amountEur && amountEur > 0) {
          // Extraer concepto / comercio: buscar tras la cifra (ej. "45 euros en gasolina" -> "gasolina")
          let description = "Gasto";
          const afterAmountMatch = message.match(
            /[\d\.,]+\s*(?:€|euros?|eur)?\s+(?:en|de|para|por)\s+([^,\.]+?)(?:\s+(?:pagado|con|hoy|ayer)|\.|$)/i,
          );
          if (afterAmountMatch && afterAmountMatch[1]) {
            description = afterAmountMatch[1].trim();
          } else {
            const descMatch =
              message.match(
                /(?:compre|he gastado|pague|gasto de)\s+[\d\.,]+\s*(?:€|euros?|eur)?\s*(?:en\s*)?([^,\.]+?)(?:pagado|con|hoy|ayer|\.|$)/i,
              ) ||
              message.match(
                /(?:en|concepto|por|para)\s+([^,\.]+?)(?:pagado|con|hoy|ayer|\.|$)/i,
              );
            if (descMatch && descMatch[1]) {
              const candidate = descMatch[1]
                .replace(/[\d\.,]+/, "")
                .replace(/(?:€|euros?|eur)/i, "")
                .trim();
              if (candidate.length >= 2) {
                description = candidate;
              }
            }
          }

          // Extraer posible cuenta si se menciona
          let accountName: string | undefined = undefined;
          if (
            textLower.includes("cuenta corriente") ||
            textLower.includes("corriente")
          ) {
            accountName = "Cuenta Corriente";
          } else if (textLower.includes("ahorro")) {
            accountName = "Cuenta de Ahorro";
          } else if (textLower.includes("tarjeta")) {
            accountName = "Tarjeta";
          } else if (textLower.includes("efectivo")) {
            accountName = "Efectivo";
          }

          try {
            const transResult = await this.aiToolsService.createTransaction(
              userId,
              {
                type: "EXPENSE",
                amountEur,
                description,
                accountNameOrId: accountName,
              },
            );

            executedTools.push({
              toolName: "create_transaction",
              args: {
                type: "EXPENSE",
                amountEur,
                description,
                accountName,
              },
              result: transResult,
            });

            const amountEurStr = transResult.amountEur
              .toFixed(2)
              .replace(".", ",");
            const balanceEurStr = transResult.newAccountBalanceEur
              .toFixed(2)
              .replace(".", ",");

            let reply = `💸 **Gasto registrado correctamente:**\n\n`;
            reply += `- 📝 **Concepto:** ${transResult.description}\n`;
            reply += `- 🔻 **Importe:** -${amountEurStr} €\n`;
            reply += `- 🏷️ **Categoría:** ${transResult.categoryName}\n`;
            reply += `- 🏦 **Cuenta:** ${transResult.accountName}\n`;
            reply += `- 💳 **Nuevo saldo disponible:** ${balanceEurStr} €\n\n`;
            reply += `El movimiento ha sido registrado y el balance de tu cuenta se ha actualizado en tiempo real.`;

            return {
              content: reply,
              toolExecutions: executedTools,
            };
          } catch (err: any) {
            return {
              content: `⚠️ No he podido registrar el gasto: ${err.message || err}`,
              toolExecutions: executedTools,
            };
          }
        }
      }
    }

    // =========================================================================
    // INTENCIÓN 0C: SUBIR O REGISTRAR UN INGRESO (INCOME) DESDE TEXTO
    // Ej: "registra un ingreso de 1500 euros de nómina", "he cobrado mi nómina de 2100 euros"
    // =========================================================================
    const isIncomeCreationIntent =
      textLower.match(
        /(?:crear?|nuevo|registra(?:r)?|anad(?:e|ir)|agreg(?:a|ar)|apunt(?:a|ar)|anot(?:a|ar))\s+(?:un\s+)?ingreso/i,
      ) ||
      textLower.match(
        /(?:he\s+cobrado|recibi|recibido|ingreso\s+de|nomina\s+de)\s+([\d\.,]+)\s*(?:€|euros?|eur)?/i,
      ) ||
      (textLower.includes("ingreso") &&
        /[\d\.,]+\s*(?:€|euros?|eur)/i.test(textLower) &&
        !textLower.includes("cuanto"));

    if (isIncomeCreationIntent) {
      const amountMatch =
        textLower.match(/([\d\.,]+)\s*(?:€|euros?|eur)/i) ||
        textLower.match(/(?:de|por)\s+([\d\.,]+)/i);

      if (amountMatch) {
        const rawAmount = amountMatch[1].replace(/\./g, "").replace(",", ".");
        const amountEur = parseFloat(rawAmount);

        if (amountEur && amountEur > 0) {
          let description = "Nómina / Ingreso";
          const afterAmountMatch = message.match(
            /[\d\.,]+\s*(?:€|euros?|eur)?\s+(?:de|por|en|concepto|motivo)\s+([^,\.]+?)(?:\s+(?:en|a|hoy|ayer)|\.|$)/i,
          );
          if (afterAmountMatch && afterAmountMatch[1]) {
            description = afterAmountMatch[1].trim();
          } else {
            const descMatch =
              message.match(
                /(?:he cobrado|recibi|ingreso de)\s+[\d\.,]+\s*(?:€|euros?|eur)?\s*(?:de\s*)?([^,\.]+?)(?:en|a|hoy|ayer|\.|$)/i,
              ) ||
              message.match(
                /(?:de|concepto|por|en|motivo)\s+([^,\.]+?)(?:en|a|hoy|ayer|\.|$)/i,
              );
            if (descMatch && descMatch[1]) {
              const candidate = descMatch[1]
                .replace(/[\d\.,]+/, "")
                .replace(/(?:€|euros?|eur)/i, "")
                .trim();
              if (candidate.length >= 2) {
                description = candidate;
              }
            }
          }

          // Extraer posible cuenta si se menciona
          let accountName: string | undefined = undefined;
          if (
            textLower.includes("cuenta corriente") ||
            textLower.includes("corriente")
          ) {
            accountName = "Cuenta Corriente";
          } else if (textLower.includes("ahorro")) {
            accountName = "Cuenta de Ahorro";
          }

          try {
            const transResult = await this.aiToolsService.createTransaction(
              userId,
              {
                type: "INCOME",
                amountEur,
                description,
                accountNameOrId: accountName,
              },
            );

            executedTools.push({
              toolName: "create_transaction",
              args: {
                type: "INCOME",
                amountEur,
                description,
                accountName,
              },
              result: transResult,
            });

            const amountEurStr = transResult.amountEur
              .toFixed(2)
              .replace(".", ",");
            const balanceEurStr = transResult.newAccountBalanceEur
              .toFixed(2)
              .replace(".", ",");

            let reply = `💰 **Ingreso registrado correctamente:**\n\n`;
            reply += `- 📝 **Concepto:** ${transResult.description}\n`;
            reply += `- 🔺 **Importe:** +${amountEurStr} €\n`;
            reply += `- 🏷️ **Categoría:** ${transResult.categoryName}\n`;
            reply += `- 🏦 **Cuenta:** ${transResult.accountName}\n`;
            reply += `- 💳 **Nuevo saldo acumulado:** ${balanceEurStr} €\n\n`;
            reply += `El saldo de tu cuenta se ha incrementado inmediatamente.`;

            return {
              content: reply,
              toolExecutions: executedTools,
            };
          } catch (err: any) {
            return {
              content: `⚠️ No he podido registrar el ingreso: ${err.message || err}`,
              toolExecutions: executedTools,
            };
          }
        }
      }
    }

    // Intención 1: Planificación multi-paso de ahorro (ej. "quiero ahorrar 5.000€ en 8 meses", "meta de 3000 en 6 meses")
    const cleanForPlan = textLower.replace(/\?/g, " ");
    const savingsPlanMatch =
      cleanForPlan.match(
        /(?:ahorrar|juntar|reunir|meta de)\s*([\d\.,]+)\s*(?:€|euros|eur|\$)?\s*(?:en\s*)?(\d+)\s*mes/i,
      ) ||
      cleanForPlan.match(
        /([\d\.,]+)\s*(?:€|euros|eur|\$)?\s*en\s*(\d+)\s*mes/i,
      );

    const hasSavingsIntent =
      savingsPlanMatch ||
      ((textLower.includes("ahorr") || textLower.includes("meta")) &&
        (/\d+/.test(textLower) || textLower.includes("plan"))) ||
      (cleanForPlan.match(/(?:en\s*)?(\d+)\s*mes/i) &&
        (conversationContext.includes("ahorr") ||
          conversationContext.includes("meta")));

    if (hasSavingsIntent) {
      let targetEur = 3000;
      let months = 6;
      let goalName = "Meta de Ahorro";

      if (savingsPlanMatch) {
        const rawAmount = savingsPlanMatch[1]
          .replace(/\./g, "")
          .replace(",", ".");
        targetEur = parseFloat(rawAmount) || 3000;
        months = parseInt(savingsPlanMatch[2], 10) || 6;
      } else {
        const amountMatch = cleanForPlan.match(/([\d\.,]+)\s*(?:€|euros|eur)?/);
        if (amountMatch) {
          const rawAmount = amountMatch[1].replace(/\./g, "").replace(",", ".");
          const parsed = parseFloat(rawAmount);
          if (parsed && parsed > 50) targetEur = parsed;
        } else {
          // Extraer importe de referencia desde la memoria conversacional previa
          const priorAmountMatch =
            conversationContext.match(
              /(?:ahorrar|juntar|reunir|meta de)\s*([\d\.,]+)/i,
            ) || conversationContext.match(/([\d\.,]+)\s*(?:€|euros|eur)/i);
          if (priorAmountMatch) {
            const rawPrior = priorAmountMatch[1]
              .replace(/\./g, "")
              .replace(",", ".");
            const parsed = parseFloat(rawPrior);
            if (parsed && parsed > 50) targetEur = parsed;
          }
        }

        const monthsMatch = cleanForPlan.match(/(\d+)\s*mes/);
        if (monthsMatch) {
          months = parseInt(monthsMatch[1], 10) || 6;
        }
      }

      // Extraer posible nombre (del mensaje actual o del contexto conversacional previo)
      if (textLower.includes("coche") || textLower.includes("auto"))
        goalName = "Comprar Coche";
      else if (textLower.includes("vacaci") || textLower.includes("viaje"))
        goalName = "Vacaciones";
      else if (textLower.includes("emergencia"))
        goalName = "Fondo de Emergencia";
      else if (textLower.includes("boda")) goalName = "Boda";
      else if (
        conversationContext.includes("coche") ||
        conversationContext.includes("auto")
      )
        goalName = "Comprar Coche";
      else if (
        conversationContext.includes("vacaci") ||
        conversationContext.includes("viaje")
      )
        goalName = "Vacaciones";
      else if (conversationContext.includes("emergencia"))
        goalName = "Fondo de Emergencia";
      else if (conversationContext.includes("boda")) goalName = "Boda";

      const targetAmountCents = Math.round(targetEur * 100);
      const planResult = await this.aiToolsService.calculateSavingsPlan(
        userId,
        targetAmountCents,
        months,
        goalName,
      );

      executedTools.push({
        toolName: "calculate_savings_plan",
        args: { targetAmountCents, months, goalName },
        result: planResult,
      });

      let reply = planResult.summary;
      reply += `\n\n📌 He generado una propuesta estructurada en tu panel lateral de recomendaciones. Puedes pulsar **[Aprobar y Aplicar]** para formalizar la meta automáticamente en tu cuenta.`;

      return {
        content: reply,
        toolExecutions: executedTools,
      };
    }

    // Intención 2: Consultar saldo consolidado y cuentas
    if (
      textLower.includes("saldo") ||
      textLower.includes("cuanto dinero tengo") ||
      textLower.includes("mis cuentas") ||
      textLower.includes("patrimonio") ||
      textLower.includes("balance total")
    ) {
      const balances = await this.aiToolsService.getAccountBalances(userId);
      executedTools.push({
        toolName: "get_account_balances",
        args: {},
        result: balances,
      });

      const totalEur = (balances.totalBalanceCents / 100)
        .toFixed(2)
        .replace(".", ",");
      let reply = `💳 **Saldos Consolidados:**\n\n`;
      reply += `Tu patrimonio total disponible consolidado es de **${totalEur} €** en **${balances.accounts.length}** cuenta(s):\n\n`;

      for (const acc of balances.accounts) {
        const balEur = (acc.balanceCents / 100).toFixed(2).replace(".", ",");
        let icon = "🏦";
        if (acc.type === "SAVINGS") icon = "🐷";
        else if (acc.type === "CREDIT_CARD") icon = "💳";
        else if (acc.type === "CASH") icon = "💵";
        else if (acc.type === "INVESTMENT") icon = "📈";

        reply += `- ${icon} **${acc.name}**: ${balEur} € (${acc.type})\n`;
      }

      return {
        content: reply,
        toolExecutions: executedTools,
      };
    }

    // Intención 3: Consultar metas de ahorro existentes y progreso
    if (
      textLower.includes("mis metas") ||
      textLower.includes("metas de ahorro") ||
      textLower.includes("objetivos de ahorro") ||
      (textLower.includes("como van") && textLower.includes("meta"))
    ) {
      const goals = await this.aiToolsService.getSavingsGoals(userId);
      executedTools.push({
        toolName: "get_savings_goals",
        args: {},
        result: { count: goals.length, goals },
      });

      if (goals.length === 0) {
        return {
          content: `Actualmente no tienes ninguna meta de ahorro configurada. Puedes decirme por ejemplo *"Quiero ahorrar 2.000€ en 6 meses"* y diseñaremos juntos un plan viable.`,
          toolExecutions: executedTools,
        };
      }

      let reply = `🎯 **Tus Metas de Ahorro:**\n\n`;
      for (const g of goals) {
        const curEur = (g.currentAmountCents / 100)
          .toFixed(2)
          .replace(".", ",");
        const targetEur = (g.targetAmountCents / 100)
          .toFixed(2)
          .replace(".", ",");
        const statusEmoji = g.isCompleted
          ? "🏆 ¡COMPLETADA!"
          : `Progreso: **${g.progressPercent}%**`;
        reply += `- **${g.name}**: ${curEur} € de ${targetEur} € (${statusEmoji})\n`;
      }

      return {
        content: reply,
        toolExecutions: executedTools,
      };
    }

    // Intención 4: Categorización inteligente de transacciones con feedback loop
    if (
      textLower.includes("categoriz") ||
      textLower.includes("clasific") ||
      textLower.includes("en que categoria") ||
      textLower.includes("donde entra")
    ) {
      // Intentar extraer el término entre comillas o al final
      const cleanDesc = message
        .replace(/categoriz\w*/gi, "")
        .replace(/clasific\w*/gi, "")
        .replace(/en que categoria/gi, "")
        .replace(/donde entra/gi, "")
        .replace(/entra/gi, "")
        .replace(/['"¿?]/g, "")
        .trim();

      const term = cleanDesc.length > 2 ? cleanDesc : "Compra";
      const catResult = await this.aiToolsService.categorizeTransaction(
        userId,
        term,
      );

      executedTools.push({
        toolName: "categorize_transaction",
        args: { description: term },
        result: catResult,
      });

      let reply = `🏷️ **Clasificación sugerida para "${term}":**\n\n`;
      reply += `- Categoría propuesta: **${catResult.suggestedCategoryName}**\n`;
      reply += `- Confianza del modelo: **${Math.round(catResult.confidence * 100)}%**\n`;
      reply += `- Origen de la regla: ${catResult.source === "LEARNED_USER_RULE" ? "💡 **Regla aprendida de tus correcciones previas**" : "🔍 Patrón de conocimiento financiero"}\n\n`;
      reply += `Si confirmas o modificas esta categoría en tus transacciones, el asistente memorizará tu preferencia para todas las compras similares futuras.`;

      return {
        content: reply,
        toolExecutions: executedTools,
      };
    }

    // Intención 5: Alertas proactivas e insights
    if (
      textLower.includes("alerta") ||
      textLower.includes("anomalia") ||
      textLower.includes("desvio") ||
      textLower.includes("proactiv") ||
      textLower.includes("insights")
    ) {
      const insights = await this.aiToolsService.getProactiveInsights(userId);
      executedTools.push({
        toolName: "get_proactive_insights",
        args: {},
        result: { count: insights.length, insights },
      });

      if (insights.length === 0) {
        return {
          content: `✨ **Todo en orden:** No hemos detectado desvíos atípicos ni repuntes de gasto este mes frente a tu media histórica de 3 meses. ¡Excelente disciplina financiera!`,
          toolExecutions: executedTools,
        };
      }

      let reply = `🔔 **Insights y Alertas Financieras Proactivas:**\n\n`;
      for (const ins of insights) {
        let icon = "⚡";
        if (ins.type === "EXPENSE_SURGE") icon = "📈";
        else if (ins.type === "GOAL_PROGRESS") icon = "🎯";
        else if (ins.type === "BUDGET_WARNING") icon = "⚠️";

        reply += `- ${icon} **${ins.title}**: ${ins.description}\n`;
      }

      return {
        content: reply,
        toolExecutions: executedTools,
      };
    }

    // Intención 6: Estado de presupuestos
    if (
      textLower.includes("presupuesto") ||
      textLower.includes("pacing") ||
      textLower.includes("limite")
    ) {
      const budgetStatus = await this.aiToolsService.getBudgetStatus(
        userId,
        currentMonth,
        currentYear,
      );
      executedTools.push({
        toolName: "get_budget_status",
        args: { month: currentMonth, year: currentYear },
        result: { budgets: budgetStatus, count: budgetStatus.length },
      });

      if (budgetStatus.length === 0) {
        return {
          content: `No tienes presupuestos configurados para el mes ${currentMonth}/${currentYear}. Puedes definir presupuestos por categoría desde la sección de **Presupuestos** para monitorear tu ritmo de gasto.`,
          toolExecutions: executedTools,
        };
      }

      let reply = `📊 **Estado de tus Presupuestos (${currentMonth}/${currentYear}):**\n\n`;
      let alertCount = 0;

      for (const b of budgetStatus) {
        const spent = (b.spentCents / 100).toFixed(2).replace(".", ",");
        const limit = (b.limitCents / 100).toFixed(2).replace(".", ",");
        const remaining = (b.remainingCents / 100).toFixed(2).replace(".", ",");

        let statusEmoji = "🟢 En rango";
        if (b.status === "EXCEEDED") {
          statusEmoji = "🟠 Oportunidad de ajuste";
          alertCount++;
        } else if (b.status === "WARNING") {
          statusEmoji = "🟡 Atención preventiva";
          alertCount++;
        }

        reply += `- **${b.categoryName}**: ${spent} € gastados de ${limit} € (${b.percentageUsed}%) · Disponible: ${remaining} € (${statusEmoji})\n`;
      }

      if (alertCount > 0) {
        reply += `\n💡 Hay **${alertCount}** categoría(s) donde podemos aplicar pequeñas optimizaciones para no desviarnos del objetivo mensual.`;
      } else {
        reply += `\n✨ ¡Muy buen control! Todos tus presupuestos se encuentran dentro de los márgenes previstos.`;
      }

      return {
        content: reply,
        toolExecutions: executedTools,
      };
    }

    // Intención 7: Desglose de gastos por categoría
    if (
      textLower.includes("categoria") ||
      textLower.includes("restaurante") ||
      textLower.includes("comida") ||
      textLower.includes("ocio") ||
      textLower.includes("supermercado") ||
      textLower.includes("en que gasto") ||
      textLower.includes("desglose")
    ) {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const categories = await this.aiToolsService.getExpensesByCategory(
        userId,
        startDate,
        endDate,
      );
      executedTools.push({
        toolName: "get_expenses_by_category",
        args: { startDate, endDate },
        result: { categories, count: categories.length },
      });

      if (categories.length === 0) {
        return {
          content: `No se han registrado gastos en el periodo comprendido entre el 1 y el ${lastDay} del mes ${currentMonth}/${currentYear}.`,
          toolExecutions: executedTools,
        };
      }

      let reply = `🛒 **Desglose de Gastos por Categoría (${currentMonth}/${currentYear}):**\n\n`;
      for (const cat of categories.slice(0, 6)) {
        const amount = (cat.totalAmountCents / 100)
          .toFixed(2)
          .replace(".", ",");
        reply += `- **${cat.categoryName}**: ${amount} € (${cat.percentageOfTotal}% del total, ${cat.transactionCount} operaciones)\n`;
      }

      const totalCatSpent = categories.reduce(
        (sum, c) => sum + c.totalAmountCents,
        0,
      );
      const formattedTotal = (totalCatSpent / 100).toFixed(2).replace(".", ",");
      reply += `\n**Total gastos acumulados en el mes:** ${formattedTotal} €.`;

      return {
        content: reply,
        toolExecutions: executedTools,
      };
    }

    // =========================================================================
    // INTENCIÓN 8: GESTIÓN Y ASESORÍA DE DEUDAS (PASIVOS Y AMORTIZACIÓN)
    // =========================================================================
    const isDebtAmortizeIntent =
      /\b(?:amortiza|amortizar|abona|abonar|paga|pagar)\b/i.test(textLower) &&
      /\b(?:deuda|prestamo|credito|tarjeta|coche|hipoteca|capital)\b/i.test(
        textLower,
      );

    const isDebtCreateIntent =
      /\b(?:crea|crear|registra|registrar|anad(?:e|ir)|agreg(?:a|ar)|tengo|nuevo|nueva|dar de alta)\b/i.test(
        textLower,
      ) &&
      /\b(?:deuda|prestamo|hipoteca|credito|tarjeta revolving)\b/i.test(
        textLower,
      ) &&
      !isDebtAmortizeIntent;

    const isDebtSimulateIntent =
      (/\b(?:simula|simular|comparar|comparativa|avalancha|bola de nieve)\b/i.test(
        textLower,
      ) &&
        /\b(?:deuda|deudas|prestamo|amortizacion|acelerar)\b/i.test(
          textLower,
        )) ||
      textLower.includes("avalancha") ||
      textLower.includes("bola de nieve");

    const isDebtOptimizeIntent =
      /\b(?:como\s+(?:puedo\s+)?(?:salir|pagar|reducir)|optimiza(?:r)?|acelerar|plan\s+de\s+amortizacion)\b/i.test(
        textLower,
      ) && /\b(?:deudas?|prestamos?)\b/i.test(textLower);

    const isDebtConsultIntent =
      /\b(?:deudas|prestamos|pasivos|cuanto debo|que debo|mis deudas|mis prestamos|estado de mis deudas)\b/i.test(
        textLower,
      ) &&
      !isDebtCreateIntent &&
      !isDebtAmortizeIntent &&
      !isDebtSimulateIntent &&
      !isDebtOptimizeIntent;

    // A) Amortización de Deuda
    if (isDebtAmortizeIntent) {
      let amountEur = 0;
      const amountMatch =
        textLower.match(
          /(?:amortiza|abona|paga|pagar)?\s*([\d\.,]+)\s*(?:€|euros?|eur)\b/i,
        ) || textLower.match(/\b([\d\.,]+)\s*(?:€|euros?|eur)\b/i);
      if (amountMatch) {
        const raw = amountMatch[1].replace(/\./g, "").replace(",", ".");
        amountEur = parseFloat(raw);
      }

      if (amountEur <= 0) {
        return {
          content:
            "Para amortizar una deuda, por favor indícame el importe y el concepto. Por ejemplo: *'Amortiza 250 € a mi préstamo de coche desde la Cuenta Nómina'*.",
          toolExecutions: executedTools,
        };
      }

      let conceptKeyword = "";
      if (
        textLower.includes("coche") ||
        textLower.includes("auto") ||
        textLower.includes("vehiculo")
      ) {
        conceptKeyword = "coche";
      } else if (textLower.includes("tarjeta")) {
        conceptKeyword = "tarjeta";
      } else if (textLower.includes("hipoteca")) {
        conceptKeyword = "hipoteca";
      } else if (textLower.includes("personal")) {
        conceptKeyword = "personal";
      } else {
        const debtWordMatch = textLower.match(
          /(?:al|a la|a mi|del?)\s+(?:prestamo|deuda|credito)?\s*([a-záéíóúñ]+)/i,
        );
        if (debtWordMatch && debtWordMatch[1]) {
          conceptKeyword = debtWordMatch[1];
        }
      }

      let fromAccountName: string | undefined = undefined;
      const accMatch = textLower.match(
        /(?:desde|de la|con la|de mi)\s+cuenta\s+([a-záéíóúñ\s]+?)(?:$|\.|\,)/i,
      );
      if (accMatch && accMatch[1]) {
        fromAccountName = accMatch[1].trim();
      }

      try {
        const amortResult = await this.aiToolsService.amortizeDebt(userId, {
          conceptKeyword: conceptKeyword || undefined,
          amountEur,
          fromAccountName,
        });

        executedTools.push({
          toolName: "amortize_debt",
          args: { amountEur, conceptKeyword, fromAccountName },
          result: amortResult,
        });

        let msg = "";
        if (amortResult.isFullyPaid) {
          msg = `🏆 **¡ENHORABUENA! Deuda Liquidada al 100%:**\n\nHas amortizado la totalidad de tu deuda **"${amortResult.concept}"** con un abono final de **${amortResult.amountAmortizedEur.toFixed(2).replace(".", ",")} €**.\n\n🔒 **Inmutabilidad Activada:** El saldo es 0,00 €. La deuda ha pasado a estado \`PAID_OFF\` y ha quedado archivada de forma inmutable en tu historial financiero protegido. ¡Has eliminado un pasivo y sus intereses para siempre!`;
        } else {
          msg = `✅ **Amortización Aplicada con Éxito:**\n\n- **Deuda:** ${amortResult.concept}\n- **Importe Abonado:** ${amortResult.amountAmortizedEur.toFixed(2).replace(".", ",")} €\n  * Destinado a Reducción de Capital: **${amortResult.principalAmortizedEur.toFixed(2).replace(".", ",")} €**\n  * Destinado a Intereses Devengados: **${amortResult.interestCoveredEur.toFixed(2).replace(".", ",")} €**\n- **Nuevo Saldo Pendiente:** **${amortResult.remainingAmountEur.toFixed(2).replace(".", ",")} €**\n`;
          if (amortResult.accountDeducted) {
            msg += `- **Cuenta de Cargo:** ${amortResult.accountDeducted}\n`;
          }
        }

        return {
          content: msg,
          toolExecutions: executedTools,
        };
      } catch (err: any) {
        return {
          content: `⚠️ No pude completar la amortización: ${err.message || err}`,
          toolExecutions: executedTools,
        };
      }
    }

    // B) Alta de Deuda
    if (isDebtCreateIntent) {
      let amountEur = 0;
      const amountMatch = textLower.match(/([\d\.,]+)\s*(?:€|euros?|eur)/i);
      if (amountMatch) {
        const raw = amountMatch[1].replace(/\./g, "").replace(",", ".");
        amountEur = parseFloat(raw);
      }

      let interestRatePercent = 6.0;
      const rateMatch = textLower.match(/([\d\.,]+)\s*%/);
      if (rateMatch) {
        interestRatePercent = parseFloat(rateMatch[1].replace(",", "."));
      }

      const isMonthlyRate =
        textLower.includes("mensual") || textLower.includes("tin mensual");

      let concept = "Préstamo Personal";
      if (textLower.includes("coche") || textLower.includes("auto")) {
        concept = "Préstamo Coche";
      } else if (textLower.includes("tarjeta")) {
        concept = "Tarjeta de Crédito";
      } else if (textLower.includes("hipoteca")) {
        concept = "Hipoteca";
      }

      if (amountEur <= 0) {
        return {
          content:
            "Para registrar una nueva deuda o pasivo, indícame al menos el importe y el concepto. Por ejemplo: *'Registra un préstamo de coche de 12.000 € al 6% anual'*.",
          toolExecutions: executedTools,
        };
      }

      try {
        const debtResult = await this.aiToolsService.createDebt(userId, {
          concept,
          amountEur,
          interestRatePercent,
          interestRateType: isMonthlyRate ? "MONTHLY" : "ANNUAL",
        });

        executedTools.push({
          toolName: "create_debt",
          args: { concept, amountEur, interestRatePercent },
          result: debtResult,
        });

        return {
          content: `✅ **Nueva Deuda Registrada con Éxito:**\n\n- **Concepto:** ${debtResult.concept}\n- **Importe Inicial:** ${debtResult.initialAmountEur.toFixed(2).replace(".", ",")} €\n- **Tasa de Interés:** ${debtResult.interestRatePercent.toFixed(2).replace(".", ",")}% (${debtResult.interestRateType})\n- **Saldo Pendiente:** ${debtResult.remainingAmountEur.toFixed(2).replace(".", ",")} €\n\nPuedes consultar tus deudas en cualquier momento o solicitarme una simulación acelerada de amortización.`,
          toolExecutions: executedTools,
        };
      } catch (err: any) {
        return {
          content: `⚠️ No pude dar de alta la deuda: ${err.message || err}`,
          toolExecutions: executedTools,
        };
      }
    }

    // C) Simulación y Optimización de Deudas
    if (isDebtSimulateIntent || isDebtOptimizeIntent) {
      let extraMonthlyBudgetEur = 0;
      const extraMatch = textLower.match(/([\d\.,]+)\s*(?:€|euros?|eur)/i);
      if (extraMatch) {
        extraMonthlyBudgetEur = parseFloat(
          extraMatch[1].replace(/\./g, "").replace(",", "."),
        );
      }

      const isSnowball =
        textLower.includes("bola de nieve") || textLower.includes("snowball");

      if (extraMonthlyBudgetEur > 0) {
        const sim = await this.aiToolsService.simulateDebtPayoff(userId, {
          extraMonthlyBudgetEur,
          strategy: isSnowball ? "SNOWBALL" : "AVALANCHE",
        });

        executedTools.push({
          toolName: "simulate_debt_payoff",
          args: {
            extraMonthlyBudgetEur,
            strategy: isSnowball ? "SNOWBALL" : "AVALANCHE",
          },
          result: sim,
        });

        const stratName = isSnowball
          ? "Bola de Nieve (Snowball)"
          : "Avalancha Financiera (Avalanche)";
        const intSavedEur = (Number(sim.interestSavedCents) / 100)
          .toFixed(2)
          .replace(".", ",");
        const totalIntEur = (Number(sim.totalInterestPaidCents) / 100)
          .toFixed(2)
          .replace(".", ",");
        const baselineIntEur = (Number(sim.baselineInterestPaidCents) / 100)
          .toFixed(2)
          .replace(".", ",");

        return {
          content: `📈 **Simulación de Amortización Acelerada — ${stratName}:**\n\nSi destinas **${extraMonthlyBudgetEur.toFixed(2).replace(".", ",")} €/mes** adicionales a tus deudas:\n\n- ⏱️ **Ahorro de Tiempo:** Estarás 100% libre de deudas **${sim.monthsSaved} meses antes** (en ${sim.totalMonths} meses vs ${sim.baselineMonths} meses pactados).\n- 💰 **Ahorro en Intereses:** Te ahorrarás **${intSavedEur} €** en intereses devengados.\n- 💳 **Coste Total en Intereses:** Pagas ${totalIntEur} € en lugar de ${baselineIntEur} €.\n\n💡 *${isSnowball ? "La estrategia Bola de Nieve te permite liquidar primero las deudas más pequeñas para lograr victorias psicológicas tempranas." : "La estrategia Avalancha maximiza el ahorro matemático liquidando primero las deudas con mayor tipo de interés."}*`,
          toolExecutions: executedTools,
        };
      } else {
        const opt = await this.aiToolsService.analyzeDebtOptimization(userId);
        executedTools.push({
          toolName: "analyze_debt_optimization",
          args: {},
          result: opt,
        });

        if (!opt.hasDebts) {
          return {
            content: `🎉 **¡Salud Financiera Ejemplar!**\n\n${opt.message}`,
            toolExecutions: executedTools,
          };
        }

        const cutEur = opt
          .suggestedReallocation!.suggestedMonthlyCutEur.toFixed(2)
          .replace(".", ",");
        const catName = opt.suggestedReallocation!.sourceCategoryName;
        const currentSpend = opt
          .suggestedReallocation!.currentMonthlySpendEur.toFixed(2)
          .replace(".", ",");
        const intSaved = opt
          .simulation!.interestSavedEur.toFixed(2)
          .replace(".", ",");

        return {
          content: `💡 **Plan de Optimización Financiera de Pasivos:**\n\nExaminando tu historial reciente de gastos, detecto una oportunidad para liquidar tus deudas más rápido:\n\n- 🎯 **Partida Prescindible Identificada:** Gastas una media de **${currentSpend} €/mes** en **${catName}**.\n- ✂️ **Ajuste Recomendado:** Si reduces un pequeño porcentaje y reasignas **${cutEur} €/mes** a la amortización acelerada de tus deudas:\n  * ⏱️ Te liberarás de tus deudas **${opt.simulation!.monthsSaved} meses antes** (en solo ${opt.simulation!.totalMonthsToFreedom} meses).\n  * 💰 Ahorrarás **${intSaved} €** directamente en intereses no pagados a entidades bancarias.\n  * 🛡️ Estrategia: **Avalancha** (amortizando primero los tipos de interés más elevados).\n\n¿Quieres que preparemos un ajuste en tu presupuesto de **${catName}** para activar este plan de ahorro?`,
          toolExecutions: executedTools,
        };
      }
    }

    // D) Consulta de Deudas Activas / Historial
    if (isDebtConsultIntent) {
      const includePaidOff =
        textLower.includes("historial") ||
        textLower.includes("pagad") ||
        textLower.includes("liquidad");
      const debtsData = await this.aiToolsService.getDebts(
        userId,
        includePaidOff,
      );

      executedTools.push({
        toolName: "get_debts",
        args: { includePaidOff },
        result: debtsData,
      });

      if (debtsData.activeDebts.length === 0) {
        if (debtsData.paidOffDebts.length > 0) {
          return {
            content: `🎉 **¡No tienes deudas activas!**\n\nTus finanzas están completamente libres de pasivos vivos. En tu historial inmutable tienes registradas **${debtsData.paidOffDebts.length}** deuda(s) totalmente liquidadas al 100%.`,
            toolExecutions: executedTools,
          };
        }
        return {
          content: `🎉 **¡Salud Financiera Óptima!**\n\nNo tienes ninguna deuda o pasivo activo registrado en este momento. Todos tus activos están limpios de compromisos crediticios.`,
          toolExecutions: executedTools,
        };
      }

      let reply = `📋 **Tus Deudas y Pasivos Financieros Activos:**\n\n`;
      for (const d of debtsData.activeDebts) {
        const remainingEur = d.remainingAmountEur.toFixed(2).replace(".", ",");
        const initialEur = d.initialAmountEur.toFixed(2).replace(".", ",");
        const rateFormatted = d.interestRatePercent
          .toFixed(2)
          .replace(".", ",");
        const quotaFormatted = d.minimumMonthlyPaymentEur
          ? `${d.minimumMonthlyPaymentEur.toFixed(2).replace(".", ",")} €`
          : "Flexible";
        const interestCostFormatted = d.monthlyInterestCostEur
          ? `${d.monthlyInterestCostEur.toFixed(2).replace(".", ",")} €/mes`
          : "0,00 €/mes";

        reply += `- **${d.concept}**${d.creditor ? " (" + d.creditor + ")" : ""}:\n`;
        reply += `  * Saldo vivo: **${remainingEur} €** (Inicial: ${initialEur} €)\n`;
        reply += `  * Tipo de interés: **${rateFormatted}%** (${d.interestRateType})\n`;
        reply += `  * Cuota mensual: ${quotaFormatted} | Coste mensual en intereses: ~**${interestCostFormatted}**\n\n`;
      }

      reply += `📊 **Resumen Consolidado:**\n`;
      reply += `- 🔴 **Pasivo Total Pendiente:** ${debtsData.summary.totalRemainingEur.toFixed(2).replace(".", ",")} €\n`;
      reply += `- 📅 **Compromiso Mensual de Cuotas:** ${debtsData.summary.totalMonthlyCommitmentEur.toFixed(2).replace(".", ",")} €\n`;
      reply += `- 💸 **Coste Mensual en Intereses:** ${debtsData.summary.totalMonthlyInterestCostEur.toFixed(2).replace(".", ",")} €\n`;
      reply += `- ⚖️ **Tipo de Interés Medio Ponderado:** ${debtsData.summary.averageInterestRatePercent.toFixed(2).replace(".", ",")}% TAE\n\n`;
      reply += `💡 Puedes decirme *"Amortiza X € a mi préstamo Y"* o *"¿Cómo optimizar mis deudas?"* para acelerar su liquidación.`;

      return {
        content: reply,
        toolExecutions: executedTools,
      };
    }

    // Intención 8.5: Resumen general financiero / ahorro
    if (
      textLower.includes("resumen") ||
      textLower.includes("ahorro") ||
      textLower.includes("ingreso") ||
      textLower.includes("gasto") ||
      textLower.includes("cuanto") ||
      textLower.includes("balance")
    ) {
      const summary = await this.aiToolsService.getFinancialSummary(
        userId,
        currentMonth,
        currentYear,
      );
      executedTools.push({
        toolName: "get_financial_summary",
        args: { month: currentMonth, year: currentYear },
        result: summary,
      });

      const income = (summary.totalIncomeCents / 100)
        .toFixed(2)
        .replace(".", ",");
      const expense = (summary.totalExpenseCents / 100)
        .toFixed(2)
        .replace(".", ",");
      const savings = (summary.netSavingsCents / 100)
        .toFixed(2)
        .replace(".", ",");

      let reply = `📈 **Resumen Financiero del Mes (${currentMonth}/${currentYear}):**\n\n`;
      reply += `- 🟢 **Ingresos Totales:** ${income} €\n`;
      reply += `- 🔴 **Gastos Totales:** ${expense} €\n`;
      reply += `- 💰 **Ahorro Neto:** ${savings} €\n`;
      reply += `- 📊 **Tasa de Ahorro:** ${summary.savingsRatePercent}%\n`;
      reply += `- 📑 **Movimientos registrados:** ${summary.transactionCount}\n\n`;

      if (summary.netSavingsCents > 0) {
        reply += `¡Gran trabajo! Mantienes un balance positivo. Puedes decirme *"Quiero ahorrar X en Y meses"* para vincular este excedente a tus metas.`;
      } else if (summary.netSavingsCents < 0) {
        reply += `Veo una oportunidad de equilibrar los gastos este mes. Pregúntame por un plan para recortar en partidas variables.`;
      } else {
        reply += `Tus ingresos y gastos están nivelados en este periodo.`;
      }

      return {
        content: reply,
        toolExecutions: executedTools,
      };
    }

    // Intención 9: Solicitar recomendaciones
    if (
      textLower.includes("recomienda") ||
      textLower.includes("consejo") ||
      textLower.includes("optimizar") ||
      textLower.includes("propuesta")
    ) {
      const summary = await this.aiToolsService.getFinancialSummary(
        userId,
        currentMonth,
        currentYear,
      );
      const budgetStatus = await this.aiToolsService.getBudgetStatus(
        userId,
        currentMonth,
        currentYear,
      );

      executedTools.push({
        toolName: "get_financial_summary",
        args: { month: currentMonth, year: currentYear },
        result: summary,
      });

      let recCreated = null;
      if (summary.netSavingsCents > 5000) {
        const boostAmountCents = Math.min(summary.netSavingsCents * 0.5, 10000);
        const boostEur = (boostAmountCents / 100).toFixed(2).replace(".", ",");
        recCreated = await this.aiToolsService.proposeRecommendation(
          userId,
          "SAVINGS_BOOST",
          `Aporte extraordinario de ${boostEur} € a tu meta principal`,
          `Dado que dispones de un ahorro neto de ${(summary.netSavingsCents / 100).toFixed(2).replace(".", ",")} € en ${currentMonth}/${currentYear}, te proponemos destinar ${boostEur} € para acelerar el cumplimiento de tus objetivos.`,
          {
            actionType: "SAVINGS_CONTRIBUTION",
            amountCents: boostAmountCents,
          },
        );
      } else if (budgetStatus.some((b) => b.status === "EXCEEDED")) {
        const exceeded = budgetStatus.find((b) => b.status === "EXCEEDED")!;
        recCreated = await this.aiToolsService.proposeRecommendation(
          userId,
          "BUDGET_ADJUSTMENT",
          `Ajuste de presupuesto en ${exceeded.categoryName}`,
          `Has superado el límite previsto en ${exceeded.categoryName}. Te proponemos recalibrar el límite para mantener el control sin bloquear gastos esenciales.`,
          {
            actionType: "UPDATE_BUDGET_LIMIT",
            budgetId: exceeded.budgetId,
            newLimitCents: Math.round(exceeded.spentCents * 1.15),
          },
        );
      }

      if (recCreated) {
        executedTools.push({
          toolName: "propose_recommendation",
          args: { recommendationId: recCreated.recommendationId },
          result: recCreated,
        });

        return {
          content: `💡 He generado una propuesta personalizada: **"${recCreated.title}"**.\n\nBajo el principio de supervisión humana (*human-in-the-loop*), ningún cambio se aplica automáticamente. Puedes revisarla y pulsar **[Aprobar y Aplicar]** en el panel lateral de recomendaciones.`,
          toolExecutions: executedTools,
        };
      }

      return {
        content: `He analizado tus finanzas del mes actual (${currentMonth}/${currentYear}). Tu balance neto es de ${(summary.netSavingsCents / 100).toFixed(2).replace(".", ",")} €. En este momento tus métricas se mantienen estables. ¡Sigue así!`,
        toolExecutions: executedTools,
      };
    }

    // Saludo o respuesta general enriquecida con memoria a corto plazo (historial) y largo plazo (perfil)
    const profile = await this.financialProfileService.getProfile(userId);
    const hasPriorDialogue = history.length > 1;

    let greeting = hasPriorDialogue
      ? `Seguimos conversando. Basándome en nuestro diálogo reciente y tus datos financieros actuales (saldo de **${profile.totalBalanceEur} €** y **${profile.activeGoalsCount}** meta(s) activas):\n\n`
      : `Hola, soy **FinanZIA Advisor**, tu asistente de finanzas personales asistido por datos 100% verificados.\n\n` +
        `Actualmente tienes un saldo consolidado de **${profile.totalBalanceEur} €** y **${profile.activeGoalsCount}** meta(s) de ahorro activa(s).\n\n`;

    greeting += `¿En qué te puedo ayudar hoy?\n`;
    greeting += `- 🎯 **Planificar un objetivo**: *"Quiero ahorrar 5.000€ en 8 meses"*\n`;
    greeting += `- 💳 **Consultar saldos**: *"¿Cuánto dinero tengo en mis cuentas?"*\n`;
    greeting += `- 🏷️ **Clasificar gastos**: *"¿En qué categoría entra Decathlon?"*\n`;
    greeting += `- 🔔 **Alertas e insights**: *"¿Hay algún desvío o alerta este mes?"*\n`;
    greeting += `- 📊 **Presupuestos y categorías**: *"¿Cómo va mi presupuesto de ocio?"*`;

    return {
      content: greeting,
      toolExecutions: [],
    };
  }
}
