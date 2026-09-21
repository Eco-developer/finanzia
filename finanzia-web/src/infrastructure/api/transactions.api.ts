import { apiClient } from './api-client';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface TransactionItem {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  amountCents: number;
  type: TransactionType;
  transactionDate: string;
  description: string;
  notes: string | null;
  isPending: boolean;
  transferCounterpartId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionDto {
  accountId: string;
  categoryId?: string | null;
  amountCents: number;
  type: TransactionType;
  transactionDate: string;
  description: string;
  notes?: string;
}

export interface UpdateTransactionDto {
  accountId?: string;
  categoryId?: string | null;
  amountCents?: number;
  type?: TransactionType;
  transactionDate?: string;
  description?: string;
  notes?: string;
}

export interface CreateTransferDto {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  transactionDate: string;
  description: string;
  notes?: string;
}

export interface TransactionFilter {
  page?: number;
  limit?: number;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedTransactions {
  items: TransactionItem[];
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

export const transactionsApi = {
  async getTransactions(filter: TransactionFilter = {}): Promise<PaginatedTransactions> {
    const params = new URLSearchParams();
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());
    if (filter.accountId) params.append('accountId', filter.accountId);
    if (filter.categoryId) params.append('categoryId', filter.categoryId);
    if (filter.type) params.append('type', filter.type);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient<TransactionItem[]>(`/transactions${query}`);

    return {
      items: res.data || [],
      page: res.meta?.page || 1,
      limit: res.meta?.limit || 20,
      totalRecords: res.meta?.totalRecords || res.data?.length || 0,
      totalPages: res.meta?.totalPages || 1,
    };
  },

  async createTransaction(
    dto: CreateTransactionDto,
  ): Promise<{ transaction: TransactionItem; newAccountBalanceCents: number }> {
    const res = await apiClient<TransactionItem>('/transactions', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

    return {
      transaction: res.data,
      newAccountBalanceCents: res.meta?.newAccountBalanceCents,
    };
  },

  async createTransfer(dto: CreateTransferDto): Promise<any> {
    const res = await apiClient('/transactions/transfer', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async deleteTransaction(id: string): Promise<void> {
    await apiClient(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  async updateTransaction(id: string, dto: UpdateTransactionDto): Promise<TransactionItem> {
    const res = await apiClient<TransactionItem>(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async deleteMultipleTransactions(ids: string[]): Promise<void> {
    try {
      await apiClient('/transactions/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    } catch {
      // Fallback: eliminar una por una
      await Promise.all(ids.map((id) => this.deleteTransaction(id)));
    }
  },
};
