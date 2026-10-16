import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from '@/infrastructure/api/api-client';

describe('apiClient HTTP Interceptor & Refresh Mutex', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('debe realizar peticiones GET exitosas incluyendo credenciales y token', async () => {
    localStorage.setItem('finanzia_token', 'valid-jwt-token');

    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'account-1', name: 'Cuenta Corriente' },
      }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await apiClient('/accounts');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/accounts'),
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-jwt-token',
        }),
      }),
    );
    expect(result.data).toEqual({ id: 'account-1', name: 'Cuenta Corriente' });
  });

  it('debe interceptar 401, renovar token mediante /auth/refresh y reintentar la petición original con éxito', async () => {
    localStorage.setItem('finanzia_token', 'expired-token');

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      // Primer llamado a /accounts -> 401
      if (url.includes('/accounts') && callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Token expired' }),
        });
      }
      // Llamado a /auth/refresh -> 200 con nuevo token
      if (url.includes('/auth/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, token: 'new-fresh-token' }),
        });
      }
      // Reintento de /accounts -> 200
      if (url.includes('/accounts') && callCount === 3) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: [{ id: '1', balance: 5000 }] }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch call'));
    });

    const result = await apiClient('/accounts');

    expect(result.data).toEqual([{ id: '1', balance: 5000 }]);
    expect(localStorage.getItem('finanzia_token')).toBe('new-fresh-token');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('no debe intentar refrescar si la ruta es de autenticación (/auth/login)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ message: 'Credenciales inválidas' }),
    });

    await expect(apiClient('/auth/login', { method: 'POST' })).rejects.toThrow(ApiError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('debe limpiar token y lanzar ApiError si el refresco también falla (401)', async () => {
    localStorage.setItem('finanzia_token', 'expired-token');

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/accounts')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        });
      }
      if (url.includes('/auth/refresh')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Refresh token expired' }),
        });
      }
      return Promise.reject(new Error('Unexpected call'));
    });

    await expect(apiClient('/accounts')).rejects.toThrow(ApiError);
    expect(localStorage.getItem('finanzia_token')).toBeNull();
  });
});
