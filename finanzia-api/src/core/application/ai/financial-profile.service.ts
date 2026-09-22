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

    const [balances, goals, baseline, budgets] = await Promise.all([
      this.analytics.getAccountBalances(userId),
      this.analytics.getSavingsGoals(userId),
      this.analytics.getHistoricalBaseline(userId),
      this.analytics.getBudgetStatus(userId, currentMonth, currentYear),
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

      if (p.goals.length > 0) {
        text += `- Metas de ahorro activas:\n`;
        for (const g of p.goals) {
          text += `  * "${g.name}": ${g.currentEur} € de ${g.targetEur} € (${g.progressPercent}% completado)${g.isCompleted ? " [COMPLETADA]" : ""}\n`;
        }
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
