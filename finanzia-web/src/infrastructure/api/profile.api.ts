import { apiClient } from './api-client';
import {
  FullProfileResponse,
  CompleteOnboardingPayload,
  OnboardingStatusResponse,
  UserProfileData,
  UserFinancialProfileData,
} from '@/core/domain/profile/profile.types';

export const profileApi = {
  async getFullProfile(): Promise<FullProfileResponse> {
    const res = await apiClient<FullProfileResponse>('/profile');
    return (res as any)?.data || res;
  },

  async updateProfile(dto: {
    usageGoals: string[];
    customGoal?: string;
    preferredCurrency?: string;
  }): Promise<UserProfileData> {
    const res = await apiClient<UserProfileData>('/profile', {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return (res as any)?.data || res;
  },

  async updateFinancialProfile(
    dto: Partial<UserFinancialProfileData>,
  ): Promise<UserFinancialProfileData> {
    const res = await apiClient<UserFinancialProfileData>('/profile/financial', {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return (res as any)?.data || res;
  },

  async getOnboardingStatus(): Promise<OnboardingStatusResponse> {
    const res = await apiClient<OnboardingStatusResponse>('/onboarding/status');
    return (res as any)?.data || res;
  },

  async completeOnboarding(
    payload: CompleteOnboardingPayload,
  ): Promise<{
    success: boolean;
    message: string;
    onboardingCompleted: boolean;
    account: any;
  }> {
    const res = await apiClient('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return (res as any)?.data || res;
  },
};
