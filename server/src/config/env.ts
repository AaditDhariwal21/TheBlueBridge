import { z } from 'zod';

/**
 * Environment validation. Parsed once at boot; any problem stops the process
 * with a list of the offending variable names (never their values).
 * Local values go in server/.env (git-ignored). See server/.env.example.
 */

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
/** Headers a trusted edge sets to the visitor's IP, overwriting any value the client sent. */
const CLIENT_IP_HEADERS = ['cf-connecting-ip'] as const;
export type ClientIpHeader = (typeof CLIENT_IP_HEADERS)[number];

const origin = z.url({ protocol: /^https?$/ }).refine((value) => new URL(value).origin === value, {
  error: 'Each origin must look like https://example.com (no path or trailing slash).',
});

const databaseShape = {
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: 'Must be a postgres:// URL.' }),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_SSL_CA_PATH: z.string().optional(),
};

/** Database rules that span variables; shared by both schemas. */
function checkDatabaseEnv(
  env: { NODE_ENV: string; DATABASE_URL: string; DATABASE_SSL_CA_PATH?: string | undefined },
  ctx: z.RefinementCtx,
): void {
  if (env.DATABASE_SSL_CA_PATH !== undefined && /[?&]sslmode=/.test(env.DATABASE_URL)) {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_URL'],
      message: 'Remove sslmode from DATABASE_URL when DATABASE_SSL_CA_PATH is set.',
    });
  }
  if (env.NODE_ENV === 'production' && env.DATABASE_SSL_CA_PATH === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_SSL_CA_PATH'],
      message: 'Required in production so the database certificate is verified.',
    });
  }
}

const databaseSchema = z.object(databaseShape).superRefine(checkDatabaseEnv);

const serverSchema = z
  .object({
    ...databaseShape,
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    /** Number of reverse proxies in front of the API (for client IPs and rate limits). */
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    /**
     * Behind Cloudflare (Render is): read the visitor's IP from this header for rate limits,
     * because the proxy chain in X-Forwarded-For has no fixed length there.
     */
    CLIENT_IP_HEADER: z.enum(CLIENT_IP_HEADERS).optional(),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean),
      )
      .pipe(z.array(origin)),
    SUPABASE_URL: z.url({ protocol: /^https?$/ }).transform((value) => value.replace(/\/+$/, '')),
    SUPABASE_SECRET_KEY: z
      .string()
      .min(20)
      .refine((key) => !key.startsWith('sb_publishable_'), {
        error: 'This is the publishable key. The server needs the secret key (sb_secret_...).',
      }),
  })
  .superRefine((env, ctx) => {
    checkDatabaseEnv(env, ctx);
    if (env.NODE_ENV === 'production' && !env.SUPABASE_URL.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: ['SUPABASE_URL'], message: 'Must be https.' });
    }
    // In production the site (Vercel) calls the API (Render) from another origin.
    if (env.NODE_ENV === 'production' && env.CORS_ORIGINS.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message:
          'Required in production: the site origin(s), e.g. https://the-blue-bridge.vercel.app.',
      });
    }
    if (env.NODE_ENV === 'production' && env.CORS_ORIGINS.some((o) => !o.startsWith('https://'))) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message: 'Must be https in production.',
      });
    }
  });

export interface DatabaseConfig {
  url: string;
  poolMax: number;
  sslCaPath?: string;
}

export interface ServerConfig {
  env: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: (typeof LOG_LEVELS)[number];
  trustProxy: number;
  clientIpHeader: ClientIpHeader | null;
  corsOrigins: string[];
  database: DatabaseConfig;
  supabase: { url: string; secretKey: string };
}

type Env = Record<string, string | undefined>;

export function loadServerConfig(env: Env = process.env): ServerConfig {
  const parsed = parseOrThrow(serverSchema, env);
  return {
    env: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    logLevel: parsed.LOG_LEVEL,
    trustProxy: parsed.TRUST_PROXY,
    clientIpHeader: parsed.CLIENT_IP_HEADER ?? null,
    corsOrigins: parsed.CORS_ORIGINS,
    database: toDatabaseConfig(parsed),
    supabase: { url: parsed.SUPABASE_URL, secretKey: parsed.SUPABASE_SECRET_KEY },
  };
}

/** For the migrate and seed scripts, which need only the database. */
export function loadDatabaseConfig(env: Env = process.env): DatabaseConfig {
  return toDatabaseConfig(parseOrThrow(databaseSchema, env));
}

function toDatabaseConfig(parsed: z.output<typeof databaseSchema>): DatabaseConfig {
  return {
    url: parsed.DATABASE_URL,
    poolMax: parsed.DATABASE_POOL_MAX,
    ...(parsed.DATABASE_SSL_CA_PATH !== undefined && { sslCaPath: parsed.DATABASE_SSL_CA_PATH }),
  };
}

function parseOrThrow<T extends z.ZodType>(schema: T, env: Env): z.output<T> {
  // Treat `NAME=` (empty) the same as unset, so .env.example placeholders behave.
  const present = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
  const result = schema.safeParse(present);
  if (result.success) return result.data;
  const lines = result.error.issues.map(
    (issue) => `  ${issue.path.map(String).join('.') || '(env)'}: ${issue.message}`,
  );
  throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
}
