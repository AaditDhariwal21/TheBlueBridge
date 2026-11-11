import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';

import { createAccessTokenVerifier } from '../../src/lib/accessToken.ts';

export const TEST_ISSUER = 'https://test-project.supabase.co/auth/v1';

/**
 * A local ES256 signing key, plus the verifier the app would build from a
 * Supabase JWKS. Tokens look like Supabase access tokens.
 */
export async function createTokenKit() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'ES256' };
  const verifyAccessToken = createAccessTokenVerifier({
    issuer: TEST_ISSUER,
    keys: createLocalJWKSet({ keys: [jwk] }),
  });

  async function sign(
    userId: string,
    options: { email?: string; issuer?: string; audience?: string; expiresIn?: string } = {},
  ): Promise<string> {
    return new SignJWT({ email: options.email ?? 'someone@example.com', role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setSubject(userId)
      .setIssuer(options.issuer ?? TEST_ISSUER)
      .setAudience(options.audience ?? 'authenticated')
      .setIssuedAt()
      .setExpirationTime(options.expiresIn ?? '5m')
      .sign(privateKey);
  }

  return { verifyAccessToken, sign };
}

/** A well-formed token from a key the app does not trust. */
export async function signWithForeignKey(userId: string): Promise<string> {
  const { privateKey } = await generateKeyPair('ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setSubject(userId)
    .setIssuer(TEST_ISSUER)
    .setAudience('authenticated')
    .setExpirationTime('5m')
    .sign(privateKey);
}
