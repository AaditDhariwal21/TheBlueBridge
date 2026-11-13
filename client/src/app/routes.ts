import { lazy, type ComponentType } from 'react';
import { matchPath } from 'react-router';

import { HomePage } from '../pages/HomePage';
import type { PageMeta } from './head';

interface RouteDef {
  path: string;
  Component: ComponentType;
  meta: PageMeta;
  /** Signed-in users only; others are sent to sign-in and brought back (RequireAuth). */
  requiresAuth?: true;
  /** Warms the route's chunk, e.g. on link hover/focus. */
  preload?: () => Promise<unknown>;
}

/** Route-level code splitting with an explicit preload hook. */
function lazyPage<K extends string>(
  load: () => Promise<Record<K, ComponentType>>,
  exportName: K,
): Pick<RouteDef, 'Component' | 'preload'> {
  return {
    Component: lazy<ComponentType>(() => load().then((mod) => ({ default: mod[exportName] }))),
    preload: load,
  };
}

const SOCIAL_DESCRIPTION =
  'A global community of professional women from Jodhpur — connection, community, confluence.';

/**
 * The single route table. Home is bundled eagerly because it is the main
 * landing page; secondary pages load on demand.
 */
export const ROUTES = {
  home: {
    path: '/',
    Component: HomePage,
    meta: {
      title: 'The Blue Bridge — A global community of professional women from Jodhpur',
      description:
        'The Blue Bridge connects professional women with Jodhpur roots across generations and geographies — for mentorship, opportunity and community.',
      socialDescription: SOCIAL_DESCRIPTION,
    },
  },
  about: {
    path: '/about',
    ...lazyPage(() => import('../pages/AboutPage'), 'AboutPage'),
    meta: {
      title: 'About — The Blue Bridge',
      description:
        'Why the Blue Bridge exists: to connect the accomplished women of Jodhpur across geographies and generations, so individual strengths become collective power.',
      socialDescription: SOCIAL_DESCRIPTION,
    },
  },
  community: {
    path: '/community',
    ...lazyPage(() => import('../pages/CommunityPage'), 'CommunityPage'),
    meta: {
      title: 'Community — The Blue Bridge',
      description:
        'Who the Blue Bridge is for: professional women, and aspiring and emerging women with Jodhpur roots, from entrepreneurs and corporate professionals to students and women returning to work.',
      socialDescription: SOCIAL_DESCRIPTION,
    },
  },
  blogs: {
    path: '/blogs',
    ...lazyPage(() => import('../pages/BlogsPage'), 'BlogsPage'),
    meta: {
      title: 'Blogs — The Blue Bridge',
      description:
        'Stories, lessons and practical advice from professional women of Jodhpur, plus Query Blogs where anyone can ask the community.',
      socialDescription: SOCIAL_DESCRIPTION,
    },
  },
  // Listed before `blog` so the more specific pattern wins in findRoute().
  queryBlog: {
    path: '/blogs/query/:queryBlogId',
    ...lazyPage(() => import('../pages/QueryBlogPage'), 'QueryBlogPage'),
    // Generic until the topic loads; the page then sets its own title.
    meta: {
      title: 'Query Blog — The Blue Bridge',
      description: 'Ask the Blue Bridge community a question and get answers from women who know.',
    },
  },
  blog: {
    path: '/blogs/:blogId',
    ...lazyPage(() => import('../pages/BlogPage'), 'BlogPage'),
    meta: {
      title: 'Blog — The Blue Bridge',
      description: 'A blog from the Blue Bridge community of professional women from Jodhpur.',
    },
  },
  signIn: {
    path: '/sign-in',
    ...lazyPage(() => import('../pages/SignInPage'), 'SignInPage'),
    meta: {
      title: 'Sign in — The Blue Bridge',
      description: 'Sign in to The Blue Bridge.',
      noindex: true,
    },
  },
  signUp: {
    path: '/sign-up',
    ...lazyPage(() => import('../pages/SignUpPage'), 'SignUpPage'),
    meta: {
      title: 'Create your account — The Blue Bridge',
      description: 'Join The Blue Bridge with an invitation from a member.',
      noindex: true,
    },
  },
  adminPanel: {
    // The panel's sections are nested routes inside the page (pages/AdminPanelPage.tsx).
    path: '/adminpanel/*',
    ...lazyPage(() => import('../pages/AdminPanelPage'), 'AdminPanelPage'),
    requiresAuth: true,
    meta: {
      title: 'Admin panel — The Blue Bridge',
      description: 'Run The Blue Bridge: approvals, Query Blogs and the activity log.',
      noindex: true,
    },
  },
  account: {
    path: '/account',
    ...lazyPage(() => import('../pages/AccountPage'), 'AccountPage'),
    requiresAuth: true,
    meta: {
      title: 'Your account — The Blue Bridge',
      description: 'Your Blue Bridge account.',
      noindex: true,
    },
  },
} satisfies Record<string, RouteDef>;

export const NOT_FOUND = {
  ...lazyPage(() => import('../pages/NotFoundPage'), 'NotFoundPage'),
  meta: {
    title: 'Page not found — The Blue Bridge',
    description: 'This page could not be found.',
    noindex: true,
  },
} satisfies Omit<RouteDef, 'path'>;

export const ROUTE_LIST: readonly RouteDef[] = Object.values(ROUTES);

/** The route whose pattern matches `pathname` (static or `:param` segments). */
export function findRoute(pathname: string): RouteDef | undefined {
  return ROUTE_LIST.find((r) => matchPath({ path: r.path, end: true }, pathname) !== null);
}

export function preloadRoute(path: string): void {
  void findRoute(path)?.preload?.();
}
