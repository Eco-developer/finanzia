import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfile } from '@/presentation/hooks/useProfile';
import { profileApi } from '@/infrastructure/api/profile.api';

vi.mock('@/infrastructure/api/profile.api', () => ({
  profileApi: {
    getFullProfile: vi.fn(),
    updateProfile: vi.fn(),
    updateFinancialProfile: vi.fn(),
    getOnboardingStatus: vi.fn(),
    completeOnboarding: vi.fn(),
  },
}));

describe('useProfile Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe exponer los métodos de consulta y mutación', () => {
    const { result } = renderHook(() => useProfile());

    expect(typeof result.current.getFullProfile).toBe('function');
    expect(typeof result.current.updateProfile).toBe('function');
    expect(typeof result.current.updateFinancialProfile).toBe('function');
    expect(typeof result.current.getOnboardingStatus).toBe('function');
    expect(typeof result.current.completeOnboarding).toBe('function');
  });

  it('getFullProfile debe delegar en profileApi.getFullProfile', async () => {
    const mockFullProfile = {
      userId: 'usr-1',
      email: 'test@finanzia.com',
      firstName: 'Miguel',
      lastName: 'García',
      emailVerified: true,
      onboardingCompleted: true,
      defaultCurrency: 'EUR',
      profile: {
        usageGoals: ['control_expenses'],
        preferredCurrency: 'EUR',
      },
      financialProfile: null,
      disclaimerLog: null,
    };

    (profileApi.getFullProfile as any).mockResolvedValue(mockFullProfile);

    const { result } = renderHook(() => useProfile());
    const data = await result.current.getFullProfile();

    expect(profileApi.getFullProfile).toHaveBeenCalled();
    expect(data).toEqual(mockFullProfile);
  });

  it('updateProfile debe delegar en profileApi.updateProfile', async () => {
    const dto = {
      usageGoals: ['control_expenses', 'grow_wealth'],
      customGoal: 'Ahorro para entrada de hipoteca',
      preferredCurrency: 'EUR',
    };

    const mockResponse = { ...dto, updatedAt: new Date().toISOString() };
    (profileApi.updateProfile as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useProfile());
    const updated = await result.current.updateProfile(dto);

    expect(profileApi.updateProfile).toHaveBeenCalledWith(dto);
    expect(updated).toEqual(mockResponse);
  });

  it('updateFinancialProfile debe delegar en profileApi.updateFinancialProfile', async () => {
    const dto = {
      profession: 'Ingeniero de Software',
      annualGrossIncome: '30000-50000',
      hasStockInvestments: true,
      hasCryptoInvestments: true,
      hasRealEstateIncome: false,
      experienceLevel: 'INTERMEDIATE' as const,
    };

    const mockResponse = { ...dto, updatedAt: new Date().toISOString() };
    (profileApi.updateFinancialProfile as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useProfile());
    const updated = await result.current.updateFinancialProfile(dto);

    expect(profileApi.updateFinancialProfile).toHaveBeenCalledWith(dto);
    expect(updated).toEqual(mockResponse);
  });

  it('getOnboardingStatus debe delegar en profileApi.getOnboardingStatus', async () => {
    (profileApi.getOnboardingStatus as any).mockResolvedValue({
      onboardingCompleted: false,
    });

    const { result } = renderHook(() => useProfile());
    const status = await result.current.getOnboardingStatus();

    expect(profileApi.getOnboardingStatus).toHaveBeenCalled();
    expect(status).toEqual({ onboardingCompleted: false });
  });

  it('completeOnboarding debe delegar en profileApi.completeOnboarding', async () => {
    const payload = {
      usageGoals: ['control_expenses'],
      termsAccepted: true,
      accountName: 'Cuenta Nómina',
      accountType: 'CHECKING' as const,
      initialBalanceCents: 200000,
      currency: 'EUR',
    };

    const mockResponse = {
      success: true,
      message: 'Onboarding completado con éxito',
      onboardingCompleted: true,
      account: {
        id: 'acc-1',
        name: 'Cuenta Nómina',
        initialBalanceCents: 200000,
      },
    };

    (profileApi.completeOnboarding as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useProfile());
    const res = await result.current.completeOnboarding(payload);

    expect(profileApi.completeOnboarding).toHaveBeenCalledWith(payload);
    expect(res).toEqual(mockResponse);
  });
});
