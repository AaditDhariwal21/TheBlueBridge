import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';

/**
 * Verifies Supabase access tokens locally against the project's published
 * signing keys (JWKS), so no request to Supabase is made per API call.
 * Requires asymmetric JWT signing keys (the default for projects created since
 * October 2025). Legacy HS256 projects publish an empty JWKS and must migrate:
 * see docs/SUPABASE_SETUP.md.
 */

export interface AccessTokenClaims {
  userId: string;
  /** From the token Supabase Auth issued; the API never stores email itself. */
  email: string | null;
}

/** Resolves to null for any token that is missing, malformed, expired or forged. */
export type AccessTokenVerifier = (token: string) => Promise<AccessTokenClaims | null>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createAccessTokenVerifier(options: {
  issuer: string;
  keys: JWTVerifyGetKey;
}): AccessTokenVerifier {
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, options.keys, {
        issuer: options.issuer,
        audience: 'authenticated',
        algorithms: ['ES256', 'RS256'],
      });
      if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) return null;
      return {
        userId: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : null,
      };
    } catch (error) {
      // Key-fetch timeouts are an outage, not a bad token: let them become a 500.
      if (error instanceof errors.JOSEError && !(error instanceof errors.JWKSTimeout)) return null;
      throw error;
    }
  };
}

/** The verifier for a Supabase project. jose caches the key set and refetches on rotation. */
export function createSupabaseTokenVerifier(supabaseUrl: string): AccessTokenVerifier {
  const issuer = `${supabaseUrl}/auth/v1`;
  return createAccessTokenVerifier({
    issuer,
    keys: createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)),
  });
}
