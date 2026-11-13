import type { AdminAction, AdminTargetType, Db } from '../../db/schema.ts';
import { encodeCursor, paginate, type Cursor } from '../../lib/cursor.ts';
import { insertAdminAction, selectAdminActions } from './adminLog.repository.ts';

/** admin_action_logs_reason_check. */
export const ADMIN_REASON_MAX = 500;

/** Each action has one kind of target (admin_action_logs_target_type_check). */
const TARGET_TYPE: Record<AdminAction, AdminTargetType> = {
  member_approved: 'user',
  ambassador_approved: 'user',
  query_blog_created: 'blog',
  query_blog_deleted: 'blog',
};

export interface AdminActionEntry {
  adminId: string;
  action: AdminAction;
  targetId: string;
  /** The target's name or title right now: the entry keeps it even if the target changes. */
  targetLabel: string;
  reason: string | null;
}

/**
 * Records an admin action. Call it with the transaction that performs the action, so the
 * action and its entry commit or roll back together: an action can never happen without
 * its entry. Every new admin action plugs in here (and into ADMIN_ACTIONS and the
 * migration's check constraint).
 */
export async function logAdminAction(trx: Db, entry: AdminActionEntry): Promise<void> {
  if (!trx.isTransaction) {
    throw new Error('logAdminAction must run inside the transaction of the action it records');
  }
  await insertAdminAction(trx, { ...entry, targetType: TARGET_TYPE[entry.action] });
}

export interface AdminActionDto {
  id: string;
  action: AdminAction;
  admin: { id: string; name: string };
  target: { type: AdminTargetType; id: string; label: string };
  reason: string | null;
  createdAt: string;
}

export async function listAdminActions(
  db: Db,
  query: {
    limit: number;
    cursor?: Cursor | undefined;
    action?: AdminAction | undefined;
    adminId?: string | undefined;
  },
): Promise<{ entries: AdminActionDto[]; nextCursor: string | null }> {
  const rows = await selectAdminActions(db, query, query);
  const { items, nextCursor } = paginate(rows, query.limit, (row) =>
    encodeCursor({ createdAt: row.created_at_key, id: row.log_id }),
  );
  return {
    entries: items.map((row) => ({
      id: row.log_id,
      action: row.action,
      admin: { id: row.admin_id, name: row.admin_name },
      target: { type: row.target_type, id: row.target_id, label: row.target_label },
      reason: row.reason,
      createdAt: row.created_at.toISOString(),
    })),
    nextCursor,
  };
}
