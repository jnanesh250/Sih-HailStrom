import { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowRight, ChevronDown, Clock3, CloudLightning,
  CloudRain, ExternalLink, Info, MapPin, Search, Waves, Wind,
} from 'lucide-react';
import '../styles/landing.css';
import stormCoast from '../assets/storm-coast.jpg';
import { useRoute, navigate } from '../router.jsx';
import SiteFooter from '../components/SiteFooter.jsx';

/* Landing page ported from aharon-kumar-kosetti/stormwatch-dash-gov
   ("StormWatch India") and rebranded for StormSense. Header, nav and
   footer come from the shared government-portal chrome (App level);
   this page renders the landing body only. Sample outlook data,
   structure and styling follow the source project. */

const REGIONS = ['All India', 'West India', 'North India', 'South India', 'East India'];
const WINDOWS = ['Next 1 hour', 'Next 3 hours', 'Next 6 hours'];

const alerts = [
  { place: 'Mumbai & Konkan coast', region: 'West India', level: 'Orange alert', kind: 'Thunderstorm, heavy rain', icon: CloudLightning, detail: 'Thunderstorms with intense spells of rain and gusty winds are possible. Avoid low-lying roads and exposed coastal areas.' },
  { place: 'Ahmedabad & central Gujarat', region: 'West India', level: 'Orange alert', kind: 'Lightning, strong wind', icon: Wind, detail: 'Lightning and short bursts of strong wind may occur. Move indoors and keep away from trees and open ground.' },
  { place: 'Bhopal & western Madhya Pradesh', region: 'North India', level: 'Yellow watch', kind: 'Moderate rain, lightning', icon: CloudRain, detail: 'Showers and isolated lightning are possible. Check local advisories before travel.' },
  { place: 'Bengaluru & south interior Karnataka', region: 'South India', level: 'Yellow watch', kind: 'Thunderstorm, rain', icon: CloudLightning, detail: 'Localized thunderstorms may develop. Seek shelter if thunder is heard.' },
  { place: 'Kolkata & lower Gangetic Bengal', region: 'East India', level: 'Yellow watch', kind: 'Rain, isolated thunder', icon: CloudRain, detail: 'Brief heavy showers are possible in isolated areas. Allow extra time for travel.' },
];

