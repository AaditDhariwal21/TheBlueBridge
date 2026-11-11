import type { BlogsApi } from './contract';
import { httpBlogsApi } from './httpBlogsApi';

/** THE integration point for the Blogs feature: the UI only ever talks to this. */
export const blogsApi: BlogsApi = httpBlogsApi;

export type { BlogsApi } from './contract';
