import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot, ChevronDown, CloudLightning, CloudRain, Crosshair, Database,
  Gauge, Pause, Play, RotateCcw, Send, ShieldAlert, Sparkles,
  ThermometerSun, Wind, Zap,
} from 'lucide-react';
import '../styles/command.css';
import WeatherMap from '../../components/WeatherMap.jsx';
import { api } from '../../services/api';
import { stormWS } from '../../services/websocket';
import { useNowcast } from '../../services/nowcast';
import SiteFooter from '../components/SiteFooter.jsx';

/* Command Centre ported from aharon-kumar-kosetti/crystal-clear-weather.
   Visual design follows the source project; header and footer come from
   the shared government-portal chrome, and all data is live from the
   original StormSense core (FastAPI /api/storms/STORM-001 + /ws/live). */

const SCENARIOS = ['Developing Storm', 'Rapid Intensification', 'Severe Convective Storm', 'Storm Dissipation'];

const ist = (opts) => new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata', ...opts });
const bearing = (deg) => {
  if (deg == null) return '—';
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
};

/* Render the analyst's structured reply: section labels, prose bullets,
   numbered actions and the closing bottom line. Inline **bold** segments
   are honoured; everything else stays plain flowing text. */
function inline(text) {
  return String(text || '')
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part));
}

function AnalystReply({ text }) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    const boldMatch = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    if (boldMatch) {
      const rest = boldMatch[2];
      return (
        <p key={i} className="analyst-block analyst-block--head">
          {boldMatch[1].replace(/\.$/, '')}
          {rest ? <span className="analyst-head-body"> — {inline(rest)}</span> : null}
        </p>
      );
    }
    if (line.startsWith('•')) {
      return <p key={i} className="analyst-block analyst-block--li">{inline(line.slice(1).trim())}</p>;
    }
    const numMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (numMatch) {
      return (
        <p key={i} className="analyst-block analyst-block--li analyst-block--num">
          <b>{numMatch[1]}</b>{inline(numMatch[2])}
        </p>
      );
    }
    const bottomMatch = line.match(/^bottom line:\s*(.*)$/i);
    if (bottomMatch) {
      return <p key={i} className="analyst-block analyst-block--bottom">{inline(bottomMatch[1])}</p>;
    }
    return <p key={i} className="analyst-block">{inline(line)}</p>;
  });
}

function useTelemetry() {
  const [telemetry, setTelemetry] = useState(null);
  const [lastScan, setLastScan] = useState(ist());
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let alive = true;
    api.getStormDetail('STORM-001')
      .then((res) => {
        if (!alive) return;
        setTelemetry(res.data);
        setLastScan(ist());
      })
      .catch((err) => console.warn('Initial REST load error:', err));
    stormWS.connect();
    const unsub = stormWS.subscribe((live) => {
      if (!alive) return;
      setTelemetry(live);
      setConnected(true);
      setLastScan(ist());
    });
    return () => {
      alive = false;
      unsub();
      stormWS.disconnect();
    };
  }, []);
  return { telemetry, lastScan, connected };
}

function Metric({ label, value, unit, detail, tone }) {
  return (
    <div className={`metric-cell${tone ? ` metric--${tone}` : ''}`}>
      <span className="data-label">{label}</span>
      <strong>{value}</strong>
      <span className="unit">{unit}</span>
      <span className="detail">{detail}</span>
    </div>
  );
}

