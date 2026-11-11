/**
 * JSON client for our API.
 * - Development: same-origin `/api/...`, which Vite proxies to the local server.
 * - Production: `VITE_API_URL` is the API's origin (e.g. the Render service), called
 *   directly with CORS; the API must list this site's origin in `CORS_ORIGINS`.
 *
 * Every API error has the shape { error: { code, message, requestId, fields? } }.
 * Network failures surface as code 'NETWORK' with status 0.
 */

const API_BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')}/api`;

export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly code: string;
  /** Field name → message, for VALIDATION_FAILED. */
  readonly fields: Readonly<Record<string, string>>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  /** Supabase access token, sent as a Bearer token. */
  token?: string;
}

/** Resolves to the parsed JSON body; the caller states its shape. Throws ApiError. */
export async function apiRequest(path: string, options: RequestOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token !== undefined) headers.Authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Check your connection and try again.');
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, data);
  return data;
}

function toApiError(status: number, data: unknown): ApiError {
  const error =
    typeof data === 'object' && data !== null && 'error' in data ? data.error : undefined;
  if (typeof error === 'object' && error !== null) {
    const { code, message, fields } = error as Record<string, unknown>;
    if (typeof code === 'string' && typeof message === 'string') {
      return new ApiError(status, code, message, isStringRecord(fields) ? fields : {});
    }
  }
  return new ApiError(status, 'UNKNOWN', 'Something went wrong. Please try again.');
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((v) => typeof v === 'string')
  );
}

/**
 * Failures that may succeed if tried again shortly: no network, timeouts, rate
 * limits and server errors (e.g. the API restarting or waking up). Never 4xx
 * answers like 401/403/404, which mean what they say.
 */
export function isTransient(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500)
  );
}

/** Runs `task`, retrying transient failures after each delay in turn. Stops if aborted. */
export async function retryTransient<T>(
  task: () => Promise<T>,
  delaysMs: readonly number[],
  signal?: AbortSignal,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      const delay = delaysMs[attempt];
      if (delay === undefined || !isTransient(error) || signal?.aborted) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (signal?.aborted) throw error;
    }
  }
}
