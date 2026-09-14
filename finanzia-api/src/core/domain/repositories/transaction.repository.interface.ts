import { TransactionType } from "@prisma/client";
import { TransactionEntity } from "../entities/transaction.entity";

export interface CreateTransactionData {
  userId: string;
  accountId: string;
  categoryId?: string | null;
  amountCents: bigint;
  type: TransactionType;
  transactionDate: Date;
  description: string;
  notes?: string | null;
  isPending?: boolean;
  deduplicationHash?: string | null;
  transferCounterpartId?: string | null;
}

export interface CreateTransferData {
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: bigint; // Siempre positivo para la transferencia
  transactionDate: Date;
  description: string;
  notes?: string | null;
}

export interface TransactionFilterData {
  accountId?: string;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
  page?: number;
  limit?: number;
}

export interface ITransactionRepository {
  createTransactionWithBalance(data: CreateTransactionData): Promise<{
    transaction: TransactionEntity;
    newAccountBalanceCents: bigint;
  }>;

  createTransferWithBalances(data: CreateTransferData): Promise<{
    fromTransaction: TransactionEntity;
    toTransaction: TransactionEntity;
    newFromBalanceCents: bigint;
    newToBalanceCents: bigint;
  }>;

  findAllByUserId(
    userId: string,
    filter: TransactionFilterData,
  ): Promise<{ transactions: TransactionEntity[]; totalRecords: number }>;

  findById(id: string): Promise<TransactionEntity | null>;

  deleteTransactionWithBalance(
    id: string,
  ): Promise<{ deletedId: string; affectedAccountIds: string[] }>;

  findExistingHashes(
    userId: string,
    accountId: string,
    hashes: string[],
  ): Promise<string[]>;

  createManyWithBalance(
    userId: string,
    accountId: string,
    transactions: CreateTransactionData[],
  ): Promise<{ count: number; newAccountBalanceCents: bigint }>;
}

export const TRANSACTION_REPOSITORY = Symbol("ITransactionRepository");
