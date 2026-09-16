export class BudgetEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly categoryId: string,
    public readonly amountLimitCents: bigint,
    public readonly periodMonth: number,
    public readonly periodYear: number,
    public readonly alertThresholdPct: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly categoryName?: string,
    public readonly categoryColorHex?: string | null,
    public readonly categoryIcon?: string | null,
  ) {}
}
