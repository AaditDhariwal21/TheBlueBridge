import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { OG_IMAGE, SITE_NAME, SITE_URL } from './site';

export interface PageMeta {
  title: string;
  description: string;
  /** Short description for social cards. Falls back to `description`. */
  socialDescription?: string;
  noindex?: boolean;
}

/**
 * Centralized document head management. Every route's <title>, description,
 * canonical, robots and Open Graph / Twitter tags are written here and nowhere else.
 *
 * index.html carries the Home defaults for crawlers that don't run JS. If the
 * site later moves to prerendering or SSR, swap this module's implementation;
 * callers (RootLayout and the route table) don't need to change.
 */
export function applyHead(meta: PageMeta, pathname: string): void {
  const url = `${SITE_URL}${pathname}`;
  const social = meta.socialDescription ?? meta.description;
  const image = `${SITE_URL}${OG_IMAGE.path}`;

  document.title = meta.title;
  setMeta('name', 'description', meta.description);
  setMeta('name', 'robots', meta.noindex ? 'noindex, follow' : 'index, follow');
  setCanonical(url);

  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:title', meta.title);
  setMeta('property', 'og:description', social);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:image', image);
  setMeta('property', 'og:image:alt', OG_IMAGE.alt);
  setMeta('name', 'twitter:title', meta.title);
  setMeta('name', 'twitter:description', social);
  setMeta('name', 'twitter:image', image);
}

/**
 * Lets a page refine the route's head once its data is known, e.g. a blog's
 * own title. RootLayout applies the route's meta in a layout effect, so this
 * (a passive effect) always runs after it and wins. Pass null while loading.
 */
export function usePageHead(meta: PageMeta | null): void {
  const { pathname } = useLocation();
  const title = meta?.title;
  const description = meta?.description;
  const noindex = meta?.noindex === true;

  useEffect(() => {
    if (title === undefined || description === undefined) return;
    applyHead({ title, description, ...(noindex && { noindex }) }, pathname);
  }, [title, description, noindex, pathname]);
}

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.append(el);
  }
  el.content = content;
}

function setCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.append(el);
  }
  el.href = href;
}
