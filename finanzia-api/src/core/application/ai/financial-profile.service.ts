import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  IFinancialAnalyticsPort,
  FINANCIAL_ANALYTICS_PORT,
} from "../ports/financial-analytics.port";

export interface UserFinancialProfile {
  totalBalanceCents: number;
  totalBalanceEur: string;
  accountsCount: number;
  activeGoalsCount: number;
  goals: Array<{
    name: string;
    progressPercent: number;
    currentEur: string;
    targetEur: string;
    isCompleted: boolean;
  }>;
  debtsOverview: {
    totalRemainingEur: string;
    totalMonthlyPaymentEur: string;
    activeDebtsCount: number;
    debts: Array<{
      concept: string;
      creditor: string | null;
      remainingEur: string;
      quotaEur: string;
      ratePercent: number;
    }>;
  };
  baseline: {
    monthlyIncomeEur: string;
    monthlyFixedExpensesEur: string;
    monthlyVariableExpensesEur: string;
    monthlyTotalExpensesEur: string;
    monthlyNetSavingsEur: string;
    savingsRatePercent: number;
  };
  budgetsUnderRisk: Array<{
    categoryName: string;
    percentageUsed: number;
    status: string;
  }>;
}

@Injectable()
export class FinancialProfileService {
  private readonly logger = new Logger(FinancialProfileService.name);

  constructor(
    @Inject(FINANCIAL_ANALYTICS_PORT)
    private readonly analytics: IFinancialAnalyticsPort,
  ) {}

  /**
   * Obtiene y compila el perfil financiero del usuario (Memoria a largo plazo)
   */
  async getProfile(userId: string): Promise<UserFinancialProfile> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [balances, goals, baseline, budgets, debtsOverview] =
      await Promise.all([
        this.analytics.getAccountBalances(userId),
        this.analytics.getSavingsGoals(userId),
        this.analytics.getHistoricalBaseline(userId),
        this.analytics.getBudgetStatus(userId, currentMonth, currentYear),
        this.analytics.getActiveDebtsSummary
          ? this.analytics.getActiveDebtsSummary(userId)
          : Promise.resolve({
              totalRemainingCents: 0,
              totalMonthlyPaymentCents: 0,
              activeDebtsCount: 0,
              debts: [],
            }),
      ]);

    const totalBalanceEur = (balances.totalBalanceCents / 100)
      .toFixed(2)
      .replace(".", ",");

    const formattedGoals = goals.map((g) => ({
      name: g.name,
      progressPercent: g.progressPercent,
      currentEur: (g.currentAmountCents / 100).toFixed(2).replace(".", ","),
      targetEur: (g.targetAmountCents / 100).toFixed(2).replace(".", ","),
      isCompleted: g.isCompleted,
    }));

    const formattedDebts = debtsOverview.debts.map((d) => ({
      concept: d.concept,
      creditor: d.creditor,
      remainingEur: (d.remainingAmountCents / 100).toFixed(2).replace(".", ","),
      quotaEur: d.minimumMonthlyPaymentCents
        ? (d.minimumMonthlyPaymentCents / 100).toFixed(2).replace(".", ",")
        : "Flexible",
      ratePercent: Number((d.interestRateBasisPts / 100).toFixed(2)),
    }));

    const budgetsUnderRisk = budgets
      .filter((b) => b.status === "WARNING" || b.status === "EXCEEDED")
      .map((b) => ({
        categoryName: b.categoryName,
        percentageUsed: b.percentageUsed,
        status: b.status,
      }));

