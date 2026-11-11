/**
 * JSON client for our API. Always same-origin `/api/...`: Vite proxies it in
 * development and a reverse proxy does in production (see README).
 *
 * Every API error has the shape { error: { code, message, requestId, fields? } }.
 * Network failures surface as code 'NETWORK' with status 0.
 */

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
    response = await fetch(`/api${path}`, {
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
