import { useEffect, useState } from 'react';
import { Clock3, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import Emblem from './Emblem.jsx';
import { useRoute } from '../router.jsx';
import { api } from '../../services/api';

/* Shared government-portal chrome header: utility bar, emblem
   masthead ("Indian Weather Portal · भारत मौसम पोर्टल" with StormSense
   beneath) and one unified nav band for every page. Section links
   scroll within the current page; route links switch pages. */

const ROUTES = [
  { to: '/', label: 'Home', caption: 'Overview & alerts' },
  { to: '/command-centre', label: 'Command Centre', caption: 'Live operations' },
  { to: '/architecture', label: 'Architecture', caption: 'System design' },
];

const SECTIONS = {
  '/': [
    { id: 'nowcast', label: 'Nowcast map', caption: 'Regional outlook' },
    { id: 'alerts', label: 'Regional alerts', caption: 'Sample warnings' },
    { id: 'safety', label: 'Safety guidance', caption: 'Be prepared' },
  ],
  '/command-centre': [
    { id: 'radar', label: 'Radar', caption: 'Live composite' },
    { id: 'hazards', label: 'Hazards', caption: 'Probabilities' },
    { id: 'forecast', label: 'Nowcast', caption: '0–6 hour' },
    { id: 'simulator', label: 'Simulator', caption: 'What-if lab' },
  ],
  '/architecture': [],
};

/* Build the nav model from the current route so section links and the
   active state follow whichever page is on screen. */
function buildNav(path) {
  const base = SECTIONS[path] ? path : '/';
  return [
    ...ROUTES.map((r) => ({ ...r, href: `#${r.to}` })),
    ...(SECTIONS[base] || []).map((s) => ({ ...s, href: `#${s.id}`, section: true })),
  ];
}

function useIstClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

export default function SiteHeader({ loginOnly = false }) {
  const { path } = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const [live, setLive] = useState(false);
  const user = JSON.parse(sessionStorage.getItem('stormsense_user') || 'null');
  const istTime = useIstClock();

  /* Backend reachability for the live status pill (old core health). */
  useEffect(() => {
    let alive = true;
    const probe = () =>
      api.health()
        .then(() => { if (alive) setLive(true); })
        .catch(() => { if (alive) setLive(false); });
    probe();
    const t = setInterval(probe, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const nav = buildNav(path);
  const isRouteActive = (item) => (item.to === '/' ? path === '/' : path.startsWith(item.to));
  const today = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <header>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {/* ---------- Utility bar ---------- */}
      <div className="gov-util">
        <div className="gov-container gov-util-inner">
          <span className="gov-util-left">
            <img
              src="/gov/imd-logo.webp"
              alt="India Meteorological Department"
              className="gov-util-logo"
              height={28}
            />
            <span>
              भारत · India <span className="gov-util-sep">|</span> Public weather
              information
            </span>
          </span>
          <div className="gov-util-right">
            <span className="gov-util-hide">For awareness and preparedness</span>
            <span className="gov-util-pill">INDEPENDENT DEMONSTRATION</span>
          </div>
        </div>
      </div>

      {/* ---------- Emblem masthead ---------- */}
      <div className="gov-masthead">
        <div className="gov-container gov-masthead-inner">
          <a href="#/" className="gov-brand" aria-label="Indian Weather Portal — StormSense home">
            <span className="gov-brand-emblem"><Emblem height={66} /></span>
            <span style={{ minWidth: 0 }}>
              <span className="gov-brand-hindi" lang="hi">भारत मौसम पोर्टल · Indian Weather Portal</span>
              <span className="gov-brand-name">StormSense</span>
              <span className="gov-brand-sub">REAL-TIME WEATHER INTELLIGENCE &amp; NOWCASTING</span>
            </span>
          </a>
          <div className="gov-masthead-date">
            <div className="t">{today}</div>
            <div className="s">Weather information · India</div>
          </div>
          <button
            type="button"
            className="gov-menu-btn"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="gov-mobile-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* The login screen retains the institutional header but intentionally hides navigation. */}
      {!loginOnly && <nav className="gov-navband" aria-label="Main navigation">
        <div className={`gov-container gov-nav-inner${menuOpen ? ' nav-open' : ''}`}>
          {nav.map((item) => {
            const active = item.section ? false : isRouteActive(item);
            return (
              <a
                key={item.href + item.label}
                href={item.href}
                className={`gov-navlink${active ? ' active' : ''}${item.section ? ' is-section' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={
                  item.section
                    ? (e) => {
                        e.preventDefault();
                        setMenuOpen(false);
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                      }
                    : () => setMenuOpen(false)
                }
              >
                <span className="nl-title">{item.label}</span>
                <span className="cap">{item.caption}</span>
                {item.section ? <span className="visually-hidden"> (on this page)</span> : null}
              </a>
            );
          })}
          <span className="gov-nav-meta">
            <span className="gov-clock"><Clock3 size={13} aria-hidden="true" /> {istTime} IST</span>
            <span className={`gov-status ${live ? 'is-live' : 'is-offline'}`}>
              <span className="gov-status-dot" aria-hidden="true" />
              {live ? 'Live data · StormSense core' : 'Core offline · demonstration data'}
            </span>
            <button
              type="button"
              className="gov-admin-button"
              title={`Signed in as ${user?.username || 'administrator'}. Sign out.`}
              onClick={() => { sessionStorage.removeItem('stormsense_user'); window.location.hash = '/admin-login'; }}
            >
              <ShieldCheck size={13} /> {user?.username || 'Admin'} <LogOut size={13} aria-label="Sign out" />
            </button>
          </span>
        </div>
      </nav>}
    </header>
  );
}
