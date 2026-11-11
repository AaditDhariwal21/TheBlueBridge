/**
 * The API's only error type. Anything thrown that is not an AppError becomes a
 * generic 500 in the error handler, so internals never reach the client.
 */

const STATUS = {
  VALIDATION_FAILED: 400,
  INVALID_REFERRAL_CODE: 400,
  UNAUTHENTICATED: 401,
  ACCOUNT_NOT_APPROVED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof STATUS;

/** Field name → message, for VALIDATION_FAILED. "_" holds errors not tied to a field. */
export type FieldErrors = Record<string, string>;

export class AppError extends Error {
  override readonly name = 'AppError';
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields: FieldErrors | undefined;

  constructor(code: ErrorCode, message: string, fields?: FieldErrors) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
    this.fields = fields;
  }
}

export function validationError(fields: FieldErrors): AppError {
  return new AppError('VALIDATION_FAILED', 'Some fields need attention.', fields);
}

/** One message for unknown, malformed and no-longer-valid codes alike. */
export function invalidReferralCodeError(): AppError {
  return new AppError('INVALID_REFERRAL_CODE', 'This referral code is not valid.');
}
