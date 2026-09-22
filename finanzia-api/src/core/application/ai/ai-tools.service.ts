import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import {
  IFinancialAnalyticsPort,
  FINANCIAL_ANALYTICS_PORT,
} from "../ports/financial-analytics.port";
import { MultiStepPlannerService } from "./multi-step-planner.service";
import { TransactionLearningService } from "./transaction-learning.service";

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

export interface AccountBalanceItem {
  accountId: string;
  name: string;
  type: string;
  currency: string;
  balanceCents: number;
}

export interface TotalBalancesResult {
  totalBalanceCents: number;
  accounts: AccountBalanceItem[];
  currency: string;
}

export interface SavingsGoalItem {
  goalId: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  progressPercent: number;
  targetDate: string | null;
  isCompleted: boolean;
}

export interface HistoricalBaselineResult {
  monthsAnalyzed: number;
  averageMonthlyIncomeCents: number;
  averageMonthlyFixedExpensesCents: number;
  averageMonthlyVariableExpensesCents: number;
  averageMonthlyTotalExpensesCents: number;
  averageMonthlyNetSavingsCents: number;
  averageSavingsRatePercent: number;
  topVariableCategories: Array<{
    categoryId: string;
    categoryName: string;
    monthlyAverageCents: number;
    percentageOfVariable: number;
  }>;
}

export interface PlanCategoryCutSuggestion {
  categoryId: string;
  categoryName: string;
  currentMonthlyAverageCents: number;
  suggestedCutCents: number;
  newMonthlyTargetCents: number;
  reason: string;
}

export interface MultiStepSavingsPlanResult {
  goalName: string;
  targetAmountCents: number;
  months: number;
  monthlyQuotaCents: number;
  averageNetSavingsCents: number;
  gapCents: number;
  isViableWithCurrentSavings: boolean;
  suggestedCuts: PlanCategoryCutSuggestion[];
  summary: string;
  recommendationId?: string;
}

export interface ProactiveInsightItem {
  type: "EXPENSE_SURGE" | "GOAL_PROGRESS" | "BUDGET_WARNING";
  title: string;
  description: string;
  importance: "HIGH" | "MEDIUM" | "INFO";
  metric?: {
    label: string;
    value: string;
    deviationPercent?: number;
  };
}

export interface CategorizationResult {
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  source: "LEARNED_USER_RULE" | "PATTERN_MATCH" | "SEMANTIC_FALLBACK";
  confidence: number;
}

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(
    @Inject(FINANCIAL_ANALYTICS_PORT)
    private readonly analytics: IFinancialAnalyticsPort,
    @Inject(forwardRef(() => MultiStepPlannerService))
    private readonly multiStepPlanner: MultiStepPlannerService,
    @Inject(forwardRef(() => TransactionLearningService))
    private readonly transactionLearning: TransactionLearningService,
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

  /**
   * Herramienta 5: Consultar saldos consolidados de cuentas
   */
  async getAccountBalances(userId: string): Promise<TotalBalancesResult> {
    this.logger.log(`[Tool] getAccountBalances para usuario ${userId}`);
    return await this.analytics.getAccountBalances(userId);
  }

  /**
   * Herramienta 6: Consultar estado y progreso de metas de ahorro
   */
  async getSavingsGoals(userId: string): Promise<SavingsGoalItem[]> {
    this.logger.log(`[Tool] getSavingsGoals para usuario ${userId}`);
    return await this.analytics.getSavingsGoals(userId);
  }

  /**
   * Herramienta 7: Planificación multi-paso determinista de metas de ahorro
   */
  async calculateSavingsPlan(
    userId: string,
    targetAmountCents: number,
    months: number,
    goalName?: string,
  ): Promise<MultiStepSavingsPlanResult> {
    this.logger.log(
      `[Tool] calculateSavingsPlan para usuario ${userId}: ${targetAmountCents} céntimos en ${months} meses`,
    );
    return await this.multiStepPlanner.calculateGoalPlan(
      userId,
      targetAmountCents,
      months,
      goalName,
    );
  }

  /**
   * Herramienta 8: Clasificación inteligente de transacciones con feedback loop
   */
  async categorizeTransaction(
    userId: string,
    description: string,
  ): Promise<CategorizationResult> {
    this.logger.log(
      `[Tool] categorizeTransaction para usuario ${userId}: "${description}"`,
    );
    return await this.transactionLearning.categorizeTransaction(
      userId,
      description,
    );
  }

  /**
   * Herramienta 9: Alertas proactivas ante desvíos y progreso de metas
   */
  async getProactiveInsights(userId: string): Promise<ProactiveInsightItem[]> {
    this.logger.log(`[Tool] getProactiveInsights para usuario ${userId}`);
    return await this.analytics.getProactiveInsights(userId);
  }

  /**
   * Herramienta 10: Consulta la línea base histórica de 3 meses (Fijos vs Variables)
   */
  async getHistoricalBaseline(
    userId: string,
  ): Promise<HistoricalBaselineResult> {
    this.logger.log(`[Tool] getHistoricalBaseline para usuario ${userId}`);
    return await this.analytics.getHistoricalBaseline(userId);
  }
}
