import { DebtStatus, InterestRateType } from "../types/debt.types";
import { DebtAmortizationEntity } from "./debt-amortization.entity";

export class DebtEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly concept: string,
    public readonly creditor: string | null,
    public readonly initialAmountCents: bigint,
    public readonly remainingAmountCents: bigint,
    public readonly interestRateBasisPts: number, // ej. 750 = 7.50%
    public readonly interestRateType: InterestRateType,
    public readonly minimumMonthlyPaymentCents: bigint | null,
    public readonly dueDate: Date | null,
    public readonly status: DebtStatus,
    public readonly paidOffAt: Date | null,
    public readonly isImmutable: boolean,
    public readonly notes: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly amortizations: DebtAmortizationEntity[] = [],
  ) {}

  /**
   * Porcentaje de amortización completado (0 a 100%)
   */
  get progressPercentage(): number {
    if (this.initialAmountCents <= 0n) return 100;
    const paidCents = this.initialAmountCents - this.remainingAmountCents;
    if (paidCents <= 0n) return 0;
    const pct = Number((paidCents * 10000n) / this.initialAmountCents) / 100;
    return Math.min(100, Math.max(0, pct));
  }

  /**
   * Total efectivamente amortizado en céntimos
   */
  get paidAmountCents(): bigint {
    const paid = this.initialAmountCents - this.remainingAmountCents;
    return paid > 0n ? paid : 0n;
  }

  /**
   * Indica si la deuda ha sido liquidada al 100%
   */
  get isFullyPaid(): boolean {
    return this.status === DebtStatus.PAID_OFF || this.remainingAmountCents <= 0n;
  }

  /**
   * Tasa anual proporcional en puntos básicos
   */
  get annualRateBasisPts(): number {
    if (this.interestRateType === InterestRateType.ANNUAL) {
      return this.interestRateBasisPts;
    }
    return this.interestRateBasisPts * 12;
  }

  /**
   * Tasa mensual proporcional en puntos básicos
   */
  get monthlyRateBasisPts(): number {
    if (this.interestRateType === InterestRateType.MONTHLY) {
      return this.interestRateBasisPts;
    }
    return Math.round(this.interestRateBasisPts / 12);
  }

  /**
   * Lanza excepción si la deuda ya fue liquidada al 100% y es inmutable
   */
  assertCanBeModified(): void {
    if (this.isImmutable || this.status === DebtStatus.PAID_OFF) {
      throw new Error(
        "Esta deuda ha sido amortizada al 100% y se encuentra blindada de forma inmutable en el historial.",
      );
    }
  }
}
