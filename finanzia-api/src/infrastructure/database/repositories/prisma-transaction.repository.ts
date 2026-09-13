import { Injectable } from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { TransactionEntity } from "../../../core/domain/entities/transaction.entity";
import {
  ITransactionRepository,
  CreateTransactionData,
  CreateTransferData,
  TransactionFilterData,
} from "../../../core/domain/repositories/transaction.repository.interface";
import { TransactionNotFoundException } from "../../../core/domain/exceptions/transaction-not-found.exception";

@Injectable()
export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTransactionWithBalance(data: CreateTransactionData): Promise<{
    transaction: TransactionEntity;
    newAccountBalanceCents: bigint;
  }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear registro de la transacción
      const record = await tx.transaction.create({
        data: {
          userId: data.userId,
          accountId: data.accountId,
          categoryId: data.categoryId ?? null,
          amountCents: data.amountCents,
          type: data.type,
          transactionDate: data.transactionDate,
          description: data.description.trim(),
          notes: data.notes ?? null,
          isPending: data.isPending ?? false,
          deduplicationHash: data.deduplicationHash ?? null,
          transferCounterpartId: data.transferCounterpartId ?? null,
        },
      });

      // 2. Actualizar atómicamente el saldo de la cuenta (increment suma algebraicamente)
      const updatedAccount = await tx.account.update({
        where: { id: data.accountId },
        data: {
          currentBalanceCents: {
            increment: data.amountCents,
          },
        },
      });

      return {
        transaction: this.toDomain(record),
        newAccountBalanceCents: updatedAccount.currentBalanceCents,
      };
    });
  }

  async createTransferWithBalances(data: CreateTransferData): Promise<{
    fromTransaction: TransactionEntity;
    toTransaction: TransactionEntity;
    newFromBalanceCents: bigint;
    newToBalanceCents: bigint;
  }> {
    const positiveAmount =
      data.amountCents < 0n ? -data.amountCents : data.amountCents;

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear transacción de salida (origen)
      const fromRecord = await tx.transaction.create({
        data: {
          userId: data.userId,
          accountId: data.fromAccountId,
          categoryId: null,
          amountCents: -positiveAmount,
          type: TransactionType.TRANSFER,
          transactionDate: data.transactionDate,
          description: data.description.trim(),
          notes: data.notes ?? null,
          isPending: false,
        },
      });

      // 2. Crear transacción de entrada (destino) vinculada a origen
      const toRecord = await tx.transaction.create({
        data: {
          userId: data.userId,
          accountId: data.toAccountId,
          categoryId: null,
          amountCents: positiveAmount,
          type: TransactionType.TRANSFER,
          transactionDate: data.transactionDate,
          description: data.description.trim(),
          notes: data.notes ?? null,
          isPending: false,
          transferCounterpartId: fromRecord.id,
        },
      });

      // 3. Vincular contrapartida en la transacción de origen
      const updatedFromRecord = await tx.transaction.update({
        where: { id: fromRecord.id },
        data: {
          transferCounterpartId: toRecord.id,
        },
      });

      // 4. Actualizar saldos de ambas cuentas atómicamente
      const updatedFromAccount = await tx.account.update({
        where: { id: data.fromAccountId },
        data: {
          currentBalanceCents: {
            decrement: positiveAmount,
          },
        },
      });

      const updatedToAccount = await tx.account.update({
        where: { id: data.toAccountId },
        data: {
          currentBalanceCents: {
            increment: positiveAmount,
          },
        },
      });

      return {
        fromTransaction: this.toDomain(updatedFromRecord),
        toTransaction: this.toDomain(toRecord),
        newFromBalanceCents: updatedFromAccount.currentBalanceCents,
        newToBalanceCents: updatedToAccount.currentBalanceCents,
      };
    });
  }

  async findAllByUserId(
    userId: string,
    filter: TransactionFilterData,
  ): Promise<{ transactions: TransactionEntity[]; totalRecords: number }> {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      ...(filter.accountId ? { accountId: filter.accountId } : {}),
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.startDate || filter.endDate
        ? {
            transactionDate: {
              ...(filter.startDate ? { gte: filter.startDate } : {}),
              ...(filter.endDate ? { lte: filter.endDate } : {}),
            },
          }
        : {}),
    };

    const [records, totalRecords] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { transactionDate: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions: records.map((r) => this.toDomain(r)),
      totalRecords,
    };
  }

  async findById(id: string): Promise<TransactionEntity | null> {
    const record = await this.prisma.transaction.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async deleteTransactionWithBalance(
    id: string,
  ): Promise<{ deletedId: string; affectedAccountIds: string[] }> {
    return this.prisma.$transaction(async (tx) => {
      const txRecord = await tx.transaction.findUnique({
        where: { id },
      });

      if (!txRecord) {
        throw new TransactionNotFoundException(id);
      }

      const affectedAccountIds = [txRecord.accountId];

      // Si es transferencia y tiene contrapartida enlazada
      if (txRecord.transferCounterpartId) {
        const counterpart = await tx.transaction.findUnique({
          where: { id: txRecord.transferCounterpartId },
        });

        if (counterpart) {
          affectedAccountIds.push(counterpart.accountId);

          // Revertir saldo contrapartida
          await tx.account.update({
            where: { id: counterpart.accountId },
            data: {
              currentBalanceCents: {
                decrement: counterpart.amountCents,
              },
            },
          });

          // Desvincular para evitar conflicto de clave foránea y borrar
          await tx.transaction.update({
            where: { id: txRecord.id },
            data: { transferCounterpartId: null },
          });

          await tx.transaction.update({
            where: { id: counterpart.id },
            data: { transferCounterpartId: null },
          });

          await tx.transaction.delete({
            where: { id: counterpart.id },
          });
        }
      }

      // Revertir saldo de la cuenta principal
      await tx.account.update({
        where: { id: txRecord.accountId },
        data: {
          currentBalanceCents: {
            decrement: txRecord.amountCents,
          },
        },
      });

      await tx.transaction.delete({
        where: { id: txRecord.id },
      });

      return {
        deletedId: id,
        affectedAccountIds,
      };
    });
  }

  private toDomain(record: any): TransactionEntity {
    return new TransactionEntity(
      record.id,
      record.userId,
      record.accountId,
      record.categoryId,
      record.amountCents,
      record.type,
      record.transactionDate,
      record.description,
      record.notes,
      record.isPending,
      record.transferCounterpartId,
      record.deduplicationHash,
      record.createdAt,
      record.updatedAt,
    );
  }
}
