import { AccountType } from "../types/financial.types";

export class AccountEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly type: AccountType,
    public readonly initialBalanceCents: bigint,
    public readonly currentBalanceCents: bigint,
    public readonly currency: string,
    public readonly isArchived: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
