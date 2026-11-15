import type { Db } from '../../db/schema.ts';
import { validationError, type FieldErrors } from '../../lib/errors.ts';
import {
  selectActiveOptions,
  selectConnectionIds,
  selectJoinReasonIds,
  selectJourneyStageId,
  selectWeeklyHoursId,
} from './profileOptions.repository.ts';

/** One answer to an option-set question: a stable code and the label people read. */
export interface OptionDto {
  code: string;
  label: string;
}

/** GET /profile-options: the choices the application form offers. */
export interface ProfileOptionsDto {
  jodhpurConnections: OptionDto[];
  journeyStages: OptionDto[];
  joinReasons: OptionDto[];
  weeklyHours: OptionDto[];
}

export async function listProfileOptions(db: Db): Promise<ProfileOptionsDto> {
  const [jodhpurConnections, journeyStages, joinReasons, weeklyHours] =
    await selectActiveOptions(db);
  return { jodhpurConnections, journeyStages, joinReasons, weeklyHours };
}

/** The option-set answers of an application, by code (validated as codes, not yet as rows). */
export interface OptionAnswers {
  jodhpurConnections: readonly string[];
  journeyStage: string;
  joinReasons: readonly string[];
  weeklyHours: string | null;
}

/** The same answers as lookup-table ids, ready to store. */
export interface ResolvedAnswers {
  connectionIds: number[];
  journeyStageId: number;
  joinReasonIds: number[];
  weeklyHoursId: number | null;
}

/**
 * Turns option codes into ids. Any unknown or retired code is a validation error on its
 * field, so a stale form gets told which question to answer again.
 */
export async function resolveAnswers(db: Db, answers: OptionAnswers): Promise<ResolvedAnswers> {
  const [connections, stage, reasons, hours] = await Promise.all([
    selectConnectionIds(db, answers.jodhpurConnections),
    selectJourneyStageId(db, answers.journeyStage),
    selectJoinReasonIds(db, answers.joinReasons),
    answers.weeklyHours === null ? null : selectWeeklyHoursId(db, answers.weeklyHours),
  ]);

  const fields: FieldErrors = {};
  const stale = 'Choose from the list.';
  if (connections.length !== answers.jodhpurConnections.length) fields.jodhpurConnections = stale;
  if (!stage) fields.journeyStage = stale;
  if (reasons.length !== answers.joinReasons.length) fields.joinReasons = stale;
  if (answers.weeklyHours !== null && !hours) fields.weeklyHours = stale;
  if (!stage || Object.keys(fields).length > 0) throw validationError(fields);

  return {
    connectionIds: connections.map((row) => row.id),
    journeyStageId: stage.id,
    joinReasonIds: reasons.map((row) => row.id),
    weeklyHoursId: hours?.id ?? null,
  };
}
