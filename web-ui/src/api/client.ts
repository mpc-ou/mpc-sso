export class ApiError extends Error {
  status: number;
  errorI18n: { vi: string; en: string } | null;

  constructor(status: number, message: string, i18n?: { vi: string; en: string } | null) {
    super(message);
    this.status = status;
    this.errorI18n = i18n ?? null;
  }
}

interface BackendErrorBody {
  message?: string | string[];
  error_description?: string | { vi: string; en: string };
  error_i18n?: { vi: string; en: string };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = (await res.json().catch(() => null)) as BackendErrorBody | T | null;

  if (!res.ok) {
    const errorBody = body as BackendErrorBody | null;
    const rawI18n = errorBody?.error_i18n;
    const desc = errorBody?.error_description;
    const message =
      rawI18n?.vi ??
      (typeof desc === 'string' ? desc : desc?.vi) ??
      (Array.isArray(errorBody?.message) ? errorBody.message.join('; ') : errorBody?.message) ??
      res.statusText;
    throw new ApiError(res.status, message, rawI18n ?? null);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, data?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'POST',
      body: data instanceof FormData ? data : (data !== undefined ? JSON.stringify(data) : undefined),
    }),
  patch: <T>(path: string, data?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'PATCH',
      body: data instanceof FormData ? data : (data !== undefined ? JSON.stringify(data) : undefined),
    }),
  delete: <T>(path: string, data?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'DELETE',
      body: data instanceof FormData ? data : (data !== undefined ? JSON.stringify(data) : undefined),
    }),
};