    return {
      totalBalanceCents: balances.totalBalanceCents,
      totalBalanceEur,
      accountsCount: balances.accounts.length,
      activeGoalsCount: goals.filter((g) => !g.isCompleted).length,
      goals: formattedGoals,
      debtsOverview: {
        totalRemainingEur: (debtsOverview.totalRemainingCents / 100)
          .toFixed(2)
          .replace(".", ","),
        totalMonthlyPaymentEur: (debtsOverview.totalMonthlyPaymentCents / 100)
          .toFixed(2)
          .replace(".", ","),
        activeDebtsCount: debtsOverview.activeDebtsCount,
        debts: formattedDebts,
      },
      baseline: {
        monthlyIncomeEur: (baseline.averageMonthlyIncomeCents / 100)
          .toFixed(2)
          .replace(".", ","),
        monthlyFixedExpensesEur: (
          baseline.averageMonthlyFixedExpensesCents / 100
        )
          .toFixed(2)
          .replace(".", ","),
        monthlyVariableExpensesEur: (
          baseline.averageMonthlyVariableExpensesCents / 100
        )
          .toFixed(2)
          .replace(".", ","),
        monthlyTotalExpensesEur: (
          baseline.averageMonthlyTotalExpensesCents / 100
        )
          .toFixed(2)
          .replace(".", ","),
        monthlyNetSavingsEur: (baseline.averageMonthlyNetSavingsCents / 100)
          .toFixed(2)
          .replace(".", ","),
        savingsRatePercent: baseline.averageSavingsRatePercent,
      },
      budgetsUnderRisk,
    };
  }

  /**
   * Construye el texto contextual del perfil financiero para inyección en el prompt del sistema
   */
  async buildSystemContext(userId: string): Promise<string> {
    try {
      const p = await this.getProfile(userId);
      let text = `\n--- PERFIL FINANCIERO CONSOLIDADO DEL USUARIO (MEMORIA DE LARGO PLAZO) ---\n`;
      text += `- Saldo global consolidado: ${p.totalBalanceEur} € (${p.accountsCount} cuenta/s activa/s).\n`;
      text += `- Ingresos medios mensuales: ${p.baseline.monthlyIncomeEur} €.\n`;
      text += `- Gastos fijos esenciales medios: ${p.baseline.monthlyFixedExpensesEur} €/mes (Vivienda, Suministros, etc.).\n`;
      text += `- Gastos variables discrecionales medios: ${p.baseline.monthlyVariableExpensesEur} €/mes (Restaurantes, Ocio, Compras).\n`;
      text += `- Capacidad de ahorro neta media: ${p.baseline.monthlyNetSavingsEur} €/mes (Tasa de ahorro: ${p.baseline.savingsRatePercent}%).\n`;

      // Deudas activas
      if (p.debtsOverview.activeDebtsCount > 0) {
        text += `- Deudas y pasivos activos vigentes (${p.debtsOverview.activeDebtsCount} deuda(s), Total: ${p.debtsOverview.totalRemainingEur} € | Compromiso cuotas: ${p.debtsOverview.totalMonthlyPaymentEur} €/mes):\n`;
        for (const d of p.debtsOverview.debts) {
          text += `  * "${d.concept}"${d.creditor ? " (" + d.creditor + ")" : ""}: ${d.remainingEur} € pendientes (Cuota: ${d.quotaEur} €/mes, Interés: ${d.ratePercent}%).\n`;
        }
        text += `  * REGLA DE PRIORIDAD FINANCIERA: El usuario tiene deudas activas. NUNCA propongas ni recomiendes metas de ahorro para vacaciones, caprichos, viajes ni compras no esenciales (ej. comprar coche de ocio o artículos a plazos como iPhone) mientras existan estas deudas. La prioridad matemática innegociable debe ser amortizar deuda anticipadamente o fondo de emergencia.\n`;
      } else {
        text += `- Deudas y pasivos: 0 € pendientes (Sin deudas activas).\n`;
      }

      // Metas de ahorro
      if (p.goals.length > 0) {
        text += `- Metas de ahorro activas actuales:\n`;
        for (const g of p.goals) {
          text += `  * "${g.name}": ${g.currentEur} € de ${g.targetEur} € (${g.progressPercent}% completado)${g.isCompleted ? " [COMPLETADA]" : ""}\n`;
        }
        text += `  * REGLA ESTRICTA ANTI-DUPLICADOS: Antes de recomendar o crear una meta de ahorro, verifica las metas activas anteriores. Si ya existe una meta con el mismo propósito (ej. "Vacaciones") o con características idénticas o muy similares de importe o plazo, NUNCA propongas una meta duplicada. En su lugar, sugiere aportar a la existente o ajustar su importe.\n`;
      } else {
        text += `- Metas de ahorro: Sin metas configuradas actualmente.\n`;
      }

      if (p.budgetsUnderRisk.length > 0) {
        text += `- Presupuestos en riesgo este mes:\n`;
        for (const b of p.budgetsUnderRisk) {
          text += `  * ${b.categoryName}: ${b.percentageUsed}% consumido (${b.status}).\n`;
        }
      }
      text += `--------------------------------------------------------------------------\n`;

      return text;
    } catch (e) {
      this.logger.warn(
        `Error al construir contexto financiero para ${userId}: ${e}`,
      );
      return "";
    }
  }
}
