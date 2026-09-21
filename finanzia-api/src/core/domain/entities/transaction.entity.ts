import { TransactionType } from "../types/financial.types";

export class TransactionEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly accountId: string,
    public readonly categoryId: string | null,
    public readonly amountCents: bigint,
    public readonly type: TransactionType,
    public readonly transactionDate: Date,
    public readonly description: string,
    public readonly notes: string | null,
    public readonly isPending: boolean,
    public readonly transferCounterpartId: string | null,
    public readonly deduplicationHash: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
