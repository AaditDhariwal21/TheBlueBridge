import { randomUUID } from 'node:crypto';

import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

/** An upstream proxy's request id is reused only if it looks like one. */
const INCOMING_ID = /^[\w-]{8,64}$/;

/**
 * Gives every request an id (echoed as X-Request-Id and included in error
 * bodies) and a child logger at `req.log`, and logs one line per response.
 * Only the method, path (no query string) and status are logged.
 */
export function requestContext(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' && INCOMING_ID.test(incoming) ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    serializers: {
      req: (req: { id: unknown; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        path: req.url.split('?')[0],
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });
}
