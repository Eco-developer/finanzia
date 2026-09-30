import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FinancialExperienceLevel } from "@prisma/client";

export class UserProfileDetailsDto {
  @ApiProperty({ example: ["control_expenses"] })
  usageGoals: string[];

  @ApiPropertyOptional({ example: "Organizar mis finanzas" })
  customGoal: string | null;

  @ApiProperty({ example: "EUR" })
  preferredCurrency: string;

  @ApiProperty()
  updatedAt: Date;
}

export class UserFinancialProfileDetailsDto {
  @ApiPropertyOptional({ example: "Ingeniero de Software" })
  profession: string | null;

  @ApiPropertyOptional({ example: "30000-50000" })
  annualGrossIncome: string | null;

  @ApiPropertyOptional({ example: false })
  hasRealEstateIncome: boolean | null;

  @ApiPropertyOptional({ example: true })
  hasStockInvestments: boolean | null;

  @ApiPropertyOptional({ example: true })
  hasCryptoInvestments: boolean | null;

  @ApiPropertyOptional({ example: "3-6m" })
  emergencyFundRange: string | null;

  @ApiPropertyOptional({
    enum: FinancialExperienceLevel,
    example: FinancialExperienceLevel.INTERMEDIATE,
  })
  experienceLevel: FinancialExperienceLevel | null;

  @ApiProperty()
  updatedAt: Date;
}

export class UserDisclaimerDetailsDto {
  @ApiProperty({ example: true })
  termsAccepted: boolean;

  @ApiProperty()
  acceptedAt: Date;

  @ApiProperty({ example: "1.0.0" })
  appVersion: string;
}

export class FullProfileResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  userId: string;

  @ApiProperty({ example: "usuario@ejemplo.com" })
  email: string;

  @ApiProperty({ example: "Miguel" })
  firstName: string;

  @ApiPropertyOptional({ example: "García" })
  lastName: string | null;

  @ApiProperty({ example: true })
  emailVerified: boolean;

  @ApiProperty({ example: true })
  onboardingCompleted: boolean;

  @ApiProperty({ example: "EUR" })
  defaultCurrency: string;

  @ApiPropertyOptional({ type: UserProfileDetailsDto })
  profile: UserProfileDetailsDto | null;

  @ApiPropertyOptional({ type: UserFinancialProfileDetailsDto })
  financialProfile: UserFinancialProfileDetailsDto | null;

  @ApiPropertyOptional({ type: UserDisclaimerDetailsDto })
  disclaimerLog: UserDisclaimerDetailsDto | null;
}
