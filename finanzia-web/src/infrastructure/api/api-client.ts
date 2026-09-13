/**
 * Cliente HTTP tipado para comunicación con finanzia-api.
 * Incluye automáticamente credenciales para cookies HttpOnly y token Bearer si existe en localStorage.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: Record<string, any>;
  token?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly errors?: any[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('finanzia_token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Imprescindible para cookies HttpOnly
  });

  let jsonResponse: any;
  try {
    jsonResponse = await response.json();
  } catch {
    jsonResponse = null;
  }

  if (!response.ok) {
    const message =
      jsonResponse?.message ||
      jsonResponse?.error ||
      `Error HTTP ${response.status}: ${response.statusText}`;
    const errorCode = jsonResponse?.errorCode || 'API_ERROR';
    const errors = jsonResponse?.errors;

    throw new ApiError(response.status, errorCode, message, errors);
  }

  return jsonResponse as ApiResponse<T>;
}
