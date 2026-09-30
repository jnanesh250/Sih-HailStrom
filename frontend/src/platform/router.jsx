import { useEffect, useState } from 'react';

export function currentPath() {
  const h = window.location.hash.replace(/^#/, '');
  const path = h.split('?')[0];
  if (!path || path === '/') {
    return '/command-centre';
  }
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
    // If the hash is empty or root, route directly to #/command-centre
    const h = window.location.hash.replace(/^#/, '').split('?')[0];
    if (!h || h === '/') {
      window.location.hash = '/command-centre';
    }
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
  if (path === '/' || path === '' || path.startsWith('/command-centre')) return { name: 'command-centre' };
  if (path.startsWith('/home')) return { name: 'home' };
  if (path.startsWith('/architecture')) return { name: 'architecture' };
  if (path.startsWith('/admin-login')) return { name: 'admin-login' };
  return { name: 'not-found' };
}

