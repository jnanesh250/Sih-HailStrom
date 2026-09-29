import React, { useState, useEffect, useRef } from 'react';
import { Sliders, RefreshCw, PlayCircle, Play, Pause, Activity, Map, ShieldAlert, Gauge, Route } from 'lucide-react';
import { api } from '../services/api';
import WeatherMap from './WeatherMap';

const CYCLE_PRESETS = [
  { name: 'Severe Convective Supercell', intensity: 95, humidity: 92, wind: 72, speed: 54, desc: 'High CAPE, explosive hail core aloft' },
  { name: 'Rapid Intensification Phase', intensity: 84, humidity: 86, wind: 58, speed: 46, desc: 'Updraft acceleration & lightning jump' },
  { name: 'Outflow Squall Line', intensity: 70, humidity: 68, wind: 85, speed: 68, desc: 'Severe gale-force downbursts & squall' },
  { name: 'Tropical Moisture Surge', intensity: 78, humidity: 98, wind: 36, speed: 30, desc: 'Maximum precipitation loading / cloudburst' },
  { name: 'Dissipation & Downdraft', intensity: 32, humidity: 48, wind: 22, speed: 20, desc: 'Rain-cooled stabilization & decaying cell' },
];

export default function ScenarioSimulator({ storm, weather, telemetry, nowcast, onUpdateState }) {
  const [intensity, setIntensity] = useState(Math.round((storm?.intensity || 0.78) * 100));
  const [humidity, setHumidity] = useState(Math.round(weather?.humidity_percent || 80));
  const [wind, setWind] = useState(Math.round(weather?.wind_speed_kmh || 38));
  const [speed, setSpeed] = useState(Math.round(storm?.speed_kmh || 42));
  const [loading, setLoading] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);

  const autoRef = useRef(null);
  const cycleIndexRef = useRef(cycleIndex);
  cycleIndexRef.current = cycleIndex;

  // Run simulation with given or current params
  const executeSim = async (iVal, hVal, wVal, sVal) => {
    setLoading(true);
    try {
      const res = await api.simulateWhatIf({
        intensity: iVal / 100.0,
        humidity: Number(hVal),
        wind_speed: Number(wVal),
        speed_kmh: Number(sVal)
      });
      if (onUpdateState) onUpdateState(res.data);
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = () => executeSim(intensity, humidity, wind, speed);

  const handleReset = async () => {
    setAutoPlaying(false);
    if (autoRef.current) clearInterval(autoRef.current);
    setLoading(true);
    try {
      const res = await api.resetWhatIf();
      const newI = Math.round((res.data?.storm?.intensity || 0.78) * 100);
      const newH = Math.round(res.data?.weather?.humidity_percent || 80);
      const newW = Math.round(res.data?.weather?.wind_speed_kmh || 38);
      setIntensity(newI);
      setHumidity(newH);
      setWind(newW);
      setSpeed(Math.round(res.data?.storm?.speed_kmh || 42));
      if (onUpdateState) onUpdateState(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Jump to specific preset
  const applyPreset = (preset, idx) => {
    setCycleIndex(idx);
    setIntensity(preset.intensity);
    setHumidity(preset.humidity);
    setWind(preset.wind);
    setSpeed(preset.speed);
    executeSim(preset.intensity, preset.humidity, preset.wind, preset.speed);
  };

  // Auto-play cycling effect
  useEffect(() => {
    if (autoPlaying) {
      autoRef.current = setInterval(() => {
        const nextIdx = (cycleIndexRef.current + 1) % CYCLE_PRESETS.length;
        setCycleIndex(nextIdx);
        const preset = CYCLE_PRESETS[nextIdx];
        setIntensity(preset.intensity);
        setHumidity(preset.humidity);
        setWind(preset.wind);
        setSpeed(preset.speed);
        executeSim(preset.intensity, preset.humidity, preset.wind, preset.speed);
      }, 3000);
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
    }
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [autoPlaying]);

  const currentPreset = CYCLE_PRESETS[cycleIndex];

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="#38bdf8" />
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>
            ATMOSPHERIC "WHAT-IF?" EXPERIMENT ENGINE
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {autoPlaying && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.68rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.15)',
              padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(52, 211, 153, 0.3)'
            }}>
              <Activity size={12} className="pulse" />
              CYCLING: {currentPreset.name}
            </span>
          )}
          <button
            type="button"
            onClick={() => setAutoPlaying((p) => !p)}
            style={{
              background: autoPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.18)',
              border: `1px solid ${autoPlaying ? '#ef4444' : '#38bdf8'}`,
              color: autoPlaying ? '#f87171' : '#38bdf8',
              borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem',
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
            }}
          >
            {autoPlaying ? <Pause size={12} /> : <Play size={12} />}
            {autoPlaying ? 'Pause Auto-Cycle' : '▶ Auto-Play Simulation'}
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
        Constrained training sandbox: modify only physically bounded inputs. The engine recalculates hazard probabilities, arrival time, trajectory and map overlays from the same scenario state.
      </p>

      {/* Preset Quick Chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CYCLE_PRESETS.map((p, idx) => (
          <button
            key={p.name}
            type="button"
            onClick={() => applyPreset(p, idx)}
            style={{
              background: cycleIndex === idx ? '#dff4fb' : '#ffffff',
              border: `1px solid ${cycleIndex === idx ? '#0e9fce' : '#c3cdd9'}`,
              color: cycleIndex === idx ? '#075f7d' : '#29405c',
              borderRadius: 14, padding: '3px 10px', fontSize: '0.68rem', cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title={p.desc}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Sliders Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        
        {/* Storm Intensity */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Storm Convective Core:</span>
            <strong className="mono" style={{ color: '#38bdf8' }}>{intensity}%</strong>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            value={intensity}
            onChange={(e) => {
              setAutoPlaying(false);
              setIntensity(Number(e.target.value));
            }}
            style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
          />
        </div>

        {/* Translation speed */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cell Translation Speed:</span>
            <strong className="mono" style={{ color: '#a78bfa' }}>{speed} km/h</strong>
          </div>
          <input
            type="range"
            min="10"
            max="80"
            value={speed}
            onChange={(e) => {
              setAutoPlaying(false);
              setSpeed(Number(e.target.value));
            }}
            style={{ width: '100%', accentColor: '#a78bfa', cursor: 'pointer' }}
          />
        </div>

        {/* Humidity */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Relative Humidity:</span>
            <strong className="mono" style={{ color: '#60a5fa' }}>{humidity}%</strong>
          </div>
          <input
            type="range"
            min="40"
            max="98"
            value={humidity}
            onChange={(e) => {
              setAutoPlaying(false);
              setHumidity(Number(e.target.value));
            }}
            style={{ width: '100%', accentColor: '#60a5fa', cursor: 'pointer' }}
          />
        </div>

        {/* Wind Speed */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Surface Inflow Wind:</span>
            <strong className="mono" style={{ color: '#f59e0b' }}>{wind} km/h</strong>
          </div>
          <input
            type="range"
            min="15"
            max="90"
            value={wind}
            onChange={(e) => {
              setAutoPlaying(false);
              setWind(Number(e.target.value));
            }}
            style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
          />
        </div>

      </div>

      {/* Bounded input contract */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '9px 10px', borderRadius: 7, background: '#eef7fb', border: '1px solid #9bd8e9', fontSize: '0.7rem' }}>
        <span style={{ color: '#075f7d', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}><ShieldAlert size={13} /> Guardrails</span>
        <span style={{ color: '#29405c' }}>Core 20–100%</span><span style={{ color: '#29405c' }}>RH 40–98%</span><span style={{ color: '#29405c' }}>Inflow 15–90 km/h</span><span style={{ color: '#29405c' }}>Translation 10–80 km/h</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '2px' }}>
        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          style={{
            background: '#ffffff',
            border: '1px solid #aebdcc',
            color: '#29405c',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.76rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <RefreshCw size={12} />
          Reset Defaults
        </button>

        <button
          type="button"
          onClick={handleRun}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #0e9fce 0%, #0b7fa3 100%)',
            border: '1px solid #075f7d',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '6px 16px',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)'
          }}
        >
          <PlayCircle size={14} />
          RUN RECALCULATION
        </button>
      </div>

      {/* Simulation output: the map receives the recalculated state and redraws the hazard buffers and route. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.65fr) minmax(240px, 0.75fr)', gap: 14, marginTop: 4 }}>
        <div style={{ minHeight: 430, overflow: 'hidden', borderRadius: 10, border: '1px solid rgba(56, 189, 248, 0.35)', background: '#07111f' }}>
          <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#7dd3fc', fontSize: '0.75rem', fontWeight: 700 }}><Map size={14} /> SIMULATED HAZARD MAP</span>
            <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Route + hazard buffers update after recalculation</span>
          </div>
          <div style={{ height: 385 }}><WeatherMap telemetry={telemetry || { storm, weather }} nowcast={nowcast} /></div>
        </div>
        <aside style={{ padding: 14, borderRadius: 10, border: '1px solid #c3d3e1', background: '#ffffff', boxShadow: '0 2px 10px rgba(8, 17, 32, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0d1b2e', fontSize: '0.78rem', fontWeight: 800, marginBottom: 12 }}><Gauge size={15} color="#0e9fce" /> EXPERIMENT OUTPUT</div>
          {[
            ['Composite risk', telemetry?.hazards?.overall_convective_risk, '#f97316', '%'],
            ['Hail probability', telemetry?.hazards?.hail_probability, '#38bdf8', '%'],
            ['Lightning probability', telemetry?.hazards?.lightning_probability, '#facc15', '%'],
            ['Downburst probability', telemetry?.hazards?.downburst_probability, '#a78bfa', '%'],
          ].map(([label, value, color, suffix]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#29405c', marginBottom: 5 }}><span>{label}</span><strong style={{ color }}>{value != null ? `${Math.round(value)}${suffix}` : 'Run simulation'}</strong></div>
              <div style={{ height: 6, background: '#e8ecf2', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%`, height: '100%', background: color, borderRadius: 99 }} /></div>
            </div>
          ))}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #dbe2ec', color: '#51637d', fontSize: '0.72rem', lineHeight: 1.55 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#29405c', fontWeight: 700, marginBottom: 5 }}><Route size={13} /> Operational effect</div>
            Translation <b style={{ color: '#0d1b2e' }}>{telemetry?.storm?.speed_kmh ?? speed} km/h</b> · ETA <b style={{ color: '#0d1b2e' }}>{telemetry?.tracking?.arrival_minutes ?? '—'} min</b>. This is a constrained scenario experiment, not a public warning.
          </div>
        </aside>
      </div>

    </div>
  );
}
