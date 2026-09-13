export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly firstName: string,
    public readonly lastName: string | null,
    public readonly defaultCurrency: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
