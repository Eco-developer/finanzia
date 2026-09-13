import { apiClient } from './api-client';

export type AccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'INVESTMENT';

export interface AccountItem {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  initialBalanceCents: number;
  currentBalanceCents: number;
  currency: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountDto {
  name: string;
  type: AccountType;
  initialBalanceCents?: number;
  currency?: string;
}

export const accountsApi = {
  async getAccounts(includeArchived = false): Promise<AccountItem[]> {
    const res = await apiClient<AccountItem[]>(
      `/accounts?includeArchived=${includeArchived}`,
    );
    return res.data;
  },

  async createAccount(dto: CreateAccountDto): Promise<AccountItem> {
    const res = await apiClient<AccountItem>('/accounts', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },
};
