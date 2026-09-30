import { FinancialExperienceLevel } from "@prisma/client";

export class UserFinancialProfileEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly profession: string | null,
    public readonly annualGrossIncome: string | null,
    public readonly hasRealEstateIncome: boolean | null,
    public readonly hasStockInvestments: boolean | null,
    public readonly hasCryptoInvestments: boolean | null,
    public readonly emergencyFundRange: string | null,
    public readonly experienceLevel: FinancialExperienceLevel | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