const safety = [
  { icon: CloudLightning, title: 'During lightning', text: 'Go indoors immediately. Stay away from open fields, tall trees and water.' },
  { icon: Waves, title: 'During heavy rain', text: 'Do not walk or drive through floodwater. Move to higher ground if needed.' },
  { icon: Wind, title: 'During high winds', text: 'Secure loose objects and stay clear of weak structures and power lines.' },
];

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export default function HomePage() {
  const { query } = useRoute();
  const section = query.get('s');
  const [region, setRegion] = useState('All India');
  const [outlookWindow, setOutlookWindow] = useState('Next 3 hours');
  const [search, setSearch] = useState(query.get('q') || '');
  const [selected, setSelected] = useState(null);

  /* Cross-page deep links: #/?s=alerts&q=mumbai scrolls to the section. */
  useEffect(() => {
    if (section) scrollToId(section);
  }, [section]);

  const orangeCount = alerts.filter((a) => a.level.startsWith('Orange')).length;
  const yellowCount = alerts.length - orangeCount;

  const visibleAlerts = alerts.filter(
    (alert, index) =>
      (outlookWindow !== 'Next 1 hour' || index < 2) &&
      (region === 'All India' || alert.region === region) &&
      `${alert.place} ${alert.kind}`.toLowerCase().includes(search.toLowerCase()),
  );

  const inPage = (id) => (e) => {
    e.preventDefault();
    scrollToId(id);
  };

  /* The old header search now lives in the shared chrome:
     submit routes to the alerts section with the query applied. */
  const submitSearch = (event) => {
    event.preventDefault();
    const q = search.trim();
    navigate(q ? `/?s=alerts&q=${encodeURIComponent(q)}` : '/?s=alerts');
    if (q) scrollToId('alerts');
  };

  return (
    <div className="landing">
      <div id="top">

        {/* ---------- Hero ---------- */}
        <section className="hero" aria-labelledby="hero-title">
          <img
            src={stormCoast}
            alt="Monsoon storm clouds and rain approaching an Indian coastline"
            className="hero-image"
            width={1600}
            height={900}
          />
          <div className="hero-shade" />
          <div className="site-container hero-inner">
            <div className="hero-eyebrow">
              <span className="status-dot" /> WEATHER AWARENESS, AT A GLANCE
            </div>
            <h1 id="hero-title" className="hero-title font-display">
              Storm nowcasting
              <br />
              outlook for India
            </h1>
            <p className="hero-sub">
              A clear view of developing thunderstorms, rainfall and regional conditions across India.
            </p>
            <a href="#nowcast" className="hero-cta" onClick={inPage('nowcast')}>
              Explore the outlook <ArrowDown size={16} />
            </a>
          </div>
          <div className="hero-caption">ILLUSTRATIVE WEATHER OUTLOOK · NOT REAL-TIME DATA</div>
        </section>

        {/* ---------- Snapshot band ---------- */}
        <section className="snapshot-band" aria-label="Outlook summary">
          <div className="site-container snapshot-grid">
            <div className="snapshot-intro">
              <span className="section-kicker">AT A GLANCE</span>
              <h2 className="snapshot-title font-display">India outlook</h2>
              <p>Illustrative conditions only</p>
            </div>
            <div className="snapshot-item">
              <span className="snapshot-icon orange">
                <AlertTriangle size={21} />
              </span>
              <div>
                <strong>{orangeCount}</strong>
                <span className="lbl">Orange alerts</span>
              </div>
            </div>
            <div className="snapshot-item">
              <span className="snapshot-icon yellow">
                <CloudLightning size={23} />
              </span>
              <div>
                <strong>{yellowCount}</strong>
                <span className="lbl">Yellow watches</span>
              </div>
            </div>
            <div className="snapshot-item">
              <span className="snapshot-icon blue">
                <Clock3 size={21} />
              </span>
              <div>
                <strong>0–6 hr</strong>
                <span className="lbl">Outlook window</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Nowcast ---------- */}
        <section id="nowcast" className="site-container nowcast-section">
          <div className="section-heading">
            <div>
              <div className="section-kicker">STORM NOWCAST</div>
              <h2 className="section-title font-display">Weather across India</h2>
              <p className="section-sub">
                Explore a sample regional outlook for developing storm conditions.
              </p>
            </div>
            <div className="sample-badge">
              <span className="status-dot" /> SAMPLE DATA · NOT LIVE
            </div>
          </div>

          <div className="forecast-toolbar">
            <div className="toolbar-group">
              <label htmlFor="region-select">REGION</label>
              <div className="select-wrap">
                <MapPin size={16} />
                <select
                  id="region-select"
                  value={region}
                  onChange={(event) => {
                    setRegion(event.target.value);
                    setSelected(null);
                  }}
                >
                  {REGIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </div>
            <div className="toolbar-group">
              <label htmlFor="window-select">TIME WINDOW</label>
              <div className="select-wrap">
                <Clock3 size={16} />
                <select
                  id="window-select"
                  value={outlookWindow}
                  onChange={(event) => setOutlookWindow(event.target.value)}
                >
                  {WINDOWS.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </div>
            <div className="toolbar-context">
              Select a region and time window to browse sample alerts.
            </div>
          </div>

          <div className="outlook-layout">
            <div className="map-panel">
              <div className="map-topline">
                <div>
                  <span className="section-kicker">NATIONAL VIEW</span>
                  <h3 className="panel-title font-display">Storm warning outlook</h3>
                </div>
                <span className="ctx">
                  {outlookWindow} · {region}
                </span>
              </div>
              <div className="map-stage">
                <div className="map-watermark">ARABIAN SEA</div>
                <img
                  src="/india-alert-map.svg"
                  alt="Illustrative state-level India map showing sample orange and yellow warning regions"
                  width={510}
                  height={550}
                  className="india-map"
                />
                <div className="map-watermark right">BAY OF BENGAL</div>
                <div className="map-note">
                  Indicative map for visual demonstration only.
                  <br />
                  Map shading does not change with filters.
                </div>
              </div>
              <div className="map-legend">
                <span className="legend-title">KEY</span>
                <span>
                  <i className="legend-swatch orange" /> Orange alert
                </span>
                <span>
                  <i className="legend-swatch yellow" /> Yellow watch
                </span>
                <span>
                  <i className="legend-swatch clear" /> No sample alert
                </span>
              </div>
            </div>

            <aside id="alerts" className="alerts-panel">
              <div className="alerts-heading">
                <div>
                  <span className="section-kicker">LOCAL OUTLOOK</span>
                  <h3 className="panel-title font-display">Regional alerts</h3>
                </div>
                <span className="alert-count">{visibleAlerts.length}</span>
              </div>
              <form
                className="search-wrap"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  navigate(search.trim() ? `/?s=alerts&q=${encodeURIComponent(search.trim())}` : '/?s=alerts');
                }}
              >
                <Search size={17} />
                <input
                  aria-label="Search locations"
                  placeholder="Search a location"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelected(null);
                  }}
                />
              </form>
              <div className="alert-list">
                {visibleAlerts.length ? (
                  visibleAlerts.map((alert) => {
                    const index = alerts.indexOf(alert);
                    const Icon = alert.icon;
                    const open = selected === index;
                    const orange = alert.level.startsWith('Orange');
                    return (
                      <div className="alert-row" key={alert.place}>
                        <button
                          type="button"
                          className="alert-trigger"
                          onClick={() => setSelected(open ? null : index)}
                          aria-expanded={open}
                        >
                          <span className={`alert-symbol ${orange ? 'orange' : 'yellow'}`}>
                            <Icon size={19} />
                          </span>
                          <span className="alert-copy">
                            <span className="alert-place">{alert.place}</span>
                            <span className="alert-kind">{alert.kind}</span>
                          </span>
                          <ArrowRight size={16} className={`alert-arrow${open ? ' open' : ''}`} />
                        </button>
                        {open && (
                          <div className="alert-detail">
                            <span className={`severity ${orange ? 'orange-text' : 'yellow-text'}`}>
                              {alert.level}
                            </span>
                            <p>{alert.detail}</p>
                            <span>Sample outlook · {outlookWindow.toLowerCase()}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-state">
                    No sample alerts match this location or region.
                  </div>
                )}
              </div>
              <div className="alerts-footer">
                <Info size={16} />
                <p>Alerts shown here are examples. Always check official warnings before making decisions.</p>
              </div>
            </aside>
          </div>
          <div className="data-note">
            <Info size={16} />
            <span>
              This demonstration does not use live meteorological observations, forecasts or location
              tracking.
            </span>
          </div>
        </section>

        {/* ---------- Safety ---------- */}
        <section id="safety" className="safety-section">
          <div className="site-container safety-inner">
            <div className="section-kicker">BE PREPARED</div>
            <div className="safety-heading">
              <div>
                <h2 className="safety-title font-display">When storms approach</h2>
                <p>Simple steps can help you stay safe in changing weather.</p>
              </div>
              <a
                href="https://mausam.imd.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="official-link"
              >
                Visit official weather service <ExternalLink size={15} />
              </a>
            </div>
            <div className="safety-grid">
              {safety.map((item) => (
                <div className="safety-item" key={item.title}>
                  <div className="safety-icon">
                    <item.icon size={25} strokeWidth={1.7} />
                  </div>
                  <h3 className="font-display">{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ---------- Footer (shared chrome) ---------- */}
      <SiteFooter
        note={
          <>
            This independent concept is not affiliated with or endorsed by any government agency. It
            is not an official forecast or emergency warning service. Live operations continue in the{' '}
            <a href="#/command-centre" style={{ color: 'inherit', fontWeight: 600 }}>
              Command Centre
            </a>
            .
          </>
        }
      />
    </div>
  );
}
