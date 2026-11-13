import { z } from 'zod';

import { ADMIN_ACTIONS } from '../../db/schema.ts';
import { cursorParam } from '../../lib/cursor.ts';
import { optionalSingleLineText } from '../../lib/validation.ts';
import { ADMIN_REASON_MAX } from './adminLog.service.ts';

/** GET /admin/action-logs */
export const adminActionsQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: cursorParam.optional(),
  action: z.enum(ADMIN_ACTIONS, { error: 'Choose an action from the list.' }).optional(),
  adminId: z.uuid({ error: 'Not a valid admin.' }).optional(),
});

/**
 * The optional reason an admin gives for a logged action, as `{ "reason": "…" }`. The body
 * may be left out entirely. Output: the reason, or null.
 */
export const adminReasonBody = z
  .strictObject({ reason: optionalSingleLineText(ADMIN_REASON_MAX) })
  .optional()
  .transform((body) => body?.reason ?? null);
