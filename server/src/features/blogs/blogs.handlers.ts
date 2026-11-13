import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { parseInput } from '../../lib/validation.ts';
import { viewerOf } from '../../middleware/authenticate.ts';
import { adminReasonBody } from '../adminLog/adminLog.schemas.ts';
import { createBlogBody, createQueryBlogBody, feedQuery, listFeedQuery } from './blogs.schemas.ts';
import {
  createBlog,
  createQueryBlog,
  deleteBlog,
  deleteQueryBlog,
  getBlog,
  getQueryBlog,
  listFeed,
  listAuthorBlogs,
  listQueryBlogs,
} from './blogs.service.ts';

interface Deps {
  db: Db;
}
type ById = RequestHandler<{ blogId: string }>;

export function listFeedHandler({ db }: Deps): RequestHandler {
  return async (req, res) => {
    res.json(await listFeed(db, parseInput(feedQuery, req.query)));
  };
}

export function getBlogHandler({ db }: Deps): ById {
  return async (req, res) => {
    res.json({ blog: await getBlog(db, req.params.blogId) });
  };
}

export function createBlogHandler({ db }: Deps): RequestHandler {
  return async (req, res) => {
    const blog = await createBlog(db, viewerOf(req), parseInput(createBlogBody, req.body));
    res.status(201).json({ blog });
  };
}

export function deleteBlogHandler({ db }: Deps): ById {
  return async (req, res) => {
    await deleteBlog(db, viewerOf(req), req.params.blogId);
    res.status(204).end();
  };
}

export function listQueryBlogsHandler({ db }: Deps): RequestHandler {
  return async (_req, res) => {
    res.json({ queryBlogs: await listQueryBlogs(db) });
  };
}

export function getQueryBlogHandler({ db }: Deps): ById {
  return async (req, res) => {
    res.json({ queryBlog: await getQueryBlog(db, req.params.blogId) });
  };
}

export function createQueryBlogHandler({ db }: Deps): RequestHandler {
  return async (req, res) => {
    const input = parseInput(createQueryBlogBody, req.body);
    res.status(201).json({ queryBlog: await createQueryBlog(db, viewerOf(req), input) });
  };
}

/** Admins: body `{ reason? }`, recorded in the admin action log. */
export function deleteQueryBlogHandler({ db }: Deps): ById {
  return async (req, res) => {
    const reason = parseInput(adminReasonBody, req.body);
    await deleteQueryBlog(db, viewerOf(req), req.params.blogId, reason);
    res.status(204).end();
  };
}

export function listMyBlogsHandler({ db }: Deps): RequestHandler {
  return async (req, res) => {
    res.json(await listAuthorBlogs(db, viewerOf(req).id, parseInput(listFeedQuery, req.query)));
  };
}

/** A member's blogs, shown on their profile. */
export function listMemberBlogsHandler({ db }: Deps): RequestHandler<{ userId: string }> {
  return async (req, res) => {
    res.json(await listAuthorBlogs(db, req.params.userId, parseInput(listFeedQuery, req.query)));
  };
}
