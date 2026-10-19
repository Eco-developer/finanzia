export class SessionEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tokenHash: string,
    public readonly deviceInfo: string | null,
    public readonly ipAddress: string | null,
    public readonly expiresAt: Date,
    public readonly isRevoked: boolean,
    public readonly revokedAt: Date | null,
    public readonly replacedByTokenHash: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }
}
