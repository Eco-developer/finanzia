import {
  FinancialSummaryResult,
  CategoryExpenseItem,
  BudgetStatusItem,
  ProposeRecommendationResult,
  TotalBalancesResult,
  SavingsGoalItem,
  ProactiveInsightItem,
  HistoricalBaselineResult,
} from "../ai/ai-tools.service";

export interface IFinancialAnalyticsPort {
  getFinancialSummary(
    userId: string,
    month: number,
    year: number,
  ): Promise<FinancialSummaryResult>;

  getExpensesByCategory(
    userId: string,
    startDateStr: string,
    endDateStr: string,
    categoryId?: string,
  ): Promise<CategoryExpenseItem[]>;

  getBudgetStatus(
    userId: string,
    month: number,
    year: number,
  ): Promise<BudgetStatusItem[]>;

  proposeRecommendation(
    userId: string,
    type: string,
    title: string,
    details: string,
    actionPayload: any,
  ): Promise<ProposeRecommendationResult>;

  getAccountBalances(userId: string): Promise<TotalBalancesResult>;

  getSavingsGoals(userId: string): Promise<SavingsGoalItem[]>;

  getHistoricalBaseline(userId: string): Promise<HistoricalBaselineResult>;

  getProactiveInsights(userId: string): Promise<ProactiveInsightItem[]>;

  saveUserCategoryRule(
    userId: string,
    pattern: string,
    categoryId: string,
  ): Promise<{ id: string; pattern: string; categoryId: string }>;

  findUserCategoryRule(
    userId: string,
    pattern: string,
  ): Promise<{
    id: string;
    pattern: string;
    categoryId: string;
    categoryName: string;
  } | null>;
}

export const FINANCIAL_ANALYTICS_PORT = Symbol("IFinancialAnalyticsPort");
