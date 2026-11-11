import { pino, type Logger } from 'pino';

import type { ServerConfig } from '../config/env.ts';

/**
 * Structured JSON logs. Rules: never log request bodies, headers, tokens, emails,
 * names or phone numbers. Errors go through `serializeError`, which keeps only
 * fields known to be safe (Postgres `detail` can contain a whole row, so it is dropped).
 */
export function createLogger(config: Pick<ServerConfig, 'logLevel'>): Logger {
  return pino({
    level: config.logLevel,
    base: null, // no pid/hostname on every line
    serializers: { err: serializeError },
  });
}

interface SafeError {
  type: string;
  message: string;
  code?: string;
  constraint?: string;
  stack?: string;
  cause?: SafeError;
}

function serializeError(error: unknown): SafeError {
  if (!(error instanceof Error)) return { type: typeof error, message: 'Non-error thrown' };
  const record = error as Error & { code?: unknown; constraint?: unknown };
  return {
    type: error.name,
    message: error.message,
    ...(typeof record.code === 'string' && { code: record.code }),
    ...(typeof record.constraint === 'string' && { constraint: record.constraint }),
    ...(error.stack !== undefined && { stack: error.stack }),
    ...(error.cause !== undefined && { cause: serializeError(error.cause) }),
  };
}
