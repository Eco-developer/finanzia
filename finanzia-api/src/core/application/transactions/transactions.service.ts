import { Injectable, Inject } from "@nestjs/common";
import { TransactionType } from "../../domain/types/financial.types";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/repositories/transaction.repository.interface";
import {
  IAccountRepository,
  ACCOUNT_REPOSITORY,
} from "../../domain/repositories/account.repository.interface";
import {
  ICategoryRepository,
  CATEGORY_REPOSITORY,
} from "../../domain/repositories/category.repository.interface";
import { CreateTransactionDto } from "../../../presentation/dtos/transactions/create-transaction.dto";
import { CreateTransferDto } from "../../../presentation/dtos/transactions/create-transfer.dto";
import { UpdateTransactionDto } from "../../../presentation/dtos/transactions/update-transaction.dto";
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
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
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

    // 3. Validar importe estrictamente positivo y fondos suficientes
    if (!dto.amountCents || dto.amountCents <= 0) {
      throw new InvalidTransferException(
        "El importe de la transferencia debe ser mayor a cero",
      );
    }

    if (fromAccount.currentBalanceCents < BigInt(dto.amountCents)) {
      throw new InvalidTransferException(
        "El importe de la transferencia no puede superar el saldo disponible de la cuenta de origen",
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
      totalPages: Math.max(1, Math.ceil(result.totalRecords / limit)),
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

  async updateTransaction(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<{
    transaction: TransactionResponseDto;
    affectedAccountIds: string[];
  }> {
    const existing = await this.transactionRepository.findById(id);
    if (!existing) {
      throw new TransactionNotFoundException(id);
    }
    if (existing.userId !== userId) {
      throw new UnauthorizedTransactionAccessException(id);
    }

    if (
      existing.type === TransactionType.TRANSFER ||
      existing.transferCounterpartId
    ) {
      throw new InvalidTransferException(
        "Los traspasos entre cuentas no se pueden modificar directamente. Deben eliminarse y crearse de nuevo.",
      );
    }

    if (dto.accountId && dto.accountId !== existing.accountId) {
      const account = await this.accountRepository.findById(dto.accountId);
      if (!account) {
        throw new AccountNotFoundException(dto.accountId);
      }
      if (account.userId !== userId) {
        throw new UnauthorizedAccountAccessException(dto.accountId);
      }
    }

    const effectiveType = dto.type ?? existing.type;

    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
        throw new CategoryNotFoundException(dto.categoryId);
      }
      if (category.userId && category.userId !== userId) {
        throw new UnauthorizedCategoryAccessException(dto.categoryId);
      }
    }

    let normalizedAmountCents: bigint | undefined = undefined;
    if (dto.amountCents !== undefined) {
      const absCents = BigInt(Math.abs(dto.amountCents));
      if (absCents === 0n) {
        throw new InvalidTransactionAmountException(
          "El importe de la transacción no puede ser cero",
        );
      }
      normalizedAmountCents =
        effectiveType === TransactionType.EXPENSE ? -absCents : absCents;
    } else if (dto.type !== undefined && dto.type !== existing.type) {
      const absCents =
        existing.amountCents < 0n
          ? -existing.amountCents
          : existing.amountCents;
      normalizedAmountCents =
        effectiveType === TransactionType.EXPENSE ? -absCents : absCents;
    }

    let transactionDate: Date | undefined = undefined;
    if (dto.transactionDate) {
      transactionDate = new Date(dto.transactionDate);
      if (isNaN(transactionDate.getTime())) {
        throw new InvalidTransactionAmountException("La fecha no es válida");
      }
    }

    const result =
      await this.transactionRepository.updateTransactionWithBalance(id, {
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        amountCents: normalizedAmountCents,
        type: dto.type,
        transactionDate,
        description: dto.description,
        notes: dto.notes,
      });

    return {
      transaction: this.toResponseDto(result.transaction),
      affectedAccountIds: result.affectedAccountIds,
    };
  }

  async deleteMultipleTransactions(
    userId: string,
    ids: string[],
  ): Promise<{ deletedCount: number; affectedAccountIds: string[] }> {
    const allAffectedAccounts = new Set<string>();
    let deletedCount = 0;

    for (const id of ids) {
      const tx = await this.transactionRepository.findById(id);
      if (!tx) {
        throw new TransactionNotFoundException(id);
      }
      if (tx.userId !== userId) {
        throw new UnauthorizedTransactionAccessException(id);
      }

      const res =
        await this.transactionRepository.deleteTransactionWithBalance(id);
      deletedCount++;
      res.affectedAccountIds.forEach((accId) => allAffectedAccounts.add(accId));
    }

    return {
      deletedCount,
      affectedAccountIds: Array.from(allAffectedAccounts),
    };
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
