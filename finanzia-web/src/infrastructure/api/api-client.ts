/**
 * Cliente HTTP tipado para comunicación con finanzia-api.
 * Incluye automáticamente credenciales para cookies HttpOnly y token Bearer si existe en localStorage.
 */

function getBaseApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!envUrl) {
    return 'http://localhost:3001/api';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
}

export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const base = getBaseApiUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (path.startsWith('/api/')) {
    const rootBase = base.endsWith('/api') ? base.slice(0, -4) : base;
    return `${rootBase}${path}`;
  }

  return `${base}${path}`;
}

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
  const url = buildApiUrl(endpoint);

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('finanzia_token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
      headers,
      credentials: 'include', // Imprescindible para cookies HttpOnly
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new ApiError(408, 'TIMEOUT', 'La solicitud al servidor ha superado el tiempo de espera.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  let jsonResponse: any;
  try {
    jsonResponse = await response.json();
  } catch {
    jsonResponse = null;
  }

  if (!response.ok) {
    const rawMessage =
      jsonResponse?.message ||
      jsonResponse?.error ||
      `Error HTTP ${response.status}: ${response.statusText}`;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join('. ')
      : String(rawMessage);
    const errorCode = jsonResponse?.errorCode || 'API_ERROR';
    const errors = jsonResponse?.errors;

    throw new ApiError(response.status, errorCode, message, errors);
  }

  return jsonResponse as ApiResponse<T>;
}
