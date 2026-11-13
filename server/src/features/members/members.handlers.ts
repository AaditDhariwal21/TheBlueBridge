import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { parseInput } from '../../lib/validation.ts';
import { viewerOf } from '../../middleware/authenticate.ts';
import { adminReasonBody } from '../adminLog/adminLog.schemas.ts';
import { listReferralsQuery } from '../referrals/referrals.schemas.ts';
import { adminMembersQuery, directoryQuery } from './members.schemas.ts';
import {
  approveMember,
  getMemberForAdmin,
  getMemberProfile,
  getPendingCounts,
  getCommunitySize,
  getProfileCard,
  listDirectory,
  listMemberReferrals,
  listMembersForAdmin,
} from './members.service.ts';

interface Deps {
  db: Db;
}
type ByUser = RequestHandler<{ userId: string }>;

/* ---------------------------------------------------------- directory */

export function listDirectoryHandler({ db }: Deps): RequestHandler {
  return async (req, res) => {
    res.json(await listDirectory(db, parseInput(directoryQuery, req.query)));
  };
}

/** Public: just the number, for the Community page ("We're 78 strong"). */
export function getCommunitySizeHandler({ db }: Deps): RequestHandler {
  return async (_req, res) => {
    res.json({ count: await getCommunitySize(db) });
  };
}

export function getMemberProfileHandler({ db }: Deps): ByUser {
  return async (req, res) => {
    res.json({ member: await getMemberProfile(db, req.params.userId) });
  };
}

export function getProfileCardHandler({ db }: Deps): ByUser {
  return async (req, res) => {
    res.json({ user: await getProfileCard(db, req.params.userId) });
  };
}

/* -------------------------------------------------------------- admin */

export function getOverviewHandler({ db }: Deps): RequestHandler {
  return async (_req, res) => {
    res.json({ pending: await getPendingCounts(db) });
  };
}

export function listMembersForAdminHandler({ db }: Deps): RequestHandler {
  return async (req, res) => {
    res.json(await listMembersForAdmin(db, parseInput(adminMembersQuery, req.query)));
  };
}

export function getMemberForAdminHandler({ db }: Deps): ByUser {
  return async (req, res) => {
    res.json(await getMemberForAdmin(db, req.params.userId));
  };
}

export function listMemberReferralsHandler({ db }: Deps): ByUser {
  return async (req, res) => {
    const page = parseInput(listReferralsQuery, req.query);
    res.json(await listMemberReferrals(db, req.params.userId, page));
  };
}

export function approveMemberHandler({ db }: Deps): ByUser {
  return async (req, res) => {
    const reason = parseInput(adminReasonBody, req.body);
    res.json(await approveMember(db, viewerOf(req), req.params.userId, reason));
  };
}
