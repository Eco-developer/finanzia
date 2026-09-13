import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/core/application/auth/auth.context';
import { authApi } from '@/infrastructure/api/auth.api';

describe('AuthContext & useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicializa con usuario autenticado si authApi.getMe tiene éxito', async () => {
    const mockUser = {
      id: 'usr-1',
      email: 'test@finanzia.local',
      firstName: 'Miguel',
    };

    vi.spyOn(authApi, 'getMe').mockResolvedValue(mockUser);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      // Espera resolución de refreshUser en useEffect
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('permite cerrar sesión limpiando el usuario', async () => {
    const mockUser = {
      id: 'usr-1',
      email: 'test@finanzia.local',
      firstName: 'Miguel',
    };

    vi.spyOn(authApi, 'getMe').mockResolvedValue(mockUser);
    vi.spyOn(authApi, 'logout').mockResolvedValue(undefined);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
