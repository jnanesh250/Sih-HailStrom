import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDown, ArrowRight, Bell, ChevronRight, Cloud,
  CloudLightning, CloudRain, Crosshair, Database, Gauge, Layers3, Map,
  Pause, Play, Radar, Radio, Satellite, ScanLine, ShieldAlert, SlidersHorizontal,
  Waves, Wind, Zap, Cpu, CheckCircle2, AlertTriangle, Eye, Server, RefreshCw
} from 'lucide-react';
import '../styles/architecture.css';
import { api } from '../../services/api';

/* ============================================================
   StormSense AI — Deep Architecture & Sensor Intelligence
   Interactive System Design, Data Sources Lab & Nowcast Engine
   ============================================================ */

const PIPELINE_STAGES = [
  {
    id: 'ingestion',
    title: 'Multi-Sensor Ingestion',
    short: 'Ingest',
    category: 'Edge Sensors',
    icon: Radio,
    latency: '12 ms',
    throughput: '1.4 GB/min',
    description: 'High-frequency telemetry stream from S-Band Doppler Radars, INSAT-3DR multispectral imagers, and ground lightning sensors.',
    formula: 'Δt = |t_sensor - t_sync| < 50ms',
    specs: ['DWR S-Band (2.7 GHz)', 'INSAT-3DR 6-Channel IR', 'LINET TOA Array', 'AWS Surface Mesonet'],
    signal: '4 Primary Sensor Meshes',
    readout: 'Zero packet drop stream synchronization',
  },
  {
    id: 'preprocessing',
    title: 'Spatial-Temporal Preprocessing',
    short: 'Normalize',
    category: 'Grid Calibration',
    icon: SlidersHorizontal,
    latency: '24 ms',
    throughput: '850 MB/s',
    description: 'Ground clutter echo suppression, polar-to-Cartesian remapping on a 250m grid, and Kalpana-1 georeferencing.',
    formula: 'Z_e = ∫ N(D) D⁶ dD',
    specs: ['250m Spatial Resolution', 'Dual-Pol Dealiasing', 'Ground Clutter Masking', 'Atmospheric Attenuation Correction'],
    signal: 'Quality Controlled 3D Mesh',
    readout: 'Calibrated atmospheric volume',
  },
  {
    id: 'features',
    title: 'Convective Feature Extraction',
    short: 'Extract',
    category: 'Diagnostic ML',
    icon: Cpu,
    latency: '18 ms',
    throughput: '320 MB/s',
    description: 'Calculates Vertically Integrated Liquid (VIL), 50 dBZ echo-top altitudes, and cloud-top brightness temperature gradients.',
    formula: 'VIL = 3.44 × 10⁻⁶ ∫ Z⁴/⁷ dh',
    specs: ['VIL Density Index', 'Echo-Top Aloft (>55 dBZ)', 'Updraft Helicity (UH)', 'TB10.8 - TB6.8 Overshoot'],
    signal: '18 Atmospheric Predictors',
    readout: 'Convective instability verified',
  },
  {
    id: 'nowcast',
    title: 'AI Nowcast Engine (XGBoost)',
    short: 'Predict',
    category: 'Neural / Trees',
    icon: Layers3,
    latency: '35 ms',
    throughput: '600 projections/s',
    description: 'Recursive autoregressive gradient boosted model predicting storm cell trajectory, intensity, and hail probability for 0–60 minutes.',
    formula: 'Ŷ_{t+k} = f_{XGB}(X_t, Ŷ_{t+k-1})',
    specs: ['350 Boosted Trees (depth=6)', '0–60 Min Horizon', 'Dynamic Uncertainty Cone', 'Lag Feature Fusion'],
    signal: '0–60 Min Future Track',
    readout: 'Deterministic & probabilistic vectors',
  },
  {
    id: 'threat',
    title: 'Threat Matrix & Hail Classifier',
    short: 'Classify',
    category: 'Decision Logic',
    icon: ShieldAlert,
    latency: '8 ms',
    throughput: 'Instantaneous',
    description: 'Evaluates Waldvogel hail criteria, lightning jump thresholds (>250% surge), and population asset vulnerability.',
    formula: 'H_prob = σ(w_1·Z_core + w_2·VIL_d + w_3·ΔL)',
    specs: ['Waldvogel Criterion (>45 dBZ above -10°C)', 'Lightning Jump Detection', 'Urban Exposure Overlay', 'Severity Scoring'],
    signal: 'Critical Danger Scoring',
    readout: 'CODE RED hazard threshold exceeded',
  },
  {
    id: 'spatial',
    title: 'Spatial Hazard Buffering',
    short: 'Buffer',
    category: 'GIS Engine',
    icon: Crosshair,
    latency: '15 ms',
    throughput: '45 FPS',
    description: 'Generates dynamic 15-minute, 30-minute, and 45-minute GeoJSON threat polygon corridors with lateral dispersion buffers.',
    formula: 'R_{cone}(t) = R_0 + σ_v · t^{0.85}',
    specs: ['15/30/45-min Lead Polygons', 'Corridor Wind Extent', 'GeoJSON RFC-7946', 'Asset Intersection Checks'],
    signal: 'Targeted Hazard Polygons',
    readout: 'Vijayawada Urban Asset identified',
  },
  {
    id: 'dispatch',
    title: 'Multi-Channel Alert Dispatch',
    short: 'Dispatch',
    category: 'Alert Mesh',
    icon: Bell,
    latency: '22 ms',
    throughput: '12k endpoints/s',
    description: 'Broadcasts standardized Common Alerting Protocol (CAP v1.2) XML/JSON to emergency authorities, command centres, and sirens.',
    formula: 'CAP v1.2 Event = {Urgent, Severe, Direct}',
    specs: ['WebSocket Live Feed', 'WebPush Notification', 'Audio Siren Trigger', 'Civil Defense CAP Feed'],
    signal: 'Actionable Public Warnings',
    readout: 'Immediate shelter protocol active',
  },
];

