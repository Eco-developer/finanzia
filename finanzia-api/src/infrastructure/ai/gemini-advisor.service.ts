import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI, Type } from "@google/genai";
import { AiToolsService } from "../../core/application/ai/ai-tools.service";
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

  private readonly systemInstruction = `Eres FinanZIA Advisor, el asistente inteligente de finanzas personales de la plataforma FinanZIA.

TUS PRINCIPIOS INNEGOCIABLES SON:
1. NUNCA inventes cifras, saldos, importes, transacciones ni fechas. Si necesitas conocer cualquier dato del usuario para responder, DEBES invocar la herramienta correspondiente antes de emitir tu respuesta.
2. Si una herramienta devuelve 0 resultados o no hay transacciones para un periodo, infórmalo con total claridad. No asumas gastos no registrados.
3. Todos los importes en las herramientas se expresan en CÉNTIMOS ENTEROS (ejemplo: 1250 céntimos = 12,50 €). Siempre debes formatear las cifras para el usuario en euros legibles con dos decimales (ejemplo: 12,50 €) utilizando coma como separador decimal.
4. NUNCA apliques cambios en la base de datos por iniciativa propia. Si detectas una oportunidad de ahorro o un desvío presupuestario, debes invocar la herramienta 'propose_recommendation' para que el usuario pueda revisarla y aprobarla manualmente en su interfaz.
5. Sé conciso, empático, profesional y constructivo. Prioriza la claridad financiera y la educación sobre el ahorro responsable.`;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiToolsService: AiToolsService,
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
        return await this.executeLocalFallback(userId, message);
      }
    }

    return await this.executeLocalFallback(userId, message);
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
              "Consulta el estado de ejecución de los presupuestos del usuario para un mes y año.",
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
            name: "propose_recommendation",
            description:
              "Registra una propuesta de ajuste presupuestario o meta que requiere aprobación humana obligatoria.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description:
                    "Tipo: BUDGET_ADJUSTMENT, SAVINGS_BOOST, o EXPENSE_ALERT",
                },
                title: {
                  type: Type.STRING,
                  description: "Título claro y conciso",
                },
                details: {
                  type: Type.STRING,
                  description: "Explicación detallada y beneficio",
                },
                actionPayload: {
                  type: Type.OBJECT,
                  description:
                    "Datos estructurados de la acción a ejecutar tras aprobación",
                },
              },
              required: ["type", "title", "details", "actionPayload"],
            },
          },
        ],
      },
    ];

    const contents: any[] = [];
    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === "USER" ? "user" : "model",
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
        systemInstruction: this.systemInstruction,
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

    // Procesar Function Calls
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

    // Segunda vuelta a Gemini con los resultados verificados
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
        systemInstruction: this.systemInstruction,
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
   * Analiza la intención de la consulta, ejecuta las herramientas SQL de PostgreSQL
   * y formatea la respuesta en euros con cero floats y estricta verificación.
   */
  private async executeLocalFallback(
    userId: string,
    message: string,
  ): Promise<AdvisorExecutionResult> {
    const textLower = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const executedTools: ToolCallExecution[] = [];

    // Intención 1: Estado de presupuestos / alertas de gasto
    if (
      textLower.includes("presupuesto") ||
      textLower.includes("pacing") ||
      textLower.includes("limite") ||
      textLower.includes("desvio")
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

        let statusEmoji = "🟢";
        if (b.status === "EXCEEDED") {
          statusEmoji = "🔴 **SUPERADO**";
          alertCount++;
        } else if (b.status === "WARNING") {
          statusEmoji = "🟡 **ALERTA**";
          alertCount++;
        }

        reply += `- **${b.categoryName}**: ${spent} € gastados de ${limit} € (${b.percentageUsed}%) · Disponible: ${remaining} € ${statusEmoji}\n`;
      }

      if (alertCount > 0) {
        reply += `\n⚠️ Tienes **${alertCount}** categoría(s) en zona de riesgo o límite superado. Te sugiero revisar los gastos recientes para evitar desviaciones mayores.`;
      } else {
        reply += `\n✨ ¡Excelente control! Todos tus presupuestos se encuentran dentro de los márgenes previstos.`;
      }

      return {
        content: reply,
        toolExecutions: executedTools,
      };
    }

    // Intención 2: Desglose de gastos por categoría
    if (
      textLower.includes("categoria") ||
      textLower.includes("restaurante") ||
      textLower.includes("comida") ||
      textLower.includes("ocio") ||
      textLower.includes("supermercado") ||
      textLower.includes("en que") ||
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

    // Intención 3: Resumen general financiero / ahorro / ingresos y gastos
    if (
      textLower.includes("resumen") ||
      textLower.includes("ahorro") ||
      textLower.includes("ingreso") ||
      textLower.includes("gasto") ||
      textLower.includes("cuanto") ||
      textLower.includes("saldo") ||
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
        reply += `¡Buen trabajo! Mantienes un balance positivo este mes. Si deseas maximizar este excedente, pregúntame por propuestas de aporte a tus metas de ahorro.`;
      } else if (summary.netSavingsCents < 0) {
        reply += `⚠️ Tus gastos superan a tus ingresos en este periodo. Te recomiendo revisar los desgloses por categoría para identificar posibles fugas de capital.`;
      } else {
        reply += `Tus ingresos y gastos están igualados en este periodo.`;
      }

      return {
        content: reply,
        toolExecutions: executedTools,
      };
    }

    // Intención 4: Solicitar recomendaciones / consejos de optimización
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
      executedTools.push({
        toolName: "get_budget_status",
        args: { month: currentMonth, year: currentYear },
        result: { count: budgetStatus.length },
      });

      let recCreated = null;
      if (summary.netSavingsCents > 5000) {
        // Proponer recomendación extraordinaria de ahorro
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
          `Has superado el límite en ${exceeded.categoryName}. Te proponemos recalibrar el límite para mantener el control sin bloquear gastos esenciales.`,
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
          content: `💡 He generado una propuesta personalizada: **"${recCreated.title}"**.\n\nRecuerda que bajo el principio de supervisión humana (*human-in-the-loop*), ningún cambio se aplica automáticamente. Puedes revisarla y hacer clic en **[Aprobar y Aplicar]** en el panel lateral de recomendaciones.`,
          toolExecutions: executedTools,
        };
      }

      return {
        content: `He analizado tus finanzas del mes actual (${currentMonth}/${currentYear}). Tu balance neto es de ${(summary.netSavingsCents / 100).toFixed(2).replace(".", ",")} €. En este momento no se detectan desviaciones críticas que requieran ajustes inmediatos. ¡Sigue así!`,
        toolExecutions: executedTools,
      };
    }

    // Saludo / Consulta general
    return {
      content: `Hola, soy **FinanZIA Advisor**, tu asistente inteligente con principio de **cero alucinaciones**.\n\nPuedo ayudarte con datos 100% verificados directamente de tu cuenta:\n- 📊 Consultar el **resumen financiero** de este mes o meses anteriores.\n- 🛒 Ver el **desglose de gastos por categoría** (supermercado, ocio, suministros...).\n- 🎯 Comprobar el **ritmo de ejecución de tus presupuestos**.\n- 💡 Proponer **recomendaciones de ahorro y ajustes** que podrás aprobar con un solo clic.\n\n¿Qué te gustaría analizar hoy?`,
      toolExecutions: [],
    };
  }
}
