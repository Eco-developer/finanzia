import {
  transactionsApi,
  TransactionItem,
  TransactionType,
  CreateTransactionDto,
  CreateTransferDto,
  UpdateTransactionDto,
} from '@/infrastructure/api/transactions.api';

export type {
  TransactionItem,
  TransactionType,
  CreateTransactionDto,
  CreateTransferDto,
  UpdateTransactionDto,
};

export function useTransactions() {
  const createTransaction = async (dto: CreateTransactionDto) => {
    return await transactionsApi.createTransaction(dto);
  };

  const updateTransaction = async (id: string, dto: UpdateTransactionDto) => {
    return await transactionsApi.updateTransaction(id, dto);
  };

  const createTransfer = async (dto: CreateTransferDto) => {
    return await transactionsApi.createTransfer(dto);
  };

  const getTransactions = async (params?: Parameters<typeof transactionsApi.getTransactions>[0]) => {
    return await transactionsApi.getTransactions(params);
  };

  const deleteTransaction = async (id: string) => {
    return await transactionsApi.deleteTransaction(id);
  };

  const deleteMultipleTransactions = async (ids: string[]) => {
    return await transactionsApi.deleteMultipleTransactions(ids);
  };

  return {
    createTransaction,
    updateTransaction,
    createTransfer,
    getTransactions,
    deleteTransaction,
    deleteMultipleTransactions,
  };
}