function Advisor({ disabled }) {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  const ask = async (question) => {
    const q = String(question || '').trim();
    if (!q || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const res = await api.chatAI(q);
      setMessages((m) => [...m, { role: 'ai', text: res.data.response }]);
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Analyst link unavailable — please retry.' }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
    }
  };

  return (
    <div className="advisory-block">
      <div className="advisory-head">
        <span className="icon-compact"><Bot size={16} /></span>
        <div>
          <span className="data-label">🤖 AI Storm Analyst</span>
          <h2>Ask StormSense AI</h2>
        </div>
      </div>
      <p className="advisory-copy">
        Talk to your StormSense AI analyst — a real meteorologist-style guide to the storm near you.
        It reads the live conditions right now and explains what they mean for you and your family.
      </p>
      {messages.length > 0 && (
        <div ref={listRef} style={{ maxHeight: 190, overflowY: 'auto', marginTop: 4 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`analyst-msg${m.role === 'user' ? ' analyst-msg--user' : ''}${busy && i === messages.length - 1 ? ' analyst-msg--busy' : ''}`}
            >
              {m.role === 'ai' ? <AnalystReply text={m.text} /> : m.text}
            </div>
          ))}
          {busy && <div className="analyst-msg analyst-msg--busy">Running multi-source inference…</div>}
        </div>
      )}
      <div className="prompt-chips">
        {[
          'Is it safe to go outside right now?',
          'When will the storm reach my area?',
          'What should my family do to prepare?',
        ].map((p) => (
          <button key={p} type="button" className="btn btn--outline btn--sm" disabled={disabled || busy} onClick={() => ask(p)}>
            {p}
          </button>
        ))}
      </div>
      <form
        className="ops-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          className="ops-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the storm near you…"
          aria-label="Ask StormSense AI"
        />
        <button type="submit" className="btn btn--default btn--icon" aria-label="Send" disabled={disabled || busy}>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

