import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  IFinancialAnalyticsPort,
  FINANCIAL_ANALYTICS_PORT,
} from "../ports/financial-analytics.port";

export interface FinancialSummaryResult {
  month: number;
  year: number;
  totalIncomeCents: number;
  totalExpenseCents: number;
  netSavingsCents: number;
  savingsRatePercent: number;
  transactionCount: number;
  currency: string;
}

export interface CategoryExpenseItem {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string | null;
  totalAmountCents: number;
  transactionCount: number;
  percentageOfTotal: number;
}

export interface BudgetStatusItem {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  percentageUsed: number;
  status: "ON_TRACK" | "WARNING" | "EXCEEDED";
}

export interface ProposeRecommendationResult {
  recommendationId: string;
  status: string;
  type: string;
  title: string;
}

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(
    @Inject(FINANCIAL_ANALYTICS_PORT)
    private readonly analytics: IFinancialAnalyticsPort,
  ) {}

  /**
   * Herramienta 1: Resumen financiero determinista para un mes y año concretos
   */
  async getFinancialSummary(
    userId: string,
    month: number,
    year: number,
  ): Promise<FinancialSummaryResult> {
    this.logger.log(
      `[Tool] getFinancialSummary para usuario ${userId}, ${month}/${year}`,
    );
    return await this.analytics.getFinancialSummary(userId, month, year);
  }

  /**
   * Herramienta 2: Desglose de gastos por categoría en un rango de fechas
   */
  async getExpensesByCategory(
    userId: string,
    startDateStr: string,
    endDateStr: string,
    categoryId?: string,
  ): Promise<CategoryExpenseItem[]> {
    this.logger.log(
      `[Tool] getExpensesByCategory para usuario ${userId} entre ${startDateStr} y ${endDateStr}`,
    );
    return await this.analytics.getExpensesByCategory(
      userId,
      startDateStr,
      endDateStr,
      categoryId,
    );
  }

  /**
   * Herramienta 3: Consulta el estado de ejecución y ritmo de presupuestos del usuario
   */
  async getBudgetStatus(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetStatusItem[]> {
    this.logger.log(
      `[Tool] getBudgetStatus para usuario ${userId}, ${month}/${year}`,
    );
    return await this.analytics.getBudgetStatus(userId, month, year);
  }

  /**
   * Herramienta 4: Proponer una recomendación estructurada para aprobación humana
   */
  async proposeRecommendation(
    userId: string,
    type: string,
    title: string,
    details: string,
    actionPayload: any,
  ): Promise<ProposeRecommendationResult> {
    this.logger.log(
      `[Tool] proposeRecommendation: ${title} para usuario ${userId}`,
    );
    return await this.analytics.proposeRecommendation(
      userId,
      type,
      title,
      details,
      actionPayload,
    );
  }
}
