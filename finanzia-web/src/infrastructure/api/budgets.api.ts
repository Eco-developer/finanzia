import { apiClient } from './api-client';

export type BudgetStatus = 'ON_TRACK' | 'WARNING' | 'EXCEEDED';

export interface BudgetPacingItem {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryColorHex: string | null;
  categoryIcon: string | null;
  amountLimitCents: number;
  spentCents: number;
  remainingCents: number;
  percentageUsed: number;
  alertThresholdPct: number;
  status: BudgetStatus;
}

export interface BudgetPacingSummary {
  totalBudgetedCents: number;
  totalSpentCents: number;
  totalRemainingCents: number;
  overallPercentageUsed: number;
  periodMonth: number;
  periodYear: number;
}

export interface BudgetPacingResponse {
  success: boolean;
  data: BudgetPacingItem[];
  summary: BudgetPacingSummary;
}

export interface CreateBudgetDto {
  categoryId: string;
  amountLimitCents: number;
  periodMonth: number;
  periodYear: number;
  alertThresholdPct?: number;
}

export interface UpdateBudgetDto {
  amountLimitCents?: number;
  alertThresholdPct?: number;
}

export const budgetsApi = {
  async getPacing(month: number, year: number): Promise<BudgetPacingResponse> {
    const res = await apiClient<BudgetPacingItem[]>(
      `/budgets/pacing?month=${month}&year=${year}`,
    );
    return res as unknown as BudgetPacingResponse;
  },

  async createBudget(dto: CreateBudgetDto): Promise<any> {
    const res = await apiClient('/budgets', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async updateBudget(id: string, dto: UpdateBudgetDto): Promise<any> {
    const res = await apiClient(`/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async deleteBudget(id: string): Promise<void> {
    await apiClient(`/budgets/${id}`, {
      method: 'DELETE',
    });
  },
};
