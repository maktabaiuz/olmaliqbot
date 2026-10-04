import { useEffect, useState } from 'react';
import { tg } from './telegram';

/**
 * Oddiy hash-router: "#/listing/abc?from=search". Telegram'ning "Orqaga"
 * tugmasi brauzer tarixiga bog'langan — ichki sahifalarda ko'rinadi.
 */
export interface Route {
  path: string;
  segments: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [p, qs] = raw.split('?');
  const path = p.startsWith('/') ? p : `/${p}`;
  return { path, segments: path.split('/').filter(Boolean), query: new URLSearchParams(qs || '') };
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const hash = `#${to}`;
  if (opts.replace) window.history.replaceState(null, '', hash);
  else window.history.pushState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export const goBack = () => {
  if (window.history.length > 1) window.history.back();
  else navigate('/', { replace: true });
};

const TAB_ROOTS = new Set(['/', '/map', '/search', '/saved', '/profile']);

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
  }, []);
  useEffect(() => {
    const bb = tg()?.BackButton;
    if (!bb) return;
    if (TAB_ROOTS.has(route.path)) bb.hide();
    else bb.show();
    bb.onClick(goBack);
    return () => bb.offClick(goBack);
  }, [route.path]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.path]);
  return route;
}
