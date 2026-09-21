import {
  transactionsApi,
  TransactionItem,
  TransactionType,
  CreateTransactionDto,
  CreateTransferDto,
} from '@/infrastructure/api/transactions.api';

export type { TransactionItem, TransactionType, CreateTransactionDto, CreateTransferDto };

export function useTransactions() {
  const createTransaction = async (dto: CreateTransactionDto) => {
    return await transactionsApi.createTransaction(dto);
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

  return {
    createTransaction,
    createTransfer,
    getTransactions,
    deleteTransaction,
  };
}
