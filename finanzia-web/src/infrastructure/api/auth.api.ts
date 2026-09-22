import { apiClient } from './api-client';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  defaultCurrency?: string;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  defaultCurrency?: string;
}

export const authApi = {
  async login(dto: LoginDto): Promise<{ user: UserProfile; token?: string }> {
    const res = await apiClient<UserProfile>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

    return {
      user: res.data,
      token: res.token,
    };
  },

  async register(
    dto: RegisterDto
  ): Promise<{ user: UserProfile; token?: string; requiresVerification?: boolean }> {
    const res = await apiClient<UserProfile>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

    return {
      user: res.data,
      token: res.token,
      requiresVerification: (res as any).requiresVerification,
    };
  },

  async verifyEmail(
    token: string
  ): Promise<{ verified: boolean; email?: string; message?: string }> {
    const res = await apiClient<{ verified: boolean; email?: string; message?: string }>(
      '/auth/verify-email',
      {
        method: 'POST',
        body: JSON.stringify({ token }),
      }
    );
    return res.data;
  },

  async resendVerification(
    email: string
  ): Promise<{ sent: boolean; message: string }> {
    const res = await apiClient<{ sent: boolean; message: string }>(
      '/auth/resend-verification',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar fallo de logout en backend
    }
  },

  async getMe(): Promise<UserProfile> {
    const res = await apiClient<UserProfile>('/auth/me');
    return res.data;
  },
};
