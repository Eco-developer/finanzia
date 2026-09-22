import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI, Type } from "@google/genai";
import { AiToolsService } from "../../core/application/ai/ai-tools.service";
import { FinancialProfileService } from "../../core/application/ai/financial-profile.service";
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
4. NUNCA apliques cambios en la base de datos por iniciativa propia. Si detectas una oportunidad de ahorro o creación de meta, debes invocar la herramienta 'propose_recommendation' o 'calculate_savings_plan' para que el usuario pueda revisarla y aprobarla voluntariamente en su interfaz (Human-in-the-Loop).
5. DIFERENCIACIÓN FINANCIERA ESTRICTA: Diferencia siempre entre gastos fijos esenciales (vivienda, suministros, salud, impuestos) y gastos variables o discrecionales (restaurantes, ocio, compras). Cuando propongas recortes, hazlo ÚNICAMENTE sobre gastos variables, jamás sobre obligaciones fijas.
6. TONO Y EMPATÍA: Sé siempre empático, motivador, no juzgón y constructivo. Las finanzas pueden generar estrés; nunca digas "has gastado demasiado" o "tu control es malo", sino "veo una oportunidad de ahorro aquí" o "podemos ajustar este apartado".
7. CUMPLIMIENTO REGULATORIO: NO eres un asesor financiero regulado bajo MiFID II ni CNMV. No recomiendes productos de inversión específicos ni prometas rentabilidades garantizadas. Incluye siempre una actitud prudente de educación financiera.`;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiToolsService: AiToolsService,
    @Inject(forwardRef(() => FinancialProfileService))
    private readonly financialProfileService: FinancialProfileService,
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

    // Intención 8: Resumen general financiero / ahorro
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
