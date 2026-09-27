import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDown, ArrowRight, Bell, ChevronRight, Cloud,
  CloudLightning, CloudRain, Crosshair, Database, Gauge, Layers3, Map,
  Pause, Play, Radar, Radio, Satellite, ScanLine, ShieldAlert, SlidersHorizontal,
  Waves, Wind, Zap,
} from 'lucide-react';
import '../styles/architecture.css';
import { api } from '../../services/api';

/* Architecture page ported from aharon-kumar-kosetti/aura-weather.
   Visual design follows the source project (own chrome, navy/saffron);
   the forecast chart and decision scenario are wired to the live
   StormSense core (FastAPI /api/storms/STORM-001 + /ws/live). */

const STAGES = [
  {
    title: 'Data Sources', short: 'Observe', description: 'A network of independent feeds captures the atmosphere as it changes.',
    icon: Radar,
    tools: [
      { name: 'Weather radar', icon: Radar }, { name: 'Satellite', icon: Satellite },
      { name: 'Lightning networks', icon: Zap }, { name: 'Weather stations', icon: Gauge },
      { name: 'Ocean data', icon: Waves }, { name: 'Atmospheric models', icon: Cloud },
    ],
    signal: '6 source families', readout: 'Broad atmospheric coverage',
  },
  {
    title: 'Data Ingestion', short: 'Stream', description: 'Incoming observations are synchronized into a continuous, time-aware stream.',
    icon: Radio,
    tools: [{ name: 'Real-time streams', icon: Radio }],
    signal: 'Continuous', readout: 'Fresh observations arrive',
  },
  {
    title: 'Processing', short: 'Prepare', description: 'Signals are cleaned, normalized and aligned across geography and time.',
    icon: SlidersHorizontal,
    tools: [
      { name: 'Data cleaning', icon: ScanLine }, { name: 'Normalization', icon: SlidersHorizontal },
      { name: 'Spatial processing', icon: Crosshair }, { name: 'Temporal processing', icon: Activity },
    ],
    signal: '4 processing passes', readout: 'Comparable, reliable inputs',
  },
  {
    title: 'Intelligence Engine', short: 'Understand', description: 'Pattern recognition connects storm cells, movement and likely severity.',
    icon: Layers3,
    tools: [
      { name: 'Storm detection', icon: CloudLightning }, { name: 'Pattern recognition', icon: Layers3 },
      { name: 'Movement tracking', icon: Wind }, { name: 'Intensity estimation', icon: Gauge },
    ],
    signal: '4 analysis layers', readout: 'Weather patterns identified',
  },
  {
    title: 'Nowcast Engine', short: 'Predict', description: 'Short-range projections show where conditions may move next.',
    icon: CloudRain,
    tools: [
      { name: '0–15 min', icon: Gauge }, { name: '15–30 min', icon: Gauge }, { name: '30–60 min', icon: Gauge },
    ],
    signal: '0–60 min horizon', readout: 'Near-term outlook generated',
  },
  {
    title: 'Alert Engine', short: 'Evaluate', description: 'Risk, confidence and location determine the right warning at the right time.',
    icon: ShieldAlert,
    tools: [
      { name: 'Risk detection', icon: ShieldAlert }, { name: 'Confidence scoring', icon: Gauge },
      { name: 'Geographic targeting', icon: Crosshair },
    ],
    signal: 'Targeted alerts', readout: 'Decision threshold assessed',
  },
  {
    title: 'User Experience', short: 'Act', description: 'The result reaches people through clear dashboards, maps and notifications.',
    icon: Bell,
    tools: [
      { name: 'Command centre', icon: Activity }, { name: 'Maps', icon: Map },
      { name: 'Alerts & notifications', icon: Bell }, { name: 'Public dashboard', icon: Database },
    ],
    signal: 'Actionable output', readout: 'People are informed',
  },
];

const SOURCES = [
  { title: 'Weather Radar', icon: Radar, type: 'REMOTE SENSING', text: 'Doppler reflectivity volumes reveal precipitation cores, hail spikes and storm structure.' },
  { title: 'INSAT / Satellite', icon: Satellite, type: 'REMOTE SENSING', text: 'Thermal infrared imagery provides cloud-top temperature, convective growth and cirrus tracking.' },
  { title: 'Lightning Detection', icon: Zap, type: 'GROUND NETWORK', text: 'Cloud-to-ground and in-cloud stroke detection feeds time-sensitive alerts.' },
  { title: 'Automatic Weather Stations', icon: Gauge, type: 'IN-SITU', text: 'Surface pressure, temperature, humidity and wind observations anchor model calibration.' },
  { title: 'Rain Gauges', icon: CloudRain, type: 'IN-SITU', text: 'Point accumulation measurements validate radar-derived rainfall estimates.' },
  { title: 'Numerical Weather Prediction', icon: Cloud, type: 'MODEL DATA', text: 'Background atmospheric fields supply CAPE, shear and moisture for the intelligence layer.' },
  { title: 'Ocean / Coastal Data', icon: Waves, type: 'MARINE', text: 'Sea-surface conditions support cyclone and coastal wind nowcasts.' },
];

