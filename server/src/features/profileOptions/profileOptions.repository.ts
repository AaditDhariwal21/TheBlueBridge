import type { Db } from '../../db/schema.ts';

/** The active options of each set, in display order. Tiny tables: one query each. */
export function selectActiveOptions(db: Db) {
  return Promise.all([
    db
      .selectFrom('jodhpur_connections')
      .select(['code', 'label'])
      .where('active', '=', true)
      .orderBy('sort_order')
      .execute(),
    db
      .selectFrom('journey_stages')
      .select(['code', 'label'])
      .where('active', '=', true)
      .orderBy('sort_order')
      .execute(),
    db
      .selectFrom('join_reasons')
      .select(['code', 'label'])
      .where('active', '=', true)
      .orderBy('sort_order')
      .execute(),
    db
      .selectFrom('weekly_hours_options')
      .select(['code', 'label'])
      .where('active', '=', true)
      .orderBy('sort_order')
      .execute(),
  ]);
}

/* Ids of active options by code. Unknown and retired codes are simply missing. */

export function selectConnectionIds(db: Db, codes: readonly string[]) {
  return db
    .selectFrom('jodhpur_connections')
    .select('connection_id as id')
    .where('code', 'in', codes)
    .where('active', '=', true)
    .execute();
}

export function selectJoinReasonIds(db: Db, codes: readonly string[]) {
  return db
    .selectFrom('join_reasons')
    .select('join_reason_id as id')
    .where('code', 'in', codes)
    .where('active', '=', true)
    .execute();
}

export function selectJourneyStageId(db: Db, code: string) {
  return db
    .selectFrom('journey_stages')
    .select('journey_stage_id as id')
    .where('code', '=', code)
    .where('active', '=', true)
    .executeTakeFirst();
}

export function selectWeeklyHoursId(db: Db, code: string) {
  return db
    .selectFrom('weekly_hours_options')
    .select('weekly_hours_id as id')
    .where('code', '=', code)
    .where('active', '=', true)
    .executeTakeFirst();
}
