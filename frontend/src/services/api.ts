import type { ApiErrorResponse } from '../types';

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  userId?: number | string | null;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { userId, body, params, headers: customHeaders, ...rest } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (userId !== undefined && userId !== null) {
    headers['X-User-Id'] = String(userId);
  }

  const response = await fetch(url, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const responseData = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorBody = responseData as ApiErrorResponse;
    const code = errorBody?.error?.code || 'HTTP_ERROR';
    const message = errorBody?.error?.message || response.statusText || 'Request failed';
    throw new ApiError(response.status, code, message, errorBody?.error?.details);
  }

  return responseData as T;
}
