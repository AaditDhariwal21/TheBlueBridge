import type { Viewer } from '../middleware/authenticate.ts';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. Read it through viewerOf(req). */
      viewer?: Viewer;
    }
  }
}

export {};