const MODULES = [
  { icon: Radar, label: 'Storm detection' },
  { icon: Crosshair, label: 'Cell tracking' },
  { icon: Wind, label: 'Motion estimation' },
  { icon: CloudRain, label: 'Rainfall prediction' },
  { icon: Zap, label: 'Lightning prediction' },
  { icon: ShieldAlert, label: 'Severity classification' },
  { icon: Gauge, label: 'Confidence estimation' },
];

const STEPS = ['Weather observation', 'Storm detected', 'Risk calculated', 'Region identified', 'Alert generated', 'User notified'];

const STEP_TEXT = [
  'The live observation feed registers a fast-growing convective cell in the Krishna basin west of Vijayawada.',
  'The intelligence engine identifies a strengthening storm cell and begins tracking its motion.',
  'Observed structure and movement are combined to estimate local risk and forecast confidence.',
  'The likely impact area is narrowed to Vijayawada Urban Zone, Andhra Pradesh.',
  'A warning is drafted when severity and confidence pass the alert threshold.',
  'The warning is delivered through the command centre, maps and notifications.',
];

function Chart({ series, metric, selected, onSelect }) {
  const data = series[metric];
  if (!data) return null;
  const coordinates = data.points.map((value, i) => ({ x: 36 + i * 52, y: 150 - value * 1.18 }));
  const line = coordinates.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const area = `${line} L${coordinates[coordinates.length - 1]?.x ?? 608} 160 L36 160 Z`;
  return (
    <div className="chart-wrap">
      <div className="chart-value">
        <span>{data.points[selected] ?? 0}</span> <small>{data.unit}</small>
        <em>at +{selected * 5} min</em>
      </div>
      <svg className="signal-chart" viewBox="0 0 650 185" role="img" aria-label={`${metric} forecast trend; select a point for its value`}>
        <defs>
          <linearGradient id="aura-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={data.color} stopOpacity=".26" />
            <stop offset="100%" stopColor={data.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="36" y1={y} x2="608" y2={y} stroke="var(--chart-grid)" strokeDasharray="3 6" />
        ))}
        <path d={area} fill="url(#aura-area-fill)" />
        <path d={line} fill="none" stroke={data.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={coordinates[selected]?.x ?? 36} x2={coordinates[selected]?.x ?? 36} y1="24" y2="160" stroke={data.color} strokeOpacity=".45" strokeDasharray="3 5" />
        {coordinates.map((p, i) => (
          <g
            key={i}
            onClick={() => onSelect(i)}
            className="chart-point"
            role="button"
            tabIndex={0}
            aria-label={`${i * 5} minutes, ${data.points[i]} ${data.unit}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); } }}
          >
            <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
            <circle cx={p.x} cy={p.y} r={selected === i ? 6 : 3} fill={selected === i ? 'var(--chart-surface)' : data.color} stroke={data.color} strokeWidth={selected === i ? 3 : 0} />
          </g>
        ))}
      </svg>
      <div className="chart-axis"><span>NOW</span><span>+15 MIN</span><span>+30 MIN</span><span>+45 MIN</span><span>+60 MIN</span></div>
    </div>
  );
}

export default function ArchitecturePage() {
  const [activeStage, setActiveStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [metric, setMetric] = useState('Rainfall');
  const [selectedPoint, setSelectedPoint] = useState(8);
  const [activeStep, setActiveStep] = useState(4);
  const [storm, setStorm] = useState(null);

  /* Live backend snapshot for the wired readouts */
  useEffect(() => {
    let alive = true;
    api.getStormDetail('STORM-001')
      .then((res) => { if (alive) setStorm(res.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  /* Flow board auto-advance (source behaviour) */
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setActiveStage((current) => (current + 1) % STAGES.length), 4200);
    return () => window.clearInterval(timer);
  }, [playing]);

  /* ---- Live series: 0–6h waypoints resampled to the 0–60 min window ---- */
  const series = useMemo(() => {
    const wps = storm?.tracking?.waypoints || [];
    const sample = (pick) => {
      const pts = wps.slice(0, 13).map((wp) => Math.max(0, Math.min(100, pick(wp))));
      if (pts.length < 2) return null;
      const out = [];
      for (let i = 0; i < 12; i += 1) {
        const t = (i / 11) * (pts.length - 1);
        const lo = Math.floor(t);
        const hi = Math.min(pts.length - 1, lo + 1);
        out.push(Math.round(pts[lo] + (pts[hi] - pts[lo]) * (t - lo)));
      }
      return out;
    };
    const rainfall = sample((wp) => wp.cloudburst_prob);
    const wind = sample((wp) => wp.risk);
    const lightning = sample((wp) => wp.lightning_prob);
    if (!rainfall || !wind || !lightning) return null;
    return {
      Rainfall: { unit: 'mm/hr', color: 'var(--chart-navy)', points: rainfall, icon: CloudRain },
      Wind: { unit: 'km/h', color: 'var(--chart-green)', points: wind, icon: Wind },
      Lightning: { unit: 'strikes', color: 'var(--chart-saffron)', points: lightning, icon: Zap },
    };
  }, [storm]);

  const hazards = storm?.hazards;
  const severity = hazards?.severity_level || 'WATCH';
  const hailProb = hazards?.hail_probability;
  const track = storm?.tracking;
  const targetName = track?.target?.name || 'Vijayawada Urban Zone, Andhra Pradesh';
  const region = targetName.replace(/ Urban Zone$/i, ' Region');
  const countdown = track?.target?.formatted_countdown || 'Next 30–45 minutes';
  const confidence = hailProb != null ? `${Math.round(hailProb)}% · live model` : '92% · illustrative';
  const monitoring = storm ? Boolean(track?.target?.imminent_threat) : null;
  const liveNow = monitoring != null;

  const stage = STAGES[activeStage] ?? STAGES[0];

  return (
    <div className="aura">
      <div id="top">
        <section className="title-band">
          <div className="container title-content">
            <div className="eyebrow light">SYSTEM OVERVIEW <span className="eyebrow-line" /></div>
            <h1>Explore Architecture<span className="title-period">.</span></h1>
            <p>The system behind weather intelligence — from the first signal to the final alert.</p>
          </div>
        </section>

        {/* ---------- 7-stage flow ---------- */}
        <section id="architecture" className="flow-section section-band">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">END-TO-END FLOW <span className="eyebrow-line" /></div>
                <h2>How an observation becomes a warning</h2>
                <p>Seven stages turn raw atmospheric signals into a public alert.</p>
              </div>
              <div className="flow-controls">
                <span className="flow-counter">STAGE <strong>{String(activeStage + 1).padStart(2, '0')}</strong> / 07</span>
                <button
                  type="button"
                  className="btn-icon"
                  aria-label={playing ? 'Pause flow animation' : 'Play flow animation'}
                  title={playing ? 'Pause flow' : 'Play flow'}
                  onClick={() => setPlaying(!playing)}
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
              </div>
            </div>
            <div className="flow-board">
              <div className="flow-list">
                {STAGES.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => { setActiveStage(index); setPlaying(false); }}
                      className={`flow-row ${activeStage === index ? 'is-active' : ''}`}
                      aria-pressed={activeStage === index}
                    >
                      <span className="stage-index">
                        <span>STAGE {String(index + 1).padStart(2, '0')}</span>
                        <strong>{item.title}</strong>
                      </span>
                      <span className="stage-track"><i className="track-dot" /></span>
                      <span className="stage-content">
                        <span className="stage-content-top">
                          <span className="stage-summary"><Icon size={17} /><span>{item.short}</span></span>
                          {activeStage === index && <span className="active-caption">CURRENT STAGE <ChevronRight size={13} /></span>}
                        </span>
                        <span className="tool-list">
                          {item.tools.map((tool) => {
                            const ToolIcon = tool.icon;
                            return (
                              <span className="tool-pill" key={tool.name}><ToolIcon size={13} />{tool.name}</span>
                            );
                          })}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flow-detail" aria-live="polite">
                <div className="detail-top">
                  <span className="detail-number">0{activeStage + 1} / 07</span>
                  <stage.icon size={27} />
                </div>
                <div>
                  <div className="eyebrow light">{stage.short.toUpperCase()} / {stage.title.toUpperCase()}</div>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                </div>
                <div className="detail-foot">
                  <span><small>SIGNAL</small><strong>{stage.signal}</strong></span>
                  <span><small>OUTCOME</small><strong>{stage.readout}</strong></span>
                </div>
                <div className="detail-progress">
                  {STAGES.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      aria-label={`Go to stage ${index + 1}: ${item.title}`}
                      title={item.title}
                      className={activeStage === index ? 'on' : ''}
                      onClick={() => { setActiveStage(index); setPlaying(false); }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <p className="section-note">
              Select any stage to follow a signal through the system — the same pipeline runs live in the{' '}
              <a href="#/command-centre">Command Centre</a>. <ArrowDown size={13} />
            </p>
          </div>
        </section>

        {/* ---------- Data sources ---------- */}
        <section id="overview" className="sources-section section-band">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">INPUTS <span className="eyebrow-line" /></div>
                <h2>A multi-source view of the atmosphere</h2>
                <p>Each source is an example of a configurable input — StormSense adapts to the feeds available.</p>
              </div>
              <span className="section-index">01 / INPUTS</span>
            </div>
            <div className="source-grid">
              {SOURCES.map((source, i) => {
                const Icon = source.icon;
                return (
                  <div className="source-item" key={source.title}>
                    <div className="source-top"><Icon size={22} /><span>{String(i + 1).padStart(2, '0')}</span></div>
                    <h3>{source.title}</h3>
                    <span className="source-type">{source.type} · EXAMPLE SOURCE</span>
                    <p>{source.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- Intelligence: engine + live chart ---------- */}
        <section id="intelligence" className="intelligence-section section-band">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">INTELLIGENCE <span className="eyebrow-line" /></div>
                <h2>The Nowcast Engine</h2>
                <p>Atmospheric pattern recognition and short-range projection, working together.</p>
              </div>
              <span className="section-index">02 / ANALYSIS</span>
            </div>
            <div className="engine-panel">
              <div className="engine-intro">
                <span className="engine-icon"><Layers3 size={24} /></span>
                <div>
                  <strong>STORMSENSE ENGINE</strong>
                  <small>AI-ASSISTED ATMOSPHERIC INTELLIGENCE</small>
                </div>
                <span className="engine-live"><span className="live-dot" /> {storm ? 'LIVE CELL' : 'SIMULATION'}</span>
              </div>
              <div className="engine-modules">
                {MODULES.map((module) => {
                  const Icon = module.icon;
                  return <span key={module.label}><Icon size={16} />{module.label}</span>;
                })}
              </div>
            </div>
            <div className="visualization">
              <div className="viz-heading">
                <div>
                  <span className="eyebrow">FORECAST SIGNAL / {storm ? 'LIVE CELL DATA' : 'ILLUSTRATIVE DATA'}</span>
                  <h3>Short-range trend</h3>
                </div>
                <div className="metric-tabs" role="group" aria-label="Forecast metric">
                  {series && Object.keys(series).map((name) => {
                    const Icon = series[name].icon;
                    return (
                      <button
                        key={name}
                        type="button"
                        className={`metric-tab ${metric === name ? 'selected' : ''}`}
                        aria-pressed={metric === name}
                        onClick={() => { setMetric(name); setSelectedPoint(8); }}
                      >
                        <Icon size={15} />{name}
                      </button>
                    );
                  })}
                </div>
              </div>
              {series ? (
                <Chart series={series} metric={metric} selected={selectedPoint} onSelect={setSelectedPoint} />
              ) : (
                <p className="viz-empty">
                  The forecast signal appears once the live cell feed is available. Open the{' '}
                  <a href="#/command-centre">Command Centre</a> to bring the simulation online.
                </p>
              )}
              <div className="viz-foot">
                <span><span className="live-dot" /> MODEL WINDOW · NEXT 60 MINUTES</span>
                <span>Select a point on the timeline to inspect its value <ArrowRight size={14} /></span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Decision walkthrough ---------- */}
        <section className="decision-section section-band">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">DECISION SUPPORT <span className="eyebrow-line" /></div>
                <h2>From data to decision</h2>
                <p>Every alert traces a complete, auditable chain from raw observation to notification.</p>
              </div>
              <span className="section-index">03 / ACTION</span>
            </div>
            <div className="decision-steps">
              {STEPS.map((step, i) => (
                <div className="decision-step-wrap" key={step}>
                  <button
                    type="button"
                    className={`decision-step ${activeStep === i ? 'selected' : ''}`}
                    onClick={() => setActiveStep(i)}
                    aria-pressed={activeStep === i}
                  >
                    <span>{String(i + 1).padStart(2, '0')}</span>{step}
                  </button>
                  {i < STEPS.length - 1 && <ArrowRight className="step-arrow" size={16} />}
                </div>
              ))}
            </div>
            <div className="alert-example">
              <div className="alert-main">
                <div className="eyebrow">WORKED SCENARIO · STEP {String(activeStep + 1).padStart(2, '0')}</div>
                <h3><ShieldAlert size={18} /> {severity} THUNDERSTORM</h3>
                <p>{STEP_TEXT[activeStep]}</p>
              </div>
              <div className="alert-facts">
                <div><span>LOCATION</span><strong>{region}</strong></div>
                <div><span>EXPECTED</span><strong>{countdown}</strong></div>
                <div><span>CONFIDENCE</span><strong>{confidence}</strong></div>
                <div>
                  <span>STATUS</span>
                  <strong className="status-text">
                    <span className="live-dot" /> {liveNow ? (monitoring ? 'Imminent — acting' : 'Monitoring') : 'Monitoring'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
