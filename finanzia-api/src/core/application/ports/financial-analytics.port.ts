import {
  FinancialSummaryResult,
  CategoryExpenseItem,
  BudgetStatusItem,
  ProposeRecommendationResult,
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
}

export const FINANCIAL_ANALYTICS_PORT = Symbol("IFinancialAnalyticsPort");
