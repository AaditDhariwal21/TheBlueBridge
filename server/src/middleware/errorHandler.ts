import type { ErrorRequestHandler, RequestHandler } from 'express';

import { AppError, type FieldErrors } from '../lib/errors.ts';

/**
 * Every error response has this shape:
 *   { "error": { "code", "message", "requestId", "fields"? } }
 * Unexpected errors are logged with the request id and returned as a generic
 * 500. Stack traces and internal messages never reach the client.
 */
export interface ErrorBody {
  error: { code: string; message: string; requestId: string; fields?: FieldErrors };
}

export const notFound: RequestHandler = () => {
  throw new AppError('NOT_FOUND', 'Not found.');
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  const appError = toAppError(error);
  if (appError.status >= 500) req.log.error({ err: error }, 'request failed');

  if (res.headersSent) {
    next(error); // Express closes the connection
    return;
  }

  const body: ErrorBody = {
    error: {
      code: appError.code,
      message: appError.message,
      requestId: typeof req.id === 'string' ? req.id : '',
      ...(appError.fields && { fields: appError.fields }),
    },
  };
  res.status(appError.status).json(body);
};

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isBodyParserError(error)) {
    if (error.type === 'entity.too.large') {
      return new AppError('PAYLOAD_TOO_LARGE', 'The request body is too large.');
    }
    return new AppError('VALIDATION_FAILED', 'The request body is not valid JSON.');
  }
  return new AppError('INTERNAL', 'Something went wrong. Please try again.');
}

/** express.json() errors carry a `type` such as 'entity.parse.failed'. */
function isBodyParserError(error: unknown): error is { type: string; status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string' &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status < 500
  );
}