const DATA_SOURCES = [
  {
    id: 'dwr',
    title: 'Doppler Weather Radar (S-Band)',
    tag: 'ACTIVE REMOTE SENSING',
    icon: Radar,
    lead: 'Machilipatnam / Vijayawada DWR network operating at 2.7 GHz with dual-polarization capability.',
    specs: [
      { label: 'Wavelength', val: '10.7 cm (S-Band)' },
      { label: 'Peak Power', val: '750 kW' },
      { label: 'Radial Gate', val: '250 meters' },
      { label: 'Max Range', val: '120 km (Doppler)' },
    ],
    liveMetrics: [
      { key: 'Core Reflectivity (Z)', val: '64.2 dBZ', highlight: '#ef4444' },
      { key: 'Diff Reflectivity (ZDR)', val: '0.12 dB', highlight: '#f97316' },
      { key: 'Diff Phase (KDP)', val: '1.85 °/km', highlight: '#38bdf8' },
      { key: 'Correlation (ρHV)', val: '0.91', highlight: '#34d399' },
    ],
    physics: 'Dual-polarization distinguishes large tumbling hail from raindrops: high Z (>55 dBZ) paired with near-zero ZDR confirms spherical hailshafts aloft.',
  },
  {
    id: 'insat',
    title: 'INSAT-3DR Geostationary Imager',
    tag: 'SATELLITE REMOTE SENSING',
    icon: Satellite,
    lead: 'Geostationary meteorological satellite positioned at 74°E providing rapid-scan 15-minute multispectral imagery.',
    specs: [
      { label: 'Orbital Slot', val: '74° East GEO' },
      { label: 'Cadence', val: '15 min Rapid Scan' },
      { label: 'Resolution', val: '4 km Thermal IR' },
      { label: 'Channels', val: '6 Spectral Bands' },
    ],
    liveMetrics: [
      { key: 'TIR-1 (10.8 µm)', val: '-68.4 °C', highlight: '#38bdf8' },
      { key: 'Water Vapor (6.8 µm)', val: '-54.2 °C', highlight: '#c084fc' },
      { key: 'Overshooting Top', val: '+2.8 km aloft', highlight: '#ef4444' },
      { key: 'Updraft Helicity', val: '28.5 m/s', highlight: '#fbbf24' },
    ],
    physics: 'Extreme cloud-top cooling below -65°C indicates explosive convective updrafts penetrating the tropopause, a key precursor to catastrophic hail.',
  },
  {
    id: 'lightning',
    title: 'LINET Lightning Detection Network',
    tag: 'GROUND SENSOR MESH',
    icon: Zap,
    lead: 'Ground-based VLF/LF Time-of-Arrival (TOA) sensor array triangulating stroke coordinates and 3D emission heights.',
    specs: [
      { label: 'Frequency Band', val: '1 kHz – 200 kHz' },
      { label: 'Location Accuracy', val: '< 150 meters' },
      { label: 'Height Resolution', val: '± 500 meters' },
      { label: 'Discrimination', val: 'IC vs CG Strokes' },
    ],
    liveMetrics: [
      { key: 'Stroke Rate', val: '48 str/min', highlight: '#fbbf24' },
      { key: 'Lightning Jump', val: '+280% SURGE', highlight: '#ef4444' },
      { key: 'IC / CG Ratio', val: '3.8 : 1', highlight: '#38bdf8' },
      { key: 'Peak Current', val: '-84.2 kA', highlight: '#f97316' },
    ],
    physics: 'A sudden surge in total lightning (the "Lightning Jump") occurs 15–25 minutes prior to severe surface hail due to vigorous ice crystal collisions in the updraft.',
  },
  {
    id: 'aws',
    title: 'Automated Weather Stations (AWS)',
    tag: 'IN-SITU MESONET',
    icon: Gauge,
    lead: 'Dense surface meteorological stations across Andhra Pradesh capturing micro-barometric drops and thermodynamic profiles.',
    specs: [
      { label: 'Network Density', val: '1 station / 15 km' },
      { label: 'Sampling Rate', val: '10 seconds' },
      { label: 'Pressure Precision', val: '0.01 hPa' },
      { label: 'Telemetry', val: 'Cellular MQTT / 4G' },
    ],
    liveMetrics: [
      { key: 'Pressure Tendency', val: '-3.4 hPa / 15m', highlight: '#ef4444' },
      { key: 'Surface CAPE', val: '2,840 J/kg', highlight: '#f97316' },
      { key: 'Wet-Bulb Zero', val: '3,450 m AGL', highlight: '#38bdf8' },
      { key: 'Dew Point Depression', val: '1.8 °C', highlight: '#34d399' },
    ],
    physics: 'Low wet-bulb zero height allows hail to reach ground level without melting, while steep surface barometric pressure drops signal severe cold pool downbursts.',
  },
];

