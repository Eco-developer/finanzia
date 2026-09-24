import { DebtEntity } from "../entities/debt.entity";
import { DebtAmortizationEntity } from "../entities/debt-amortization.entity";
import { DebtStatus } from "../types/debt.types";

export const DEBT_REPOSITORY = Symbol("DEBT_REPOSITORY");

export interface IDebtRepository {
  create(
    data: Omit<
      DebtEntity,
      "id" | "createdAt" | "updatedAt" | "amortizations" | "progressPercentage" | "paidAmountCents" | "isFullyPaid" | "annualRateBasisPts" | "monthlyRateBasisPts" | "assertCanBeModified"
    >,
  ): Promise<DebtEntity>;

  findById(id: string, userId: string): Promise<DebtEntity | null>;

  findByUserId(userId: string, status?: DebtStatus): Promise<DebtEntity[]>;

  update(debt: DebtEntity): Promise<DebtEntity>;

  delete(id: string, userId: string): Promise<void>;

  createAmortization(
    data: Omit<DebtAmortizationEntity, "id" | "createdAt">,
  ): Promise<DebtAmortizationEntity>;

  getAmortizationsByDebtId(
    debtId: string,
    userId: string,
  ): Promise<DebtAmortizationEntity[]>;

  executeAmortizationTransaction(params: {
    debt: DebtEntity;
    amortization: Omit<DebtAmortizationEntity, "id" | "createdAt">;
    accountDebit?: {
      accountId: string;
      amountCents: bigint;
      description: string;
      date: Date;
    };
  }): Promise<{ debt: DebtEntity; amortization: DebtAmortizationEntity }>;
}
