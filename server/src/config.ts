/**
 * Runtime configuration, read once from the environment at startup.
 * Local values go in server/.env (git-ignored); see server/.env.example.
 */

function readPort(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT "${value}". Expected an integer between 1 and 65535.`);
  }
  return port;
}

export const config = {
  port: readPort(process.env.PORT, 3001),
  /** 127.0.0.1 for local dev. Set HOST=0.0.0.0 in containers or on a host. */
  host: process.env.HOST ?? '127.0.0.1',
  env: process.env.NODE_ENV ?? 'development',
} as const;
