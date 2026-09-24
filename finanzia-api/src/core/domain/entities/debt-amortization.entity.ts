export class DebtAmortizationEntity {
  constructor(
    public readonly id: string,
    public readonly debtId: string,
    public readonly userId: string,
    public readonly accountId: string | null,
    public readonly transactionId: string | null,
    public readonly amountCents: bigint,
    public readonly principalCents: bigint,
    public readonly interestCents: bigint,
    public readonly remainingAfterCents: bigint,
    public readonly paymentDate: Date,
    public readonly notes: string | null,
    public readonly createdAt: Date,
  ) {}
}
