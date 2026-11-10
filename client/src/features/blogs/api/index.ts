import type { BlogsApi } from './contract';
import { mockBlogsApi } from './mockBlogsApi';

/**
 * THE integration point for the Blogs feature. Swap `mockBlogsApi` for an
 * HTTP implementation of `BlogsApi` and nothing else in the UI changes.
 */
export const blogsApi: BlogsApi = mockBlogsApi;

export { BlogsApiError } from './contract';
export type { BlogsApi } from './contract';
