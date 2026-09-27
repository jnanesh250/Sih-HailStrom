import { useEffect, useState } from 'react';

export function currentPath() {
  const h = window.location.hash.replace(/^#/, '');
  const path = h.split('?')[0];
  return path.startsWith('/') ? path : `/${path}`;
}

export function currentQuery() {
  const h = window.location.hash.replace(/^#/, '');
  const qi = h.indexOf('?');
  return new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : '');
}

export function useRoute() {
  const [route, setRoute] = useState({ path: currentPath(), query: currentQuery() });
  useEffect(() => {
    const onHash = () => setRoute({ path: currentPath(), query: currentQuery() });
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

export function navigate(to) {
  window.location.hash = to;
}

export function Link({ to, children, ...rest }) {
  const href = to.startsWith('#') ? to : `#${to}`;
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

export function matchRoute(path) {
  if (path === '/' || path === '') return { name: 'home' };
  if (path.startsWith('/command-centre')) return { name: 'command-centre' };
  if (path.startsWith('/architecture')) return { name: 'architecture' };
  return { name: 'not-found' };
}
