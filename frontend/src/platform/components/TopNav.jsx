import { useEffect, useState } from 'react';
import { Radio, MapPin, Menu, X } from 'lucide-react';
import { useReducedMotion } from '../a11y/useReducedMotion.js';
import { useRoute } from '../router.jsx';
import { api } from '../../services/api';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/command-centre', label: 'Command Centre' },
  { to: '/architecture', label: 'Explore Architecture' },
];

function hrefFor(to) {
  return `#${to}`;
}

export default function TopNav() {
  const { path } = useRoute();
  const [live, setLive] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  /* Backend reachability for the LIVE indicator (old core health endpoint). */
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

  const isActive = (to) => (to === '/' ? path === '/' : path.startsWith(to));

  return (
    <header className="ss-header">
      <div className="ss-container ss-header__inner">
        <a className="ss-brand" href="#/" aria-label="StormSense home">
          <span className="ss-brand__mark" aria-hidden="true">
            <Radio size={20} strokeWidth={1.8} />
          </span>
          <span>
            <span className="ss-brand__name">STORMSENSE</span>
            <span className="ss-brand__tag">Weather Intelligence · India</span>
          </span>
        </a>

        <nav className="ss-nav" aria-label="Primary">
          {NAV.map((n) => (
            <a key={n.to} href={hrefFor(n.to)} className={isActive(n.to) ? 'is-active' : ''} aria-current={isActive(n.to) ? 'page' : undefined}>
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ss-header__meta">
          <span className="ss-live-ind">
            <span className={`live-dot${live && !reduced ? ' live-dot--pulse' : ''}${!live ? ' live-dot--off' : ''}`} aria-hidden="true" />
            {live ? 'LIVE' : 'OFFLINE'}
          </span>
          <span className="ss-loc-ind">
            <MapPin size={14} aria-hidden="true" />
            INDIA
          </span>
        </div>

        <button
          type="button"
          className="ss-menu-btn"
          aria-expanded={open}
          aria-controls="ss-mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>

      <nav id="ss-mobile-nav" className={`ss-mobile-nav${open ? ' is-open' : ''}`} aria-label="Primary mobile">
        {NAV.map((n) => (
          <a key={n.to} href={hrefFor(n.to)} className={isActive(n.to) ? 'is-active' : ''}>
            {n.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
