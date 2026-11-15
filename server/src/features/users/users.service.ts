import type { Db, UserRole, UserStatus } from '../../db/schema.ts';
import { AppError, validationError } from '../../lib/errors.ts';
import type { Viewer } from '../../middleware/authenticate.ts';
import { canReapply, type ScopedActor } from '../../policies/permissions.ts';
import { allCategoriesExist, type Category } from '../categories/categories.service.ts';
import {
  resolveAnswers,
  type OptionDto,
  type ResolvedAnswers,
} from '../profileOptions/profileOptions.service.ts';
import {
  deleteCategories,
  findApplicationDetails,
  findPrincipal,
  findProfile,
  insertCategories,
  insertProfile,
  lockApplicant,
  replaceAnswers,
  selectCategoryIds,
  updateApplication,
  type ApplicationColumns,
} from './users.repository.ts';
import type { ApplicationInput } from './users.schemas.ts';

/**
 * The application answers beyond name, phone and occupation. Every field is null (or
 * empty) for users who joined before the expanded application existed.
 */
export interface ApplicationDetailsDto {
  maidenName: string | null;
  city: string | null;
  state: string | null;
  /** ISO 3166-1 alpha-2. */
  country: string | null;
  jodhpurConnections: OptionDto[];
  connectionOther: string | null;
  schoolPassYear: number | null;
  schoolName: string | null;
  /** A year such as "2012", or "NA". */
  collegePassYear: string | null;
  collegeName: string | null;
  highestDegree: string | null;
  profession: string | null;
  linkedinUrl: string | null;
  journeyStage: OptionDto | null;
  journeyStageOther: string | null;
  joinReasons: OptionDto[];
  joinReasonOther: string | null;
  /** Ambassadors: the hours a week they can offer. */
  weeklyHours: OptionDto | null;
}

/** GET /me: everything about the signed-in user. */
export interface MeDto extends ApplicationDetailsDto {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string;
  occupation: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  /** An ambassador's 1 to 3 categories; empty for members and admins. */
  categories: Category[];
  /** Theirs to share. Only works for others while this user is approved. */
  referralCode: string | null;
  /** The team's note on the latest review (approval or rejection); null once reapplied. */
  reviewNote: string | null;
  createdAt: string;
}

/** id, role and status, for requireAuth. */
export function getPrincipal(db: Db, id: string) {
  return findPrincipal(db, id);
}

export async function getMe(db: Db, viewer: Viewer): Promise<MeDto> {
  const [profile, details] = await Promise.all([
    findProfile(db, viewer.id),
    getApplicationDetails(db, viewer.id),
  ]);
  if (!profile || !details) throw new AppError('NOT_FOUND', 'Profile not found.');
  return {
    id: profile.user_id,
    name: profile.name,
    email: viewer.email,
    phoneNumber: profile.phone_number,
    occupation: profile.occupation,
    role: profile.role,
    status: profile.status,
    avatarUrl: profile.avatar_url,
    categories: profile.categories,
    referralCode: profile.referral_code,
    reviewNote: profile.review_note,
    createdAt: profile.created_at.toISOString(),
    ...details,
  };
}

/** One user's application answers; undefined for an unknown user. */
export async function getApplicationDetails(
  db: Db,
  userId: string,
): Promise<ApplicationDetailsDto | undefined> {
  const row = await findApplicationDetails(db, userId);
  if (!row) return undefined;
  const option = (code: string | null, label: string | null): OptionDto | null =>
    code === null || label === null ? null : { code, label };
  return {
    maidenName: row.maiden_name,
    city: row.city,
    state: row.state,
    country: row.country_code,
    jodhpurConnections: row.connections,
    connectionOther: row.connection_other,
    schoolPassYear: row.school_pass_year,
    schoolName: row.school_name,
    collegePassYear: row.college_pass_year,
    collegeName: row.college_name,
    highestDegree: row.highest_degree,
    profession: row.profession,
    linkedinUrl: row.linkedin_url,
    journeyStage: option(row.journey_stage_code, row.journey_stage_label),
    journeyStageOther: row.journey_stage_other,
    joinReasons: row.reasons,
    joinReasonOther: row.join_reason_other,
    weeklyHours: option(row.weekly_hours_code, row.weekly_hours_label),
  };
}

