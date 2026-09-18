import { accountsApi, AccountItem, AccountType, CreateAccountDto } from '@/infrastructure/api/accounts.api';

export type { AccountItem, AccountType, CreateAccountDto };

export function useAccounts() {
  const createAccount = async (dto: CreateAccountDto) => {
    return await accountsApi.createAccount(dto);
  };

  const getAccounts = async () => {
    return await accountsApi.getAccounts();
  };

  return {
    createAccount,
    getAccounts,
  };
}
