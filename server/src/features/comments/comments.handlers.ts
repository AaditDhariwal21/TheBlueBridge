import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { parseInput } from '../../lib/validation.ts';
import { listFeedQuery } from '../blogs/blogs.schemas.ts';
import { viewerOf } from '../../middleware/authenticate.ts';
import { createCommentBody } from './comments.schemas.ts';
import {
  createComment,
  deleteComment,
  listAuthorComments,
  listComments,
} from './comments.service.ts';

interface Deps {
  db: Db;
}

export function listCommentsHandler({ db }: Deps): RequestHandler<{ blogId: string }> {
  return async (req, res) => {
    res.json({ comments: await listComments(db, req.params.blogId) });
  };
}

export function createCommentHandler({ db }: Deps): RequestHandler<{ blogId: string }> {
  return async (req, res) => {
    const input = parseInput(createCommentBody, req.body);
    const comment = await createComment(db, viewerOf(req), req.params.blogId, input);
    res.status(201).json({ comment });
  };
}

export function deleteCommentHandler({
  db,
}: Deps): RequestHandler<{ blogId: string; commentId: string }> {
  return async (req, res) => {
    await deleteComment(db, viewerOf(req), req.params.blogId, req.params.commentId);
    res.status(204).end();
  };
}

export function listMyCommentsHandler({ db }: Deps): RequestHandler {
  return async (req, res) => {
    const page = parseInput(listFeedQuery, req.query);
    res.json(await listAuthorComments(db, viewerOf(req).id, page));
  };
}

/** A member's comments, queries and replies, shown on their profile. */
export function listMemberCommentsHandler({ db }: Deps): RequestHandler<{ userId: string }> {
  return async (req, res) => {
    const page = parseInput(listFeedQuery, req.query);
    res.json(await listAuthorComments(db, req.params.userId, page));
  };
}
