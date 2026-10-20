import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  IFinancialAnalyticsPort,
  FINANCIAL_ANALYTICS_PORT,
} from "../ports/financial-analytics.port";
import {
  HistoricalBaselineResult,
  MultiStepSavingsPlanResult,
  PlanCategoryCutSuggestion,
} from "./ai-tools.service";

@Injectable()
export class MultiStepPlannerService {
  private readonly logger = new Logger(MultiStepPlannerService.name);

  constructor(
    @Inject(FINANCIAL_ANALYTICS_PORT)
    private readonly analytics: IFinancialAnalyticsPort,
  ) {}

  /**
   * Planificación multi-paso determinista:
   * Descompone un objetivo de ahorro, analiza la capacidad real de los últimos 3 meses,
   * detecta la brecha y propone recortes proporcionales únicamente en gastos variables/discrecionales.
   */
  async calculateGoalPlan(
    userId: string,
    targetAmountCents: number,
    months: number,
    goalName = "Meta de Ahorro",
  ): Promise<MultiStepSavingsPlanResult> {
    const validMonths = Math.max(1, Math.min(months, 120));
    const targetCents = Math.max(100, Math.round(targetAmountCents));
    const monthlyQuotaCents = Math.ceil(targetCents / validMonths);

    this.logger.log(
      `[Planner] Calculando plan para usuario ${userId}: ${targetCents} céntimos en ${validMonths} meses (${monthlyQuotaCents} céntimos/mes)`,
    );

    const norm = (s: string) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const normalizedGoalName = norm(goalName);

    // 1. REGLA ANTI-DUPLICADOS: Verificar si ya existe una meta con las mismas o muy similares características
    const existingGoals = (await this.analytics.getSavingsGoals(userId)) || [];

    const KEYWORDS = [
      "vacaci",
      "viaje",
      "coche",
      "auto",
      "emergencia",
      "boda",
      "casa",
      "piso",
      "iphone",
      "moto",
      "reforma",
      "estudios",
      "master",
    ];
    const matchedKeyword = KEYWORDS.find((kw) =>
      normalizedGoalName.includes(kw),
    );

    const duplicateGoal = existingGoals.find((g) => {
      const gNorm = norm(g.name);
      const sameConcept =
        gNorm === normalizedGoalName ||
        (matchedKeyword && gNorm.includes(matchedKeyword)) ||
        gNorm.includes(normalizedGoalName) ||
        normalizedGoalName.includes(gNorm);

      const amountRatio =
        Math.abs(g.targetAmountCents - targetCents) / targetCents;
      const similarAmount = amountRatio <= 0.15;

      return sameConcept && similarAmount;
    });

    const formatEur = (cents: number) => {
      const parts = (cents / 100).toFixed(2).split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return parts.join(",");
    };

    if (duplicateGoal) {
      const existingTargetEur = formatEur(duplicateGoal.targetAmountCents);
      const existingCurEur = formatEur(duplicateGoal.currentAmountCents);

      const duplicateSummary = `⚠️ **Meta de Ahorro ya existente detectada:**\n\nYa cuentas con una meta de ahorro activa con características idénticas o muy similares: **"${duplicateGoal.name}"** (Objetivo: **${existingTargetEur} €**, Acumulado actual: **${existingCurEur} €** · **${duplicateGoal.progressPercent}%** completado).\n\nPara mantener una planificación financiera coherente y evitar fragmentar tus fondos en metas duplicadas, no se recomienda crear una nueva meta con las mismas características. Puedes realizar aportaciones extraordinarias a tu meta existente o ajustar su importe objetivo.`;

      return {
        goalName,
        targetAmountCents: targetCents,
        months: validMonths,
        monthlyQuotaCents,
        averageNetSavingsCents: 0,
        gapCents: 0,
        isViableWithCurrentSavings: false,
        suggestedCuts: [],
        summary: duplicateSummary,
        recommendationId: undefined,
        isDuplicate: true,
      };
    }

    // 2. CONTEXTO HOLÍSTICO Y DEUDAS ACTIVAS:
    // Evaluar si el usuario tiene deudas pendientes antes de recomendar metas de ocio/discrecionales
    const debtsOverview = this.analytics.getActiveDebtsSummary
      ? await this.analytics.getActiveDebtsSummary(userId)
      : {
          totalRemainingCents: 0,
          totalMonthlyPaymentCents: 0,
          activeDebtsCount: 0,
          debts: [],
        };

    const isDiscretionaryGoal =
      !normalizedGoalName.includes("emergencia") &&
      !normalizedGoalName.includes("salud") &&
      !normalizedGoalName.includes("deuda") &&
      !normalizedGoalName.includes("amortiz");

    const hasSignificantDebt = debtsOverview.totalRemainingCents > 0;

    if (hasSignificantDebt && isDiscretionaryGoal) {
      const totalDebtEur = formatEur(debtsOverview.totalRemainingCents);
      const debtsList = debtsOverview.debts
        .map(
          (d) =>
            `- **${d.concept}**${d.creditor ? " (" + d.creditor + ")" : ""}: ${formatEur(d.remainingAmountCents)} € pendientes`,
        )
        .join("\n");

      const debtSummary = `⚠️ **Conflicto de Prioridad Financiera — Deudas Activas Pendientes:**\n\nHe analizado tu contexto financiero global: actualmente tienes **${totalDebtEur} €** en deudas activas pendientes:\n${debtsList}\n\n💡 **Criterio de Salud Financiera:** No es recomendable iniciar ni recomendar una meta de ahorro para gastos discrecionales o de ocio como **"${goalName}"** mientras mantengas préstamos o pagos en cuotas activos (como deudas de vehículo o financiación de dispositivos como teléfonos u ordenadores). Cada euro destinado a amortizar deuda genera un ahorro garantizado al eliminar costes en intereses.\n\nTe recomiendo enfocar tu capacidad de ahorro en liquidar estas deudas mediante un plan acelerado (Avalancha o Bola de Nieve) o consolidar un fondo de emergencia de seguridad antes de planificar gastos de ocio.`;

      return {
        goalName,
        targetAmountCents: targetCents,
        months: validMonths,
        monthlyQuotaCents,
        averageNetSavingsCents: 0,
        gapCents: 0,
        isViableWithCurrentSavings: false,
        suggestedCuts: [],
        summary: debtSummary,
        recommendationId: undefined,
        hasDebtConflict: true,
      };
    }

    const baseline: HistoricalBaselineResult =
      await this.analytics.getHistoricalBaseline(userId);

    const averageNetSavings = baseline.averageMonthlyNetSavingsCents;
    const gapCents = Math.max(0, monthlyQuotaCents - averageNetSavings);
    const isViableWithCurrentSavings = gapCents === 0;

    const suggestedCuts: PlanCategoryCutSuggestion[] = [];

    if (
      !isViableWithCurrentSavings &&
      baseline.topVariableCategories.length > 0
    ) {
      let remainingGapToCover = gapCents;

      for (const cat of baseline.topVariableCategories) {
        if (remainingGapToCover <= 0) break;
        if (cat.monthlyAverageCents <= 500) continue; // Si gasta menos de 5€ al mes, no recortar

        // Proponer recortar hasta un 30% del gasto medio en esa categoría variable
        const maxCutForCategory = Math.round(cat.monthlyAverageCents * 0.3);
        const actualCut = Math.min(maxCutForCategory, remainingGapToCover);

        if (actualCut > 0) {
          remainingGapToCover -= actualCut;
          const newTarget = cat.monthlyAverageCents - actualCut;

          const currentEur = (cat.monthlyAverageCents / 100)
            .toFixed(2)
            .replace(".", ",");
          const cutEur = (actualCut / 100).toFixed(2).replace(".", ",");
          const newTargetEur = (newTarget / 100).toFixed(2).replace(".", ",");

          suggestedCuts.push({
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            currentMonthlyAverageCents: cat.monthlyAverageCents,
            suggestedCutCents: actualCut,
            newMonthlyTargetCents: newTarget,
            reason: `Gasto medio de ${currentEur} €/mes en ${cat.categoryName}. Ajustando un ahorro de ${cutEur} € (nuevo objetivo: ${newTargetEur} €/mes) liberas capital sin comprometer necesidades básicas.`,
          });
        }
      }
    }

    const quotaEur = (monthlyQuotaCents / 100).toFixed(2).replace(".", ",");
    const targetEur = (targetCents / 100).toFixed(2).replace(".", ",");
    const savingsEur = (averageNetSavings / 100).toFixed(2).replace(".", ",");
    const gapEur = (gapCents / 100).toFixed(2).replace(".", ",");

    let summary = `🎯 **Plan de Ahorro para "${goalName}" (${targetEur} € en ${validMonths} meses):**\n\n`;
    summary += `1. **Cuota mensual necesaria:** ${quotaEur} €/mes.\n`;
    summary += `2. **Capacidad de ahorro actual:** Tu media neta mensual en los últimos meses es de ${savingsEur} €/mes.\n`;

    if (isViableWithCurrentSavings) {
      summary += `3. **Diagnóstico de viabilidad:** ✅ ¡Tu tasa de ahorro actual es suficiente! Manteniendo tus hábitos actuales alcanzarás el objetivo en el plazo previsto.\n`;
    } else {
      summary += `3. **Diagnóstico de viabilidad:** ⚠️ Se detecta una brecha de ${gapEur} €/mes entre tu ahorro actual y la cuota requerida.\n`;
      summary += `4. **Estrategia en gastos variables:**\n`;
      for (const cut of suggestedCuts) {
        const cutEur = (cut.suggestedCutCents / 100)
          .toFixed(2)
          .replace(".", ",");
        summary += `   - **${cut.categoryName}**: Reducir ${cutEur} €/mes (${cut.reason})\n`;
      }
    }

    // Registrar propuesta de recomendación formal (Human-in-the-Loop)
    let recommendationId: string | undefined;
    try {
      const rec = await this.analytics.proposeRecommendation(
        userId,
        "GOAL_CREATION",
        `Crear meta "${goalName}" de ${targetEur} € en ${validMonths} meses`,
        `Plan planificado: cuota mensual de ${quotaEur} €/mes. ${isViableWithCurrentSavings ? "Completamente viable con tu capacidad de ahorro actual." : `Requiere optimizar ${gapEur} €/mes en categorías variables.`}`,
        {
          actionType: "CREATE_SAVINGS_GOAL",
          goalName,
          targetAmountCents: targetCents,
          targetMonths: validMonths,
          monthlyQuotaCents,
          targetDate: new Date(
            Date.now() + validMonths * 30.44 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      );
      recommendationId = rec.recommendationId;
    } catch (e) {
      this.logger.warn(`No se pudo crear la recomendación para el plan: ${e}`);
    }

    return {
      goalName,
      targetAmountCents: targetCents,
      months: validMonths,
      monthlyQuotaCents,
      averageNetSavingsCents: averageNetSavings,
      gapCents,
      isViableWithCurrentSavings,
      suggestedCuts,
      summary,
      recommendationId,
    };
  }
}
