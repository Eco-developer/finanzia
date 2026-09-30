export class UserDisclaimerLogEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly termsAccepted: boolean,
    public readonly acceptedAt: Date,
    public readonly appVersion: string,
  ) {}
}
