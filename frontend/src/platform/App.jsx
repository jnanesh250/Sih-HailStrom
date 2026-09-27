import { lazy, Suspense, useEffect, useRef } from 'react';
import './styles/platform.css';
import './styles/chrome.css';
import SiteHeader from './components/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import { useRoute, matchRoute } from './router.jsx';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const ArchitecturePage = lazy(() => import('./pages/ArchitecturePage.jsx'));
const CommandCentrePage = lazy(() => import('./pages/CommandCentrePage.jsx'));

const TITLES = {
  home: 'StormSense | Real-Time Weather Intelligence & Nowcasting',
  'command-centre': 'Command Centre | StormSense',
  architecture: 'Explore Architecture | StormSense',
  'not-found': 'Page Not Found | StormSense',
};

function NotFound() {
  return (
    <div className="ss-page">
      <section className="ss-section">
        <div className="ss-container" style={{ textAlign: 'center', padding: '80px 0' }}>
          <p className="eyebrow">Error 404</p>
          <h1>Page Not Found</h1>
          <p className="ss-sub">The requested page does not exist on this platform.</p>
          <p style={{ marginTop: 24 }}>
            <a className="ss-btn ss-btn--primary" href="#/">Return to Home</a>
          </p>
        </div>
      </section>
    </div>
  );
}

export default function PlatformApp() {
  const { path } = useRoute();
  const route = matchRoute(path);
  const mainRef = useRef(null);

  /* Route side-effects: title, scroll reset (unless the URL carries an
     in-page section target, e.g. #/?s=alerts), main focus for a11y.
     Every page shares the government-portal chrome (SiteHeader /
     SiteFooter) rendered here; page components render their body only. */
  useEffect(() => {
    document.title = TITLES[route.name] || TITLES.home;
    const hasSection = new URLSearchParams(window.location.hash.split('?')[1] || '').get('s');
    if (!hasSection) window.scrollTo({ top: 0, behavior: 'auto' });
    mainRef.current?.focus({ preventScroll: true });
  }, [route.name, path]);

  return (
    <>
      <SiteHeader />
      <main id="main-content" ref={mainRef} tabIndex={-1} style={{ outline: 'none' }}>
        <Suspense fallback={<div className="ss-loading" role="status">Loading StormSense…</div>}>
          {route.name === 'home' && <HomePage />}
          {route.name === 'command-centre' && <CommandCentrePage />}
          {route.name === 'architecture' && <ArchitecturePage />}
          {route.name === 'not-found' && <NotFound />}
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
