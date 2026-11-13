import { z } from 'zod';

import { cursorParam } from '../../lib/cursor.ts';

/** GET /me/referrals and GET /admin/members/:id/referrals. */
export const listReferralsQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: cursorParam.optional(),
});
