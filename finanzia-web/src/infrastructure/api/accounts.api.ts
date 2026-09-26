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

export interface UpdateAccountDto {
  name?: string;
  type?: AccountType;
  isArchived?: boolean;
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

  async updateAccount(id: string, dto: UpdateAccountDto): Promise<AccountItem> {
    const res = await apiClient<AccountItem>(`/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async deleteAccount(id: string): Promise<AccountItem> {
    const res = await apiClient<AccountItem>(`/accounts/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },
};
