const SECTIONS = [
  {
    heading: 'Platform',
    links: [
      { label: 'Home', href: '#/' },
      { label: 'Command Centre', href: '#/command-centre' },
      { label: 'Explore Architecture', href: '#/architecture' },
    ],
  },
  {
    heading: 'Information',
    links: [
      { label: 'About', href: '#/' },
      { label: 'Data Sources', href: '#/architecture' },
      { label: 'Methodology', href: '#/architecture' },
      { label: 'Contact', href: '#/' },
    ],
  },
  {
    heading: 'Policies',
    links: [
      { label: 'Privacy', href: '#/' },
      { label: 'Terms', href: '#/' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="ss-footer">
      <div className="ss-container">
        <div className="ss-footer__grid">
          <div>
            <div className="ss-footer__brand-name">STORMSENSE</div>
            <p className="ss-footer__tag">Real-Time Weather Intelligence &amp; Nowcasting</p>
            <p className="ss-footer__desc">
              Observe. Predict. Act. Real-time monitoring and short-range prediction of severe
              weather — thunderstorms, heavy rainfall, lightning and cyclonic systems — across India.
            </p>
            <p className="ss-footer__desc" style={{ marginTop: 12 }}>
              StormSense is an independent platform and is not a Government of India organisation.
            </p>
          </div>
          {SECTIONS.map((s) => (
            <nav key={s.heading} aria-label={s.heading}>
              <h3>{s.heading}</h3>
              <ul>
                {s.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="ss-footer__bottom">
          <span>© 2026 StormSense</span>
          <span>Built for weather intelligence, public awareness and operational decision support.</span>
        </div>
      </div>
    </footer>
  );
}
