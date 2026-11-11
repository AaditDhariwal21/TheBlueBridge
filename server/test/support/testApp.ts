import type { AddressInfo } from 'node:net';

import { pino } from 'pino';

import { createApp } from '../../src/app.ts';
import type { Db } from '../../src/db/schema.ts';
import type { AccessTokenVerifier } from '../../src/lib/accessToken.ts';
import type { IdentityProvider } from '../../src/lib/identity.ts';
import type { ErrorBody } from '../../src/middleware/errorHandler.ts';

export interface TestResponse<T> {
  status: number;
  body: T;
}

export interface TestApp {
  get<T = ErrorBody>(path: string, token?: string): Promise<TestResponse<T>>;
  post<T = ErrorBody>(path: string, body: unknown, token?: string): Promise<TestResponse<T>>;
  /** DELETE; the body is null for 204 No Content. */
  del<T = ErrorBody | null>(path: string, token?: string): Promise<TestResponse<T>>;
  close(): Promise<void>;
}

const NO_IDENTITY: IdentityProvider = {
  createUser: () => Promise.reject(new Error('identity not configured for this test')),
  deleteUser: () => Promise.reject(new Error('identity not configured for this test')),
};

const NO_TOKENS: AccessTokenVerifier = () => Promise.resolve(null);

/** The real app on a random local port. Each call gets fresh rate-limit counters. */
export async function startTestApp(deps: {
  db: Db;
  identity?: IdentityProvider;
  verifyAccessToken?: AccessTokenVerifier;
}): Promise<TestApp> {
  const app = createApp({
    trustProxy: 0,
    corsOrigins: [],
    logger: pino({ level: 'silent' }),
    db: deps.db,
    identity: deps.identity ?? NO_IDENTITY,
    verifyAccessToken: deps.verifyAccessToken ?? NO_TOKENS,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}/api`;

  async function request(
    method: string,
    path: string,
    body?: unknown,
    token?: string,
  ): Promise<TestResponse<unknown>> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token !== undefined) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(base + path, {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  }

  return {
    // The caller names the body type it expects; the assertions then check it.
    get: async <T>(path: string, token?: string) =>
      (await request('GET', path, undefined, token)) as TestResponse<T>,
    post: async <T>(path: string, body: unknown, token?: string) =>
      (await request('POST', path, body, token)) as TestResponse<T>,
    del: async <T>(path: string, token?: string) =>
      (await request('DELETE', path, undefined, token)) as TestResponse<T>,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
        server.closeAllConnections();
      }),
  };
}
