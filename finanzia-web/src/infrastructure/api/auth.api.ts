import { apiClient } from './api-client';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  defaultCurrency?: string;
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

  async register(dto: RegisterDto): Promise<{ user: UserProfile; token?: string }> {
    const res = await apiClient<UserProfile>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

    return {
      user: res.data,
      token: res.token,
    };
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
