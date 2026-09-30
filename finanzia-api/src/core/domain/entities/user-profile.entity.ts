export class UserProfileEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly usageGoals: string[],
    public readonly customGoal: string | null,
    public readonly preferredCurrency: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