/**
 * The viewer with their own categories, for category-scoped permission checks.
 * Only ambassadors have categories, so nobody else costs a query.
 */
export async function getScopedActor(db: Db, viewer: Viewer): Promise<ScopedActor> {
  const categoryIds = viewer.role === 'ambassador' ? await selectCategoryIds(db, viewer.id) : [];
  return { id: viewer.id, role: viewer.role, status: viewer.status, categoryIds };
}

/**
 * Checks what the database must confirm about an application (categories exist, option
 * codes are current) and returns the option ids to store. Throws VALIDATION_FAILED with
 * the field to fix. Run before anything is created.
 */
export async function checkApplicationAnswers(
  db: Db,
  input: ApplicationInput,
): Promise<ResolvedAnswers> {
  const [categoriesExist, answers] = await Promise.all([
    allCategoriesExist(db, input.categoryIds),
    resolveAnswers(db, input),
  ]);
  if (!categoriesExist) throw validationError({ categoryIds: 'Choose categories from the list.' });
  return answers;
}

function toColumns(input: ApplicationInput, answers: ResolvedAnswers): ApplicationColumns {
  return {
    name: input.name,
    maidenName: input.maidenName,
    phoneNumber: input.phoneNumber,
    city: input.city,
    state: input.state,
    country: input.country,
    schoolPassYear: input.schoolPassYear,
    schoolName: input.schoolName,
    collegePassYear: input.collegePassYear,
    collegeName: input.collegeName,
    highestDegree: input.highestDegree,
    profession: input.profession,
    occupation: input.occupation,
    linkedinUrl: input.linkedinUrl,
    journeyStageId: answers.journeyStageId,
    journeyStageOther: input.journeyStageOther,
    connectionOther: input.connectionOther,
    joinReasonOther: input.joinReasonOther,
    weeklyHoursId: answers.weeklyHoursId,
  };
}

/**
 * Inserts a pending profile with its answers and, for ambassadors, their categories. Run
 * inside a transaction, with answers from checkApplicationAnswers.
 */
export async function createProfile(
  trx: Db,
  input: { userId: string; referralCodeId: string; application: ApplicationInput },
  answers: ResolvedAnswers,
): Promise<void> {
  const { userId, application } = input;
  await insertProfile(trx, {
    ...toColumns(application, answers),
    userId,
    role: application.appliedRole,
    referralCodeId: input.referralCodeId,
  });
  await insertCategories(trx, userId, application.categoryIds);
  await replaceAnswers(trx, userId, answers);
}

/**
 * POST /me/reapply: a rejected applicant applies again, as the same or a different role.
 * Everything is re-validated, then her answers, role and categories are replaced in one
 * transaction and she is back in the queue (pending, note cleared). The row is locked
 * first, so two submissions at once cannot both pass the status check.
 */
export async function reapply(db: Db, viewer: Viewer, input: ApplicationInput): Promise<MeDto> {
  if (!canReapply(viewer)) {
    throw new AppError('CONFLICT', 'Only an application that was not approved can be sent again.');
  }
  const answers = await checkApplicationAnswers(db, input);
  await db.transaction().execute(async (trx) => {
    const applicant = await lockApplicant(trx, viewer.id);
    if (!applicant || !canReapply({ id: applicant.user_id, ...applicant })) {
      throw new AppError(
        'CONFLICT',
        'Only an application that was not approved can be sent again.',
      );
    }
    // Categories go first: the role may change away from ambassador, which the database
    // refuses while categories remain (users_role_keeps_areas_valid), and new categories
    // need the new role in place (user_categories_rules).
    await deleteCategories(trx, viewer.id);
    await updateApplication(trx, viewer.id, {
      ...toColumns(input, answers),
      role: input.appliedRole,
    });
    await insertCategories(trx, viewer.id, input.categoryIds);
    await replaceAnswers(trx, viewer.id, answers);
  });
  return getMe(db, { ...viewer, role: input.appliedRole, status: 'pending' });
}
