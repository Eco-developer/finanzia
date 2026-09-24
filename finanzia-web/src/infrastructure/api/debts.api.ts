import { apiClient } from './api-client';

export type InterestRateType = 'ANNUAL' | 'MONTHLY';
export type DebtStatus = 'ACTIVE' | 'PAID_OFF';
export type DebtPayoffStrategy = 'AVALANCHE' | 'SNOWBALL';

export interface DebtAmortizationItem {
  id: string;
  debtId: string;
  accountId?: string | null;
  transactionId?: string | null;
  amountCents: string;
  principalCents: string;
  interestCents: string;
  remainingAfterCents: string;
  paymentDate: string;
  notes?: string | null;
  createdAt: string;
}

export interface DebtItem {
  id: string;
  concept: string;
  creditor?: string | null;
  initialAmountCents: string;
  remainingAmountCents: string;
  paidAmountCents: string;
  progressPercentage: number;
  interestRateBasisPts: number;
  interestRateType: InterestRateType;
  estimatedMonthlyInterestCents: string;
  minimumMonthlyPaymentCents?: string | null;
  dueDate?: string | null;
  status: DebtStatus;
  paidOffAt?: string | null;
  isImmutable: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  amortizations: DebtAmortizationItem[];
}

export interface DebtsSummary {
  totalRemainingCents: string;
  totalInitialCents: string;
  activeDebtsCount: number;
  totalMonthlyCommitmentCents: string;
  totalMonthlyInterestCents: string;
  weightedAverageRateBasisPts: number;
}

export interface ActiveDebtsResponse {
  debts: DebtItem[];
  summary: DebtsSummary;
}

export interface CreateDebtDto {
  concept: string;
  creditor?: string;
  initialAmountCents: number;
  remainingAmountCents?: number;
  interestRateBasisPts: number;
  interestRateType?: InterestRateType;
  minimumMonthlyPaymentCents?: number;
  dueDate?: string;
  notes?: string;
}

export interface UpdateDebtDto {
  concept?: string;
  creditor?: string;
  interestRateBasisPts?: number;
  interestRateType?: InterestRateType;
  minimumMonthlyPaymentCents?: number;
  dueDate?: string;
  notes?: string;
}

export interface AmortizeDebtDto {
  amountCents: number;
  accountId?: string;
  paymentDate?: string;
  notes?: string;
}

export interface SimulatePayoffDto {
  extraMonthlyCents: number;
  strategy?: DebtPayoffStrategy;
}

export interface DebtPayoffPlanResult {
  strategy: DebtPayoffStrategy;
  totalMonths: number;
  totalInterestPaidCents: string;
  baselineMonths: number;
  baselineInterestPaidCents: string;
  monthsSaved: number;
  interestSavedCents: string;
  payoffOrder: Array<{
    debtId: string;
    concept: string;
    monthFinished: number;
    interestPaidCents: string;
  }>;
}

export interface AmortizeDebtResult {
  debt: DebtItem;
  amortization: DebtAmortizationItem;
  isFullyPaid: boolean;
}

export const debtsApi = {
  async getActiveDebts(): Promise<ActiveDebtsResponse> {
    const res = await apiClient<DebtItem[]>('/debts');
    return {
      debts: res.data || [],
      summary: (res as any).summary || {
        totalRemainingCents: '0',
        totalInitialCents: '0',
        activeDebtsCount: 0,
        totalMonthlyCommitmentCents: '0',
        totalMonthlyInterestCents: '0',
        weightedAverageRateBasisPts: 0,
      },
    };
  },

  async getDebtHistory(): Promise<DebtItem[]> {
    const res = await apiClient<DebtItem[]>('/debts/history');
    return res.data || [];
  },

  async getDebtById(id: string): Promise<DebtItem> {
    const res = await apiClient<DebtItem>(`/debts/${id}`);
    return res.data;
  },

  async createDebt(dto: CreateDebtDto): Promise<DebtItem> {
    const res = await apiClient<DebtItem>('/debts', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async updateDebt(id: string, dto: UpdateDebtDto): Promise<DebtItem> {
    const res = await apiClient<DebtItem>(`/debts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async deleteDebt(id: string): Promise<void> {
    await apiClient(`/debts/${id}`, {
      method: 'DELETE',
    });
  },

  async amortizeDebt(
    id: string,
    dto: AmortizeDebtDto,
  ): Promise<{ data: AmortizeDebtResult; message: string }> {
    const res = await apiClient<AmortizeDebtResult>(`/debts/${id}/amortize`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return {
      data: res.data,
      message: (res as any).message || '',
    };
  },

  async simulatePayoff(dto: SimulatePayoffDto): Promise<DebtPayoffPlanResult> {
    const res = await apiClient<DebtPayoffPlanResult>('/debts/simulate', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },
};
