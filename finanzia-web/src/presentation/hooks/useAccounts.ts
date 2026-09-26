import {
  accountsApi,
  AccountItem,
  AccountType,
  CreateAccountDto,
  UpdateAccountDto,
} from '@/infrastructure/api/accounts.api';

export type { AccountItem, AccountType, CreateAccountDto, UpdateAccountDto };

export function useAccounts() {
  const createAccount = async (dto: CreateAccountDto) => {
    return await accountsApi.createAccount(dto);
  };

  const getAccounts = async (includeArchived = false) => {
    return await accountsApi.getAccounts(includeArchived);
  };

  const updateAccount = async (id: string, dto: UpdateAccountDto) => {
    return await accountsApi.updateAccount(id, dto);
  };

  const deleteAccount = async (id: string) => {
    return await accountsApi.deleteAccount(id);
  };

  return {
    createAccount,
    getAccounts,
    updateAccount,
    deleteAccount,
  };
}
