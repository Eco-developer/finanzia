import { BudgetEntity } from "../entities/budget.entity";

export interface CreateBudgetData {
  userId: string;
  categoryId: string;
  amountLimitCents: bigint;
  periodMonth: number;
  periodYear: number;
  alertThresholdPct?: number;
}

export interface UpdateBudgetData {
  amountLimitCents?: bigint;
  alertThresholdPct?: number;
}

export interface BudgetPacingData {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryColorHex: string | null;
  categoryIcon: string | null;
  amountLimitCents: bigint;
  spentCents: bigint;
  remainingCents: bigint;
  percentageUsed: number;
  alertThresholdPct: number;
  status: "ON_TRACK" | "WARNING" | "EXCEEDED";
}

export interface IBudgetRepository {
  upsert(data: CreateBudgetData): Promise<BudgetEntity>;
  findById(id: string): Promise<BudgetEntity | null>;
  findByUserCategoryPeriod(
    userId: string,
    categoryId: string,
    periodMonth: number,
    periodYear: number,
  ): Promise<BudgetEntity | null>;
  findAllByUserId(
    userId: string,
    periodMonth?: number,
    periodYear?: number,
  ): Promise<BudgetEntity[]>;
  update(id: string, data: UpdateBudgetData): Promise<BudgetEntity>;
  delete(id: string): Promise<void>;
  calculatePacing(
    userId: string,
    periodMonth: number,
    periodYear: number,
  ): Promise<BudgetPacingData[]>;
}

export const BUDGET_REPOSITORY = Symbol("IBudgetRepository");
