import { sql } from 'kysely';

import type { AdminAction, AdminTargetType, Db } from '../../db/schema.ts';
import { keysetBefore, type Cursor } from '../../lib/cursor.ts';

export async function insertAdminAction(
  db: Db,
  entry: {
    adminId: string;
    action: AdminAction;
    targetType: AdminTargetType;
    targetId: string;
    targetLabel: string;
    reason: string | null;
  },
): Promise<void> {
  await db
    .insertInto('admin_action_logs')
    .values({
      admin_id: entry.adminId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      target_label: entry.targetLabel,
      reason: entry.reason,
    })
    .execute();
}

/**
 * Newest first, optionally for one action and/or one admin (admin_action_logs_recent_idx,
 * _admin_idx, _action_idx). Fetches limit + 1.
 */
export function selectAdminActions(
  db: Db,
  filter: { action?: AdminAction | undefined; adminId?: string | undefined },
  page: { limit: number; cursor?: Cursor | undefined },
) {
  let query = db
    .selectFrom('admin_action_logs as l')
    .innerJoin('users as admin', 'admin.user_id', 'l.admin_id');
  if (filter.action !== undefined) query = query.where('l.action', '=', filter.action);
  if (filter.adminId !== undefined) query = query.where('l.admin_id', '=', filter.adminId);
  if (page.cursor !== undefined) {
    query = query.where(keysetBefore('l.created_at', 'l.log_id', page.cursor));
  }
  return query
    .select([
      'l.log_id',
      'l.action',
      'l.target_type',
      'l.target_id',
      'l.target_label',
      'l.reason',
      'l.created_at',
      sql<string>`l.created_at::text`.as('created_at_key'),
      'admin.user_id as admin_id',
      'admin.name as admin_name',
    ])
    .orderBy('l.created_at', 'desc')
    .orderBy('l.log_id', 'desc')
    .limit(page.limit + 1)
    .execute();
}
