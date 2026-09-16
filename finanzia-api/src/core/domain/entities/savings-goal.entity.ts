export class SavingsGoalEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly targetAmountCents: bigint,
    public readonly currentAmountCents: bigint,
    public readonly targetDate: Date | null,
    public readonly isCompleted: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  get progressPercentage(): number {
    if (this.targetAmountCents <= 0n) return 100;
    const pct = Number((this.currentAmountCents * 10000n) / this.targetAmountCents) / 100;
    return Math.min(100, Math.max(0, pct));
  }

  get remainingCents(): bigint {
    const diff = this.targetAmountCents - this.currentAmountCents;
    return diff > 0n ? diff : 0n;
  }

  get daysRemaining(): number | null {
    if (!this.targetDate) return null;
    const now = new Date();
    const diffMs = this.targetDate.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
}