const XGBOOST_FEATURES = [
  { name: 'Max Reflectivity Aloft (dBZ)', weight: 34, val: '64.2 dBZ', code: 'Z_max_aloft' },
  { name: 'Vertically Integrated Liquid (VIL)', weight: 26, val: '58.4 kg/m²', code: 'vil_density' },
  { name: 'Cloud-Top Brightness Temp Drop', weight: 18, val: '-68.4 °C', code: 'tir1_tb_min' },
  { name: '0–6 km Bulk Wind Shear', weight: 14, val: '24.8 m/s', code: 'shear_0_6km' },
  { name: 'Surface CAPE Instability', weight: 8, val: '2,840 J/kg', code: 'cape_surface' },
];

const HORIZON_STEPS = [
  { step: 'NOW (0m)', offset: '0.0 km', hailProb: '88%', wind: '74 km/h', cone: '1.2 km', desc: 'Observed convective cell centered at 16.506° N, 80.648° E.' },
  { step: '+15 MIN', offset: '+10.5 km SE', hailProb: '85%', wind: '78 km/h', cone: '3.4 km', desc: 'Nowcast propagation along Krishna basin airway corridor.' },
  { step: '+30 MIN', offset: '+21.0 km SE', hailProb: '82%', wind: '82 km/h', cone: '5.8 km', desc: 'Approaching Vijayawada urban boundary; severe hailshaft imminent.' },
  { step: '+45 MIN', offset: '+31.5 km SE', hailProb: '76%', wind: '76 km/h', cone: '8.4 km', desc: 'Urban asset impact phase; maximum lateral dispersion envelope.' },
  { step: '+60 MIN', offset: '+42.0 km SE', hailProb: '64%', wind: '65 km/h', cone: '11.5 km', desc: 'Cell dissipation phase into coastal Andhra delta.' },
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
            <stop offset="0%" stopColor={data.color} stopOpacity=".32" />
            <stop offset="100%" stopColor={data.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="36" y1={y} x2="608" y2={y} stroke="var(--chart-grid)" strokeDasharray="3 6" />
        ))}
        <path d={area} fill="url(#aura-area-fill)" />
        <path d={line} fill="none" stroke={data.color} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={coordinates[selected]?.x ?? 36} x2={coordinates[selected]?.x ?? 36} y1="24" y2="160" stroke={data.color} strokeOpacity=".55" strokeDasharray="3 5" />
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
            <circle cx={p.x} cy={p.y} r={selected === i ? 6.5 : 3.5} fill={selected === i ? '#ffffff' : data.color} stroke={data.color} strokeWidth={selected === i ? 3 : 0} />
          </g>
        ))}
      </svg>
      <div className="chart-axis"><span>NOW</span><span>+15 MIN</span><span>+30 MIN</span><span>+45 MIN</span><span>+60 MIN</span></div>
    </div>
  );
}