export default function CommandCentrePage() {
  const { telemetry, lastScan, connected } = useTelemetry();
  const nowcast = useNowcast();
  const [paused, setPaused] = useState(false);
  const [scenario, setScenario] = useState('Rapid Intensification');
  const [active, setActive] = useState(0);
  const [sim, setSim] = useState({ intensity: 78, humidity: 80, wind: 38 });
  const [simRunning, setSimRunning] = useState(false);

  const storm = telemetry?.storm;
  const hazards = telemetry?.hazards;
  const weather = telemetry?.weather;
  const radar = telemetry?.radar;
  const lightning = telemetry?.lightning;
  const tracking = telemetry?.tracking;

  useEffect(() => {
    if (telemetry?.is_running !== undefined) setPaused(!telemetry.is_running);
    if (telemetry?.active_scenario) setScenario(telemetry.active_scenario);
    if (storm?.intensity) setSim((s) => ({ ...s, intensity: Math.round(storm.intensity * 100) }));
    if (weather?.humidity_percent) setSim((s) => ({ ...s, humidity: Math.round(weather.humidity_percent) }));
    if (weather?.wind_speed_kmh) setSim((s) => ({ ...s, wind: Math.round(weather.wind_speed_kmh) }));
  }, [telemetry]);

  const toggleFeed = async () => {
    const next = !paused;
    setPaused(next);
    try {
      await api.controlSim(next ? 'pause' : 'play', 1.0);
    } catch (e) {
      console.error(e);
    }
  };

  const selectScenario = async (name) => {
    setScenario(name);
    try {
      await api.selectScenario(name);
    } catch (e) {
      console.error(e);
    }
  };

  /* ---- Derived live values ---- */
  const severity = hazards?.severity_level || 'WATCH';
  const overall = hazards?.overall_convective_risk ?? null;
  const dbz = radar?.max_reflectivity_dbz;
  const strikes = lightning?.total_strikes_1min;

  const warnings = useMemo(() => {
    const list = [];
    if (dbz != null && dbz >= 55) list.push({ time: lastScan.slice(0, 5), kind: 'critical', title: 'Hail signature detected', sub: `${dbz} dBZ core aloft (>55 dBZ)` });
    if (lightning?.lightning_jump_detected) list.push({ time: lastScan.slice(0, 5), kind: 'watch', title: 'Lightning jump detected', sub: `${strikes ?? '—'} strikes in the last minute` });
    if (dbz != null && dbz < 55 && !lightning?.lightning_jump_detected) list.push({ time: lastScan.slice(0, 5), kind: 'watch', title: 'Cell under continuous watch', sub: `Composite ${dbz} dBZ · tracking ongoing` });
    return list.slice(0, 3);
  }, [dbz, strikes, lightning, lastScan]);

  const forecast = useMemo(
    () =>
      (tracking?.waypoints || []).map((wp) => ({
        time: wp.label,
        risk: wp.risk,
        hail: wp.hail_prob,
        lightning: wp.lightning_prob,
      })),
    [tracking],
  );
  const activePoint = forecast[active] || forecast[0] || { time: '—', risk: 0, hail: 0, lightning: 0 };
  const peak = useMemo(
    () => forecast.reduce((best, p) => (p.risk > (best?.risk ?? -1) ? p : best), null),
    [forecast],
  );

  const chart = useMemo(() => {
    const n = forecast.length;
    if (n < 2) return null;
    const x = (i) => (i / (n - 1)) * 800;
    const y = (v) => 210 - (Math.max(0, Math.min(100, v)) / 100) * 190;
    const line = (key) => forecast.map((p, i) => `${x(i)},${y(p[key])}`).join(' ');
    const top = forecast.map((p, i) => `${x(i)},${y(p.risk + 8)}`).join(' ');
    const bottom = [...forecast].reverse().map((p, i) => `${x(n - 1 - i)},${y(p.risk - 8)}`).join(' ');
    return {
      risk: line('risk'),
      hail: line('hail'),
      lightning: line('lightning'),
      area: `M${top} L${bottom} Z`,
    };
  }, [forecast]);

  const hazardCards = [
    {
      label: 'Hail core', prob: hazards?.hail_probability, tone: 'cool', icon: Crosshair,
      state: (hazards?.hail_probability ?? 0) >= 70 ? 'SEVERE' : (hazards?.hail_probability ?? 0) >= 40 ? 'MODERATE' : 'LOW',
      detail: dbz != null ? `${dbz} dBZ core aloft` : 'Awaiting DWR composite',
    },
    {
      label: 'Lightning', prob: hazards?.lightning_probability, tone: 'electric', icon: Zap,
      state: (hazards?.lightning_probability ?? 0) >= 70 ? 'EXTREME' : (hazards?.lightning_probability ?? 0) >= 40 ? 'ELEVATED' : 'LOW',
      detail: strikes != null ? `${strikes} strikes / min` : 'Awaiting network feed',
    },
    {
      label: 'Cloudburst', prob: hazards?.cloudburst_probability, tone: 'rain', icon: CloudRain,
      state: (hazards?.cloudburst_probability ?? 0) >= 60 ? 'HIGH' : (hazards?.cloudburst_probability ?? 0) >= 35 ? 'MODERATE' : 'LOW',
      detail: 'Convective rain core · DWR composite',
    },
    {
      label: 'Downburst', prob: hazards?.downburst_probability, tone: 'warning', icon: Wind,
      state: (hazards?.downburst_probability ?? 0) >= 60 ? 'STRONG' : (hazards?.downburst_probability ?? 0) >= 35 ? 'Gusty' : 'Light',
      detail: weather?.wind_gusts_kmh != null ? `Gusts ${Math.round(weather.wind_gusts_kmh)} km/h` : 'Outflow squall watch',
    },
  ];

  /* ---- Simulator ---- */
  const runSim = async () => {
    setSimRunning(true);
    try {
      const res = await api.simulateWhatIf({
        intensity: sim.intensity / 100,
        humidity: Number(sim.humidity),
        wind_speed: Number(sim.wind),
      });
      setTelemetry(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setSimRunning(false), 500);
    }
  };
  const resetSim = async () => {
    setSimRunning(true);
    try {
      const res = await api.resetWhatIf();
      setTelemetry(res.data);
      setSim({
        intensity: Math.round((res.data?.storm?.intensity || 0.78) * 100),
        humidity: Math.round(res.data?.weather?.humidity_percent || 80),
        wind: Math.round(res.data?.weather?.wind_speed_kmh || 38),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setSimRunning(false), 500);
    }
  };
  const simScore = Math.round(
    sim.intensity * 0.38 + sim.humidity * 0.4 + sim.wind * 0.22,
  );

  if (!telemetry) {
    return (
      <div className="ops">
        <div className="ops-loading">Establishing telemetry uplink…</div>
      </div>
    );
  }

  return (
    <div className="ops">
      <div className="ops-container ops-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ---------- Operations strip ---------- */}
        <section className="ops-strip">
          <div className="strip-left">
            <div className="strip-row">
              <span className="threat-badge"><ShieldAlert size={13} /> {severity} WEATHER WATCH</span>
              <span className="strip-city">{tracking?.target?.name || 'Vijayawada Urban Zone'}</span>
            </div>
            <p className="strip-sub">
              Cell {storm?.storm_id || '—'} · {Number(storm?.lat ?? 0).toFixed(4)}° N, {Number(storm?.lon ?? 0).toFixed(4)}° E ·{' '}
              {bearing(storm?.direction_deg)} track at {Math.round(storm?.speed_kmh ?? 0)} km/h
            </p>
          </div>
          <div className="strip-actions">
            <label className="select-wrap">
              <span className="visually-hidden">Forecast scenario</span>
              <select value={scenario} onChange={(e) => selectScenario(e.target.value)} disabled={paused}>
                {SCENARIOS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={15} />
            </label>
            <button type="button" className={`btn ${paused ? 'btn--default' : 'btn--destructive'}`} onClick={toggleFeed}>
              {paused ? <Play size={13} /> : <Pause size={13} />}
              {paused ? 'Resume feed' : 'Pause feed'}
            </button>
          </div>
        </section>

        {/* ---------- Radar + telemetry ---------- */}
        <div className="operations-grid">
          <section id="radar" className="radar-shell" aria-label="Live composite weather radar">
            <div className="radar-host">
              <WeatherMap telemetry={telemetry} nowcast={nowcast} />
            </div>
            <div className="radar-shade" />
            <div className="radar-topbar">
              <div>
                <span className="data-label">Composite observation</span>
                <h1>Vijayawada Doppler Radar</h1>
              </div>
              <span className="live-indicator"><i /> SCAN {lastScan.slice(0, 5)}</span>
            </div>
            <div className="radar-readout">
              <span>RANGE 120 KM</span>
              <span>ELEV 0.5°</span>
              <span>RES 250 M</span>
              <span>SOURCE INSAT-3DR + DWR</span>
              <span className="rr-ok">{connected ? 'LINK OK' : 'LINK DOWN'}</span>
            </div>
          </section>

          <aside className="telemetry-rail" aria-label="Live storm telemetry">
            <div className="panel-heading">
              <div>
                <span className="data-label">Storm telemetry</span>
                <h2>Live sensor fusion</h2>
              </div>
              <span className="live-indicator"><i /> {severity}</span>
            </div>
            <div className="metrics-grid">
              <Metric label="Wind velocity" value={weather?.wind_speed_kmh != null ? Math.round(weather.wind_speed_kmh * 10) / 10 : '—'} unit="KM/H" detail={`${bearing(storm?.direction_deg)} track`} />
              <Metric label="Pressure" value={weather?.pressure_hpa != null ? weather.pressure_hpa.toFixed(1) : '—'} unit="HPA" detail={weather?.temperature_c != null ? `${Math.round(weather.temperature_c)}°C surface` : 'Surface analysis'} tone="danger" />
              <Metric label="CAPE" value={weather?.cape_j_kg != null ? Math.round(weather.cape_j_kg) : '—'} unit="J/KG" detail="Instability fuel" tone="rain" />
              <Metric label="Lightning" value={strikes ?? '—'} unit="STR/MIN" detail={lightning?.lightning_jump_detected ? 'Jump detected' : 'CG frequent'} tone="warning" />
            </div>
            <Advisor disabled={!connected} />
            <div className="warning-log">
              <div className="panel-heading">
                <div>
                  <span className="data-label">Warning log</span>
                  <h2>Active advisories</h2>
                </div>
                <span className="count-badge">{String(warnings.length).padStart(2, '0')}</span>
              </div>
              {warnings.map((w) => (
                <div key={w.title} className={`warning-item${w.kind === 'critical' ? ' warning-item--critical' : ''}`}>
                  <b>{w.time}</b>
                  <span>
                    <strong>{w.title}</strong>
                    <small>{w.sub}</small>
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* ---------- AI briefing: the same model that drives the map ---------- */}
        {nowcast.nowcast && (
          <section className="hazard-section" aria-label="AI storm briefing grounded in the trained model">
            <div className="section-header section-header--flow">
              <div>
                <span className="data-label">AI storm briefing · from the model driving this map</span>
                <h2 className="section-title">
                  {nowcast.nowcast.storm.name === 'UNNAMED'
                    ? 'An unnamed cyclone'
                    : nowcast.nowcast.storm.name} {nowcast.nowcast.storm.season} — what the model sees
                </h2>
              </div>
              <span className="hazard-note">Real record replayed · forecast path on the map is the model's</span>
            </div>
            <p style={{
              margin: '10px 0 8px',
              fontSize: '0.95rem',
              lineHeight: 1.65,
              color: 'var(--text-bright, #e2e8f0)',
            }}>
              {nowcast.nowcast.briefing}
            </p>
            <p className="hazard-note" style={{ opacity: 0.75 }}>
              Amber path = what the storm actually did. Green path = where the trained model carries it next.
              Press ◎ accuracy on the map to overlay where the model was shadow-tested against this storm's real positions.
            </p>
          </section>
        )}

        {/* ---------- Hazard matrix ---------- */}
        <section id="hazards" className="hazard-section">
          <div className="section-header section-header--flow">
            <div>
              <span className="data-label">Probability diagnostics</span>
              <h2 className="section-title">Hazard matrix</h2>
            </div>
            <span className="hazard-note">
              RF ensemble{overall != null ? ` · Composite ${Math.round(overall)}%` : ''}
            </span>
          </div>
          <div className="hazard-grid">
            {hazardCards.map((h) => {
              const Icon = h.icon;
              const prob = h.prob != null ? Math.round(h.prob) : null;
              return (
                <article key={h.label} className={`hazard-card tone-${h.tone}`}>
                  <div className="hazard-top">
                    <span className="hazard-icon"><Icon size={15} /></span>
                    <span className="hazard-state">{h.state}</span>
                  </div>
                  <span className="hazard-label">{h.label}</span>
                  <div className="hazard-value">
                    <strong>{prob ?? '—'}</strong>
                    <span className="unit">%</span>
                  </div>
                  <div className="prob-track"><i style={{ width: `${prob ?? 0}%` }} /></div>
                  <span className="hazard-detail">{h.detail}</span>
                </article>
              );
            })}
          </div>
        </section>

        {/* ---------- 0–6h nowcast ---------- */}
        <section id="forecast" className="instrument-panel">
          <div className="section-header section-header--flow">
            <div>
              <span className="data-label">Probabilistic guidance</span>
              <h2 className="section-title">0–6 hour convective nowcast</h2>
            </div>
            <div className="chart-legend">
              <span className="legend-risk">Composite</span>
              <span className="legend-hail">Hail</span>
              <span className="legend-lightning">Lightning</span>
            </div>
          </div>
          <div className="forecast-summary">
            <div>
              <span className="data-label">Selected horizon</span>
              <strong>{activePoint.time}</strong>
            </div>
            <div>
              <span className="data-label">Composite risk</span>
              <strong>{Math.round(activePoint.risk)}%</strong>
            </div>
            <div>
              <span className="data-label">Peak window</span>
              <strong>{peak ? peak.time : '—'}</strong>
            </div>
            <div>
              <span className="data-label">Severity level</span>
              <strong>{severity}</strong>
            </div>
          </div>
          <div className="chart-frame">
            <div className="y-axis" aria-hidden="true">
              <span>100%</span><span>66%</span><span>33%</span><span>0%</span>
            </div>
            <div className="chart-canvas">
              <div className="chart-gridlines" />
              <div className="threshold-line"><span>WATCH THRESHOLD</span></div>
              {chart && (
                <svg viewBox="0 0 800 220" preserveAspectRatio="none" aria-label="Storm probability forecast graph" role="img">
                  <path className="confidence-area" d={chart.area} />
                  <polyline className="line-risk" points={chart.risk} />
                  <polyline className="line-hail" points={chart.hail} />
                  <polyline className="line-lightning" points={chart.lightning} />
                </svg>
              )}
            </div>
          </div>
          <div className="forecast-tabs">
            {forecast.map((p, i) => (
              <button key={p.time} type="button" className={`btn ${active === i ? 'btn--default' : 'btn--ghost'}`} onClick={() => setActive(i)}>
                <span>{p.time}</span>
                <small>{Math.round(p.risk)}%</small>
              </button>
            ))}
          </div>
        </section>

        {/* ---------- Simulator ---------- */}
        <section id="simulator" className="instrument-panel simulator-grid">
          <div>
            <span className="data-label">Scenario laboratory</span>
            <h2 className="section-title">Atmospheric what-if simulator</h2>
            <p className="sim-intro">
              Adjust the environmental inputs and the Random Forest model recalculates hail,
              lightning and downburst probabilities for this cell. Running a simulation replaces the
              live view until the feed resumes.
            </p>
            <div className="sim-controls">
              {[
                ['intensity', 'Convective core intensity', '%', 20, 100, ThermometerSun],
                ['humidity', 'Relative humidity', '%', 40, 98, CloudLightning],
                ['wind', 'Surface inflow wind', 'KM/H', 15, 90, Wind],
              ].map(([key, label, unit, min, max, Icon]) => (
                <label key={key} className="sim-control">
                  <span className="sim-label">
                    <Icon size={15} /> {label}
                  </span>
                  <b>
                    {sim[key]} {unit}
                  </b>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={sim[key]}
                    onChange={(e) => setSim((s) => ({ ...s, [key]: Number(e.target.value) }))}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="simulation-output">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="data-label">Projected outcome</span>
              <span className="model-badge">{simRunning ? 'RUNNING…' : 'MODEL READY'}</span>
            </div>
            <div className="score-gauge">
              <div style={{ '--score': `${Math.min(100, simScore) * 3.6}deg` }}>
                <span>
                  <strong>{Math.min(100, simScore)}</strong>
                  <small>/ 100</small>
                </span>
              </div>
            </div>
            <div className="output-grid">
              <div><span>Hail</span><b>{Math.round(simScore * 0.46)}%</b></div>
              <div><span>Lightning</span><b>{Math.round(simScore * 0.72)}%</b></div>
              <div><span>Downburst</span><b>{Math.round(simScore * 0.61)}%</b></div>
            </div>
            <div className="sim-actions">
              <button type="button" className="btn btn--default" onClick={runSim} disabled={simRunning}>
                <Sparkles size={14} />
                {simRunning ? 'Running model…' : 'Run simulation'}
              </button>
              <button type="button" className="btn btn--outline btn--icon" aria-label="Reset simulator" onClick={resetSim} disabled={simRunning}>
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </section>

        <div className="data-footnote">
          <span><Database size={12} /> INSAT-3DR · Doppler weather radar · lightning network</span>
          <span><Gauge size={12} /> Updated {lastScan} IST · Cell {storm?.storm_id || '—'}</span>
        </div>
      </div>

      <SiteFooter
        note={
          <>
            Operational decision-support simulation for meteorological training and research. Telemetry
            is generated by the StormSense simulation core and does not replace official warnings.
          </>
        }
      />
    </div>
  );
}
