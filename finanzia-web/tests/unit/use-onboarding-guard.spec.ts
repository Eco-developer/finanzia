import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOnboardingGuard } from '@/presentation/hooks/useOnboardingGuard';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

let mockAuthState: {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
} = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

vi.mock('@/presentation/context/auth.context', () => ({
  useAuth: () => mockAuthState,
}));

describe('useOnboardingGuard Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no redirige mientras la autenticación esté cargando (isLoading: true)', () => {
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: true,
    };

    const { result } = renderHook(() => useOnboardingGuard());

    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAllowed).toBe(false);
  });

  it('redirige a /login si no está autenticado', () => {
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };

    const { result } = renderHook(() => useOnboardingGuard());

    expect(mockReplace).toHaveBeenCalledWith('/login');
    expect(result.current.isAllowed).toBe(false);
  });

  it('redirige a /onboarding si el usuario está autenticado pero no ha completado el onboarding', () => {
    mockAuthState = {
      user: { id: 'usr-1', email: 'test@finanzia.com', onboardingCompleted: false },
      isAuthenticated: true,
      isLoading: false,
    };

    const { result } = renderHook(() => useOnboardingGuard());

    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    expect(result.current.isAllowed).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('permite el acceso (isAllowed: true) cuando el usuario completó el onboarding', () => {
    mockAuthState = {
      user: { id: 'usr-1', email: 'test@finanzia.com', onboardingCompleted: true },
      isAuthenticated: true,
      isLoading: false,
    };

    const { result } = renderHook(() => useOnboardingGuard());

    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.isAllowed).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});