export default function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'architecture' | 'sources' | 'nowcast'
  const [activeStage, setActiveStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [metric, setMetric] = useState('Rainfall');
  const [selectedPoint, setSelectedPoint] = useState(8);
  const [activeHorizon, setActiveHorizon] = useState(2); // +30m
  const [selectedSource, setSelectedSource] = useState(0);
  const [storm, setStorm] = useState(null);

  /* Live backend snapshot for wired readouts */
  useEffect(() => {
    let alive = true;
    api.getStormDetail('STORM-001')
      .then((res) => { if (alive) setStorm(res.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  /* Flow board auto-advance */
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setActiveStage((current) => (current + 1) % PIPELINE_STAGES.length), 4500);
    return () => window.clearInterval(timer);
  }, [playing]);

  /* Live series resampled to 0–60 min */
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
      Rainfall: { unit: 'mm/hr', color: '#00f0ff', points: rainfall, icon: CloudRain },
      Wind: { unit: 'km/h', color: '#34d399', points: wind, icon: Wind },
      Lightning: { unit: 'strikes', color: '#fbbf24', points: lightning, icon: Zap },
    };
  }, [storm]);

  const hazards = storm?.hazards;
  const severity = hazards?.severity_level || 'CRITICAL';
  const track = storm?.tracking;
  const targetName = track?.target?.name || 'Vijayawada Urban Asset, Andhra Pradesh';
  const countdown = track?.target?.formatted_countdown || 'Next 25–35 minutes';

  const stage = PIPELINE_STAGES[activeStage] ?? PIPELINE_STAGES[0];
  const horizon = HORIZON_STEPS[activeHorizon];

  return (
    <div className="aura">
      {/* Title & Navigation Header */}
      <section className="title-band">
        <div className="container title-content">
          <div className="eyebrow light">MISSION ARCHITECTURE & SENSOR LAB <span className="eyebrow-line" /></div>
          <h1>System Intelligence<span className="title-period">.</span></h1>
          <p>
            Explore the multi-sensor radar physics, INSAT-3DR geostationary optics, and recursive XGBoost nowcasting algorithms powering StormSense real-time severe weather intelligence.
          </p>

          {/* Interactive Sub-Page Switcher */}
          <div className="page-tab-strip">
            <button
              type="button"
              className={`page-tab-btn ${activeTab === 'all' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Layers3 size={15} /> Full Architecture View
            </button>
            <button
              type="button"
              className={`page-tab-btn ${activeTab === 'architecture' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('architecture')}
            >
              <Cpu size={15} /> 01 / Pipeline Architecture
            </button>
            <button
              type="button"
              className={`page-tab-btn ${activeTab === 'sources' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('sources')}
            >
              <Radar size={15} /> 02 / Multi-Sensor Data Sources
            </button>
            <button
              type="button"
              className={`page-tab-btn ${activeTab === 'nowcast' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('nowcast')}
            >
              <Activity size={15} /> 03 / Nowcast Engine & XGBoost
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 1: SYSTEM ARCHITECTURE & 7-STAGE PIPELINE
          ============================================================ */}
      {(activeTab === 'all' || activeTab === 'architecture') && (
        <section id="architecture" className="flow-section section-band">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">HIGH-THROUGHPUT PIPELINE <span className="eyebrow-line" /></div>
                <h2>End-to-End Real-Time Processing Architecture</h2>
                <p>Seven distributed stages turn raw multi-sensor atmospheric telemetry into microsecond life-safety warnings.</p>
              </div>
              <div className="flow-controls">
                <span className="flow-counter">STAGE <strong>{String(activeStage + 1).padStart(2, '0')}</strong> / 07</span>
                <button
                  type="button"
                  className="btn-icon"
                  aria-label={playing ? 'Pause pipeline animation' : 'Play pipeline animation'}
                  title={playing ? 'Pause pipeline' : 'Play pipeline'}
                  onClick={() => setPlaying(!playing)}
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
              </div>
            </div>

            {/* Interactive Pipeline Nodes Grid */}
            <div className="pipeline-board">
              {PIPELINE_STAGES.map((s, idx) => (
                <div
                  key={s.id}
                  className={`pipeline-node ${activeStage === idx ? 'is-active' : ''}`}
                  onClick={() => { setActiveStage(idx); setPlaying(false); }}
                >
                  <div className="pipeline-node-top">
                    <span className="pipeline-node-step">0{idx + 1}</span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800 }}>{s.latency}</span>
                  </div>
                  <div className="pipeline-node-title">{s.short}</div>
                  <div className="pipeline-node-sub">{s.category}</div>
                  <div className="pipeline-node-spec">{s.throughput}</div>
                </div>
              ))}
            </div>

            {/* Pipeline Stage Deep Dive */}
            <div className="flow-board">
              <div className="flow-list">
                {PIPELINE_STAGES.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => { setActiveStage(index); setPlaying(false); }}
                      className={`flow-row ${activeStage === index ? 'is-active' : ''}`}
                    >
                      <span className="stage-index">
                        <span>STAGE {String(index + 1).padStart(2, '0')}</span>
                        <strong>{item.short}</strong>
                      </span>
                      <span className="stage-track"><i className="track-dot" /></span>
                      <span className="stage-content">
                        <span className="stage-content-top">
                          <span className="stage-summary"><Icon size={16} /><span>{item.title}</span></span>
                          {activeStage === index && <span className="active-caption">INSPECTING <ChevronRight size={13} /></span>}
                        </span>
                        <span className="tool-list">
                          {item.specs.map((spec) => (
                            <span className="tool-pill" key={spec}>{spec}</span>
                          ))}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Detail Telemetry & Mathematical Logic Box */}
              <div className="flow-detail">
                <div className="detail-top">
                  <span className="detail-number">STAGE 0{activeStage + 1} OF 07</span>
                  <stage.icon size={28} />
                </div>
                <div>
                  <div className="eyebrow light">{stage.category.toUpperCase()} / {stage.short.toUpperCase()}</div>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>

                  <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--cyan-glow)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Mathematical Formulation</div>
                    <code style={{ fontSize: '0.82rem', color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}>{stage.formula}</code>
                  </div>
                </div>

                <div className="detail-foot">
                  <span><small>SIGNAL INPUT</small><strong>{stage.signal}</strong></span>
                  <span><small>STAGE LATENCY</small><strong>{stage.latency} · {stage.readout}</strong></span>
                </div>

                <div className="detail-progress">
                  {PIPELINE_STAGES.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      aria-label={`Go to stage ${index + 1}`}
                      className={activeStage === index ? 'on' : ''}
                      onClick={() => { setActiveStage(index); setPlaying(false); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 2: DATA SOURCES & SENSOR LAB (DWR, INSAT, LIGHTNING)
          ============================================================ */}
      {(activeTab === 'all' || activeTab === 'sources') && (
        <section id="sources" className="section-band">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">EARTH OBSERVATION SENSORS <span className="eyebrow-line" /></div>
                <h2>Multi-Source Sensor Fusion Laboratory</h2>
                <p>Authentic radar physics, geostationary infrared channels, and lightning triangulation grids feeding the intelligence core.</p>
              </div>
              <span className="section-index">02 / SENSOR MESH</span>
            </div>

            <div className="source-grid">
              {DATA_SOURCES.map((source, idx) => {
                const Icon = source.icon;
                return (
                  <div className="source-card" key={source.id}>
                    <div className="source-card-header">
                      <div className="source-icon-wrap"><Icon size={22} /></div>
                      <span className="source-badge">{source.tag}</span>
                    </div>

                    <h3>{source.title}</h3>
                    <p>{source.lead}</p>

                    {/* Sensor Specifications Box */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
                      {source.specs.map(spec => (
                        <div key={spec.label} style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>{spec.label}</div>
                          <div style={{ fontSize: '0.74rem', color: '#f8fafc', fontWeight: 800 }}>{spec.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Live Telemetry Readings Box */}
                    <div className="source-telemetry-box">
                      {source.liveMetrics.map(m => (
                        <div key={m.key}>
                          <span>{m.key}</span>
                          <strong style={{ color: m.highlight }}>{m.val}</strong>
                        </div>
                      ))}
                    </div>

                    {/* Atmospheric Physics Rationale */}
                    <div style={{ marginTop: '12px', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.45, borderLeft: '2px solid var(--cyan-glow)', paddingLeft: '8px' }}>
                      {source.physics}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 3: NOWCAST ENGINE & XGBOOST ML PIPELINE
          ============================================================ */}
      {(activeTab === 'all' || activeTab === 'nowcast') && (
        <section id="nowcast" className="intelligence-section section-band">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">NEURAL & TREE PREDICTIVE INFERENCE <span className="eyebrow-line" /></div>
                <h2>The 0–60 Min XGBoost Nowcast Engine</h2>
                <p>Autoregressive recursive gradient boosted trees predicting storm kinematics, hail risk, and dynamic uncertainty envelopes.</p>
              </div>
              <span className="section-index">03 / AI INFERENCE</span>
            </div>

            {/* Model Architecture Header Banner */}
            <div className="engine-panel">
              <div className="engine-intro">
                <span className="engine-icon"><Layers3 size={28} /></span>
                <div>
                  <strong>STORMSENSE XGBOOST ENGINE</strong>
                  <small>AUTOREGRESSIVE LAG NOWCASTER</small>
                </div>
                <span className="engine-live"><span className="live-dot" /> {storm ? 'LIVE CELL SYNCHRONIZED' : 'INFERENCE READY'}</span>
              </div>
              <div className="engine-modules">
                <span><Radar size={14} /> Dual-Pol Echo Tracking</span>
                <span><Wind size={14} /> Lagrangian Optical Flow</span>
                <span><CloudRain size={14} /> Hail Prob Regressor</span>
                <span><Crosshair size={14} /> Bayesian Uncertainty Cone</span>
                <span><ShieldAlert size={14} /> Waldvogel Criterion Check</span>
              </div>
            </div>

            {/* Feature Importance & Model Mechanics */}
            <div style={{ marginTop: '24px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                    Trained XGBoost Convective Feature Weights
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                    Relative Gini feature importances calculated across 14,200 convective radar volume scans.
                  </p>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--cyan-glow)', background: 'rgba(0, 240, 255, 0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                  LOSS: MULTI-STEP RECURSIVE MSE
                </div>
              </div>

              <div className="feature-importance-grid">
                {XGBOOST_FEATURES.map(f => (
                  <div className="feature-item" key={f.name}>
                    <div className="feature-header">
                      <span>{f.name}</span>
                      <strong style={{ color: 'var(--cyan-glow)' }}>{f.weight}%</strong>
                    </div>
                    <div className="feature-bar-bg">
                      <div className="feature-bar-fill" style={{ width: `${f.weight * 2.5}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginTop: '6px' }}>
                      <span className="mono">{f.code}</span>
                      <span style={{ color: '#cbd5e1' }}>Live: {f.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive 60-Minute Horizon Scrubber */}
            <div style={{ marginTop: '24px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                    Interactive 0–60 Min Horizon Simulator
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                    Scrub through predictive lead steps to inspect modeled storm propagation, cone expansion, and hail probability.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {HORIZON_STEPS.map((h, i) => (
                    <button
                      key={h.step}
                      type="button"
                      onClick={() => setActiveHorizon(i)}
                      style={{
                        background: activeHorizon === i ? 'var(--cyan-glow)' : 'rgba(30, 41, 59, 0.7)',
                        color: activeHorizon === i ? '#080c16' : '#cbd5e1',
                        border: `1px solid ${activeHorizon === i ? 'var(--cyan-glow)' : 'rgba(56, 189, 248, 0.2)'}`,
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {h.step}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horizon Details Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', padding: '14px 18px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Trajectory Offset</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'JetBrains Mono' }}>{horizon.offset}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Hail Probability</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f97316', fontFamily: 'JetBrains Mono' }}>{horizon.hailProb}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Wind Gust Velocity</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', fontFamily: 'JetBrains Mono' }}>{horizon.wind}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Uncertainty Cone Radius</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--cyan-glow)', fontFamily: 'JetBrains Mono' }}>{horizon.cone}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                <strong>Forecast Narrative:</strong> {horizon.desc}
              </div>
            </div>

            {/* Short-Range Trend Visualization */}
            <div className="visualization">
              <div className="viz-heading">
                <div>
                  <span className="eyebrow">PREDICTIVE SIGNAL DYNAMICS / {storm ? 'LIVE STORM-001' : 'SYNTHETIC CELL'}</span>
                  <h3>60-Minute Convective Trajectory Trend</h3>
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
                  The forecast signal initializes once the live cell feed is active. Open the{' '}
                  <a href="#/command-centre" style={{ color: 'var(--cyan-glow)', fontWeight: 800 }}>Command Centre</a> to view live convective cells.
                </p>
              )}

              <div className="viz-foot">
                <span><span className="live-dot" /> RESAMPLED RECURSIVE HORIZON · NEXT 60 MINUTES</span>
                <span>Select any node on the timeline to inspect instantaneous value <ArrowRight size={14} /></span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 4: DECISION SUPPORT & ACTION TRACE
          ============================================================ */}
      {(activeTab === 'all' || activeTab === 'architecture') && (
        <section className="section-band" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">DECISION SUPPORT CHAIN <span className="eyebrow-line" /></div>
                <h2>From Atmospheric Signal to Public Siren</h2>
                <p>Auditable trace demonstrating how micro-barometric drops and dual-pol hail signatures trigger civil defense directives.</p>
              </div>
              <span className="section-index">04 / DECISION CHAIN</span>
            </div>

            <div className="alert-example">
              <div className="alert-main">
                <div className="eyebrow">WORKED OPERATIONAL SCENARIO</div>
                <h3><ShieldAlert size={20} /> {severity} CONVECTIVE HAILSTORM</h3>
                <p>
                  A severe convective hailshaft with core reflectivity exceeding 62 dBZ aloft has been detected propagating southeast along the Krishna river valley. 
                  XGBoost models predict high probability of destructive hailstones exceeding 3.5 cm diameter with gale force wind gusts reaching 78 km/h.
                </p>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a
                    href="#/command-centre"
                    style={{
                      background: 'rgba(239, 68, 68, 0.25)',
                      border: '1px solid #ef4444',
                      color: '#fee2e2',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <ShieldAlert size={14} /> Open Live Radar in Command Centre
                  </a>
                </div>
              </div>

              <div className="alert-facts">
                <div><span>IMPACT ASSET</span><strong>{targetName}</strong></div>
                <div><span>EXPECTED TIME</span><strong>{countdown}</strong></div>
                <div><span>MAX CORE</span><strong style={{ color: '#ef4444' }}>64.2 dBZ Aloft</strong></div>
                <div><span>STATUS</span><strong className="status-text"><span className="live-dot" /> ACTIVE THREAT DETECTED</strong></div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
