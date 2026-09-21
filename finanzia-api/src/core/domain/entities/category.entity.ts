import { CategoryType } from "../types/financial.types";

export class CategoryEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string | null,
    public readonly parentId: string | null,
    public readonly name: string,
    public readonly icon: string | null,
    public readonly colorHex: string | null,
    public readonly type: CategoryType,
    public readonly isArchived: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  get isSystem(): boolean {
    return this.userId === null;
  }
}
