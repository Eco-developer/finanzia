import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { DebtEntity } from "../../../core/domain/entities/debt.entity";
import { DebtAmortizationEntity } from "../../../core/domain/entities/debt-amortization.entity";
import { IDebtRepository } from "../../../core/domain/repositories/debt.repository.interface";
import {
  DebtStatus,
  InterestRateType,
} from "../../../core/domain/types/debt.types";
import {
  Debt as PrismaDebt,
  DebtAmortization as PrismaDebtAmortization,
  TransactionType,
} from "@prisma/client";

@Injectable()
export class PrismaDebtRepository implements IDebtRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<
      DebtEntity,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "amortizations"
      | "progressPercentage"
      | "paidAmountCents"
      | "isFullyPaid"
      | "annualRateBasisPts"
      | "monthlyRateBasisPts"
      | "assertCanBeModified"
    >,
  ): Promise<DebtEntity> {
    const record = await this.prisma.debt.create({
      data: {
        userId: data.userId,
        concept: data.concept.trim(),
        creditor: data.creditor ? data.creditor.trim() : null,
        initialAmountCents: data.initialAmountCents,
        remainingAmountCents: data.remainingAmountCents,
        interestRateBasisPts: data.interestRateBasisPts,
        interestRateType: data.interestRateType,
        minimumMonthlyPaymentCents: data.minimumMonthlyPaymentCents ?? null,
        dueDate: data.dueDate ?? null,
        status: data.status,
        paidOffAt: data.paidOffAt ?? null,
        isImmutable: data.isImmutable,
        notes: data.notes ? data.notes.trim() : null,
      },
      include: {
        amortizations: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    return this.toDomain(record);
  }

  async findById(id: string, userId: string): Promise<DebtEntity | null> {
    const record = await this.prisma.debt.findFirst({
      where: { id, userId },
      include: {
        amortizations: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findByUserId(
    userId: string,
    status?: DebtStatus,
  ): Promise<DebtEntity[]> {
    const records = await this.prisma.debt.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      include: {
        amortizations: {
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return records.map((r) => this.toDomain(r));
  }

  async update(debt: DebtEntity): Promise<DebtEntity> {
    const record = await this.prisma.debt.update({
      where: { id: debt.id },
      data: {
        concept: debt.concept.trim(),
        creditor: debt.creditor ? debt.creditor.trim() : null,
        initialAmountCents: debt.initialAmountCents,
        remainingAmountCents: debt.remainingAmountCents,
        interestRateBasisPts: debt.interestRateBasisPts,
        interestRateType: debt.interestRateType,
        minimumMonthlyPaymentCents: debt.minimumMonthlyPaymentCents ?? null,
        dueDate: debt.dueDate ?? null,
        status: debt.status,
        paidOffAt: debt.paidOffAt ?? null,
        isImmutable: debt.isImmutable,
        notes: debt.notes ? debt.notes.trim() : null,
      },
      include: {
        amortizations: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    return this.toDomain(record);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.prisma.debt.deleteMany({
      where: { id, userId },
    });
  }

  async createAmortization(
    data: Omit<DebtAmortizationEntity, "id" | "createdAt">,
  ): Promise<DebtAmortizationEntity> {
    const record = await this.prisma.debtAmortization.create({
      data: {
        debtId: data.debtId,
        userId: data.userId,
        accountId: data.accountId ?? null,
        transactionId: data.transactionId ?? null,
        amountCents: data.amountCents,
        principalCents: data.principalCents,
        interestCents: data.interestCents,
        remainingAfterCents: data.remainingAfterCents,
        paymentDate: data.paymentDate,
        notes: data.notes ? data.notes.trim() : null,
      },
    });

    return this.toAmortizationDomain(record);
  }

  async getAmortizationsByDebtId(
    debtId: string,
    userId: string,
  ): Promise<DebtAmortizationEntity[]> {
    const records = await this.prisma.debtAmortization.findMany({
      where: { debtId, userId },
      orderBy: { paymentDate: "desc" },
    });

    return records.map((r) => this.toAmortizationDomain(r));
  }

  async executeAmortizationTransaction(params: {
    debt: DebtEntity;
    amortization: Omit<DebtAmortizationEntity, "id" | "createdAt">;
    accountDebit?: {
      accountId: string;
      amountCents: bigint;
      description: string;
      date: Date;
    };
  }): Promise<{ debt: DebtEntity; amortization: DebtAmortizationEntity }> {
    return await this.prisma.$transaction(async (tx) => {
      let createdTransactionId: string | null = null;

      // 1. Si se indicó cuenta bancaria, debitar saldo y registrar transacción contable
      if (params.accountDebit) {
        const account = await tx.account.findFirst({
          where: {
            id: params.accountDebit.accountId,
            userId: params.debt.userId,
          },
        });

        if (account) {
          // Descontar saldo de la cuenta
          await tx.account.update({
            where: { id: account.id },
            data: {
              currentBalanceCents: {
                decrement: params.accountDebit.amountCents,
              },
            },
          });

          // Crear transacción de gasto vinculada
          const createdTx = await tx.transaction.create({
            data: {
              userId: params.debt.userId,
              accountId: account.id,
              amountCents: -params.accountDebit.amountCents, // Negativo para gasto
              type: TransactionType.EXPENSE,
              transactionDate: params.accountDebit.date,
              description: params.accountDebit.description,
            },
          });

          createdTransactionId = createdTx.id;
        }
      }

      // 2. Actualizar la deuda (saldo vivo, estado y sellado al 100% si aplica)
      const updatedDebt = await tx.debt.update({
        where: { id: params.debt.id },
        data: {
          remainingAmountCents: params.debt.remainingAmountCents,
          status: params.debt.status,
          paidOffAt: params.debt.paidOffAt,
          isImmutable: params.debt.isImmutable,
        },
        include: {
          amortizations: {
            orderBy: { paymentDate: "desc" },
          },
        },
      });

      // 3. Crear el registro de amortización
      const createdAmortization = await tx.debtAmortization.create({
        data: {
          debtId: params.debt.id,
          userId: params.debt.userId,
          accountId:
            params.accountDebit?.accountId ??
            params.amortization.accountId ??
            null,
          transactionId:
            createdTransactionId ?? params.amortization.transactionId ?? null,
          amountCents: params.amortization.amountCents,
          principalCents: params.amortization.principalCents,
          interestCents: params.amortization.interestCents,
          remainingAfterCents: params.amortization.remainingAfterCents,
          paymentDate: params.amortization.paymentDate,
          notes: params.amortization.notes
            ? params.amortization.notes.trim()
            : null,
        },
      });

      return {
        debt: this.toDomain(updatedDebt),
        amortization: this.toAmortizationDomain(createdAmortization),
      };
    });
  }

  private toDomain(
    record: PrismaDebt & { amortizations?: PrismaDebtAmortization[] },
  ): DebtEntity {
    return new DebtEntity(
      record.id,
      record.userId,
      record.concept,
      record.creditor,
      record.initialAmountCents,
      record.remainingAmountCents,
      record.interestRateBasisPts,
      record.interestRateType as InterestRateType,
      record.minimumMonthlyPaymentCents,
      record.dueDate,
      record.status as DebtStatus,
      record.paidOffAt,
      record.isImmutable,
      record.notes,
      record.createdAt,
      record.updatedAt,
      record.amortizations
        ? record.amortizations.map((a) => this.toAmortizationDomain(a))
        : [],
    );
  }

  private toAmortizationDomain(
    record: PrismaDebtAmortization,
  ): DebtAmortizationEntity {
    return new DebtAmortizationEntity(
      record.id,
      record.debtId,
      record.userId,
      record.accountId,
      record.transactionId,
      record.amountCents,
      record.principalCents,
      record.interestCents,
      record.remainingAfterCents,
      record.paymentDate,
      record.notes,
      record.createdAt,
    );
  }
}
