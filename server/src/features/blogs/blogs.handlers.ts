import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { parseInput } from '../../lib/validation.ts';
import { viewerOf } from '../../middleware/authenticate.ts';
import { createBlogBody, createQueryBlogBody, listFeedQuery } from './blogs.schemas.ts';
import {
  createBlog,
  createQueryBlog,
  deleteBlog,
  getBlog,
  getQueryBlog,
  listFeed,
  listMyBlogs,
  listQueryBlogs,
} from './blogs.service.ts';

interface Deps {
  db: Db;
}
type ById = RequestHandler<{ blogId: string }>;

export function listFeedHandler({ db }: Deps): RequestHandler {
  return async (req, res) => {
    res.json(await listFeed(db, parseInput(listFeedQuery, req.query)));
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

export function listMyBlogsHandler({ db }: Deps): RequestHandler {
  return async (req, res) => {
    res.json(await listMyBlogs(db, viewerOf(req), parseInput(listFeedQuery, req.query)));
  };
}
