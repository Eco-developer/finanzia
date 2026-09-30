import { useCallback } from 'react';
import { profileApi } from '@/infrastructure/api/profile.api';
import {
  FullProfileResponse,
  CompleteOnboardingPayload,
  OnboardingStatusResponse,
  UserProfileData,
  UserFinancialProfileData,
  FinancialExperienceLevel,
} from '@/core/domain/profile/profile.types';

export type {
  FullProfileResponse,
  CompleteOnboardingPayload,
  OnboardingStatusResponse,
  UserProfileData,
  UserFinancialProfileData,
  FinancialExperienceLevel,
};

export function useProfile() {
  const getFullProfile = useCallback(async (): Promise<FullProfileResponse> => {
    return await profileApi.getFullProfile();
  }, []);

  const updateProfile = useCallback(
    async (dto: {
      usageGoals: string[];
      customGoal?: string;
      preferredCurrency?: string;
    }): Promise<UserProfileData> => {
      return await profileApi.updateProfile(dto);
    },
    [],
  );

  const updateFinancialProfile = useCallback(
    async (
      dto: Partial<UserFinancialProfileData>,
    ): Promise<UserFinancialProfileData> => {
      return await profileApi.updateFinancialProfile(dto);
    },
    [],
  );

  const getOnboardingStatus = useCallback(async (): Promise<OnboardingStatusResponse> => {
    return await profileApi.getOnboardingStatus();
  }, []);

  const completeOnboarding = useCallback(
    async (payload: CompleteOnboardingPayload) => {
      return await profileApi.completeOnboarding(payload);
    },
    [],
  );

  return {
    getFullProfile,
    updateProfile,
    updateFinancialProfile,
    getOnboardingStatus,
    completeOnboarding,
  };
}
