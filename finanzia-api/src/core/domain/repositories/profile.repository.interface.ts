import { UserProfileEntity } from "../entities/user-profile.entity";
import { UserFinancialProfileEntity } from "../entities/user-financial-profile.entity";
import { UserDisclaimerLogEntity } from "../entities/user-disclaimer-log.entity";
import { AccountEntity } from "../entities/account.entity";
import { FinancialExperienceLevel, AccountType } from "@prisma/client";

export interface SaveUserProfileData {
  usageGoals: string[];
  customGoal?: string | null;
  preferredCurrency?: string;
}

export interface SaveFinancialProfileData {
  profession?: string | null;
  annualGrossIncome?: string | null;
  hasRealEstateIncome?: boolean | null;
  hasStockInvestments?: boolean | null;
  hasCryptoInvestments?: boolean | null;
  emergencyFundRange?: string | null;
  experienceLevel?: FinancialExperienceLevel | null;
}

export interface SaveDisclaimerLogData {
  termsAccepted: boolean;
  appVersion?: string;
}

export interface CompleteOnboardingData {
  profile: SaveUserProfileData;
  financialProfile?: SaveFinancialProfileData | null;
  disclaimer: SaveDisclaimerLogData;
  initialAccount: {
    name: string;
    type: AccountType;
    initialBalanceCents: bigint;
    currency?: string;
  };
}

export interface FullUserProfileAggregate {
  profile: UserProfileEntity | null;
  financialProfile: UserFinancialProfileEntity | null;
  disclaimerLog: UserDisclaimerLogEntity | null;
  onboardingCompleted: boolean;
}

export interface IProfileRepository {
  getFullProfile(userId: string): Promise<FullUserProfileAggregate>;
  upsertUserProfile(
    userId: string,
    data: SaveUserProfileData,
  ): Promise<UserProfileEntity>;
  upsertFinancialProfile(
    userId: string,
    data: SaveFinancialProfileData,
  ): Promise<UserFinancialProfileEntity>;
  recordDisclaimerAcceptance(
    userId: string,
    data: SaveDisclaimerLogData,
  ): Promise<UserDisclaimerLogEntity>;
  completeOnboarding(
    userId: string,
    data: CompleteOnboardingData,
  ): Promise<{
    profile: UserProfileEntity;
    financialProfile: UserFinancialProfileEntity | null;
    disclaimerLog: UserDisclaimerLogEntity;
    account: AccountEntity;
  }>;
}

export const PROFILE_REPOSITORY = Symbol("IProfileRepository");
