export type FinancialExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export const FINANCIAL_EXPERIENCE_LEVELS: FinancialExperienceLevel[] = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
];

export interface UserProfileData {
  usageGoals: string[];
  customGoal: string | null;
  preferredCurrency: string;
  updatedAt?: string;
}

export interface UserFinancialProfileData {
  profession: string | null;
  annualGrossIncome: string | null;
  hasRealEstateIncome: boolean | null;
  hasStockInvestments: boolean | null;
  hasCryptoInvestments: boolean | null;
  emergencyFundRange: string | null;
  experienceLevel: FinancialExperienceLevel | null;
  updatedAt?: string;
}

export interface UserDisclaimerLogData {
  termsAccepted: boolean;
  acceptedAt: string;
  appVersion: string;
}

export interface FullProfileResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  defaultCurrency: string;
  profile: UserProfileData | null;
  financialProfile: UserFinancialProfileData | null;
  disclaimerLog: UserDisclaimerLogData | null;
}

export interface CompleteOnboardingPayload {
  // Paso 1
  usageGoals: string[];
  customGoal?: string;
  preferredCurrency?: string;

  // Paso 2 (Opcional)
  profession?: string;
  annualGrossIncome?: string;
  hasRealEstateIncome?: boolean;
  hasStockInvestments?: boolean;
  hasCryptoInvestments?: boolean;
  emergencyFundRange?: string;
  experienceLevel?: FinancialExperienceLevel;

  // Paso 3
  termsAccepted: boolean;

  // Paso 4
  accountName: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT';
  initialBalanceCents: number;
  currency?: string;
}

export interface OnboardingStatusResponse {
  onboardingCompleted: boolean;
}
