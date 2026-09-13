import { Injectable } from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { PrismaTransactionRepository } from "../../../infrastructure/database/repositories/prisma-transaction.repository";
import { PrismaAccountRepository } from "../../../infrastructure/database/repositories/prisma-account.repository";
import { PrismaCategoryRepository } from "../../../infrastructure/database/repositories/prisma-category.repository";
import { CreateTransactionDto } from "../../../presentation/dtos/transactions/create-transaction.dto";
import { CreateTransferDto } from "../../../presentation/dtos/transactions/create-transfer.dto";
import { TransactionFilterDto } from "../../../presentation/dtos/transactions/transaction-filter.dto";
import { TransactionResponseDto } from "../../../presentation/dtos/transactions/transaction-response.dto";
import { TransferResponseDto } from "../../../presentation/dtos/transactions/transfer-response.dto";
import { TransactionEntity } from "../../domain/entities/transaction.entity";
import { AccountNotFoundException } from "../../domain/exceptions/account-not-found.exception";
import { UnauthorizedAccountAccessException } from "../../domain/exceptions/unauthorized-account-access.exception";
import { CategoryNotFoundException } from "../../domain/exceptions/category-not-found.exception";
import { UnauthorizedCategoryAccessException } from "../../domain/exceptions/unauthorized-category-access.exception";
import { TransactionNotFoundException } from "../../domain/exceptions/transaction-not-found.exception";
import { UnauthorizedTransactionAccessException } from "../../domain/exceptions/unauthorized-transaction-access.exception";
import { InvalidTransactionAmountException } from "../../domain/exceptions/invalid-transaction-amount.exception";
import { InvalidTransferException } from "../../domain/exceptions/invalid-transfer.exception";

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionRepository: PrismaTransactionRepository,
    private readonly accountRepository: PrismaAccountRepository,
    private readonly categoryRepository: PrismaCategoryRepository,
  ) {}

  async createTransaction(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<{
    transaction: TransactionResponseDto;
    newAccountBalanceCents: number;
  }> {
    // 1. Validar que la cuenta pertenezca al usuario
    const account = await this.accountRepository.findById(dto.accountId);
    if (!account) {
      throw new AccountNotFoundException(dto.accountId);
    }
    if (account.userId !== userId) {
      throw new UnauthorizedAccountAccessException(dto.accountId);
    }

    // 2. Validar categoría si se proporciona
    if (dto.categoryId) {
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
        throw new CategoryNotFoundException(dto.categoryId);
      }
      if (category.userId !== null && category.userId !== userId) {
        throw new UnauthorizedCategoryAccessException(dto.categoryId);
      }
    }

    // 3. Validar importe no cero y normalizar signo
    if (!dto.amountCents || dto.amountCents === 0) {
      throw new InvalidTransactionAmountException(
        "El importe no puede ser cero",
      );
    }

    const absAmount = Math.abs(dto.amountCents);
    const amountCents =
      dto.type === TransactionType.EXPENSE
        ? -BigInt(absAmount)
        : BigInt(absAmount);

    const transactionDate = new Date(dto.transactionDate);
    if (isNaN(transactionDate.getTime())) {
      throw new InvalidTransactionAmountException(
        "La fecha proporcionada no es válida",
      );
    }

    // 4. Crear transacción y actualizar saldo de cuenta de forma atómica
    const result =
      await this.transactionRepository.createTransactionWithBalance({
        userId,
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
        amountCents,
        type: dto.type,
        transactionDate,
        description: dto.description,
        notes: dto.notes ?? null,
      });

    return {
      transaction: this.toResponseDto(result.transaction),
      newAccountBalanceCents: Number(result.newAccountBalanceCents),
    };
  }

  async createTransfer(
    userId: string,
    dto: CreateTransferDto,
  ): Promise<TransferResponseDto> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new InvalidTransferException(
        "La cuenta de origen y de destino no pueden ser la misma",
      );
    }

    // 1. Validar cuenta de origen
    const fromAccount = await this.accountRepository.findById(
      dto.fromAccountId,
    );
    if (!fromAccount) {
      throw new AccountNotFoundException(dto.fromAccountId);
    }
    if (fromAccount.userId !== userId) {
      throw new UnauthorizedAccountAccessException(dto.fromAccountId);
    }

    // 2. Validar cuenta de destino
    const toAccount = await this.accountRepository.findById(dto.toAccountId);
    if (!toAccount) {
      throw new AccountNotFoundException(dto.toAccountId);
    }
    if (toAccount.userId !== userId) {
      throw new UnauthorizedAccountAccessException(dto.toAccountId);
    }

    // 3. Validar importe estrictamente positivo
    if (!dto.amountCents || dto.amountCents <= 0) {
      throw new InvalidTransferException(
        "El importe de la transferencia debe ser mayor a cero",
      );
    }

    const transactionDate = new Date(dto.transactionDate);
    if (isNaN(transactionDate.getTime())) {
      throw new InvalidTransferException(
        "La fecha de la transferencia no es válida",
      );
    }

    // 4. Crear transferencias y actualizar saldos de ambas cuentas de forma atómica
    const result = await this.transactionRepository.createTransferWithBalances({
      userId,
      fromAccountId: dto.fromAccountId,
      toAccountId: dto.toAccountId,
      amountCents: BigInt(dto.amountCents),
      transactionDate,
      description: dto.description,
      notes: dto.notes ?? null,
    });

    return {
      fromTransaction: this.toResponseDto(result.fromTransaction),
      toTransaction: this.toResponseDto(result.toTransaction),
      newFromBalanceCents: Number(result.newFromBalanceCents),
      newToBalanceCents: Number(result.newToBalanceCents),
    };
  }

  async getTransactions(
    userId: string,
    filter: TransactionFilterDto,
  ): Promise<{
    items: TransactionResponseDto[];
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
  }> {
    if (filter.accountId) {
      const account = await this.accountRepository.findById(filter.accountId);
      if (!account) {
        throw new AccountNotFoundException(filter.accountId);
      }
      if (account.userId !== userId) {
        throw new UnauthorizedAccountAccessException(filter.accountId);
      }
    }

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 20;

    const startDate = filter.startDate ? new Date(filter.startDate) : undefined;
    const endDate = filter.endDate ? new Date(filter.endDate) : undefined;

    const result = await this.transactionRepository.findAllByUserId(userId, {
      accountId: filter.accountId,
      categoryId: filter.categoryId,
      type: filter.type,
      startDate,
      endDate,
      page,
      limit,
    });

    return {
      items: result.transactions.map((tx) => this.toResponseDto(tx)),
      page,
      limit,
      totalRecords: result.totalRecords,
      totalPages: Math.ceil(result.totalRecords / limit),
    };
  }

  async getTransactionById(
    userId: string,
    id: string,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new TransactionNotFoundException(id);
    }

    if (transaction.userId !== userId) {
      throw new UnauthorizedTransactionAccessException(id);
    }

    return this.toResponseDto(transaction);
  }

  async deleteTransaction(
    userId: string,
    id: string,
  ): Promise<{ deletedId: string; affectedAccountIds: string[] }> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new TransactionNotFoundException(id);
    }

    if (transaction.userId !== userId) {
      throw new UnauthorizedTransactionAccessException(id);
    }

    return this.transactionRepository.deleteTransactionWithBalance(id);
  }

  private toResponseDto(entity: TransactionEntity): TransactionResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      accountId: entity.accountId,
      categoryId: entity.categoryId,
      amountCents: Number(entity.amountCents),
      type: entity.type,
      transactionDate: entity.transactionDate,
      description: entity.description,
      notes: entity.notes,
      isPending: entity.isPending,
      transferCounterpartId: entity.transferCounterpartId,
      deduplicationHash: entity.deduplicationHash,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
