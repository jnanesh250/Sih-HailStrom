import React, { useState, useEffect, useRef } from 'react';
import { Sliders, RefreshCw, PlayCircle, Play, Pause, FastForward, Activity } from 'lucide-react';
import { api } from '../services/api';

const CYCLE_PRESETS = [
  { name: 'Severe Convective Supercell', intensity: 95, humidity: 92, wind: 72, desc: 'High CAPE, explosive hail core aloft' },
  { name: 'Rapid Intensification Phase', intensity: 84, humidity: 86, wind: 58, desc: 'Updraft acceleration & lightning jump' },
  { name: 'Outflow Squall Line', intensity: 70, humidity: 68, wind: 85, desc: 'Severe gale-force downbursts & squall' },
  { name: 'Tropical Moisture Surge', intensity: 78, humidity: 98, wind: 36, desc: 'Maximum precipitation loading / cloudburst' },
  { name: 'Dissipation & Downdraft', intensity: 32, humidity: 48, wind: 22, desc: 'Rain-cooled stabilization & decaying cell' },
];

export default function ScenarioSimulator({ storm, weather, onUpdateState }) {
  const [intensity, setIntensity] = useState(Math.round((storm?.intensity || 0.78) * 100));
  const [humidity, setHumidity] = useState(Math.round(weather?.humidity_percent || 80));
  const [wind, setWind] = useState(Math.round(weather?.wind_speed_kmh || 38));
  const [loading, setLoading] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);

  const autoRef = useRef(null);
  const cycleIndexRef = useRef(cycleIndex);
  cycleIndexRef.current = cycleIndex;

  // Run simulation with given or current params
  const executeSim = async (iVal, hVal, wVal) => {
    setLoading(true);
    try {
      const res = await api.simulateWhatIf({
        intensity: iVal / 100.0,
        humidity: Number(hVal),
        wind_speed: Number(wVal)
      });
      if (onUpdateState) onUpdateState(res.data);
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = () => executeSim(intensity, humidity, wind);

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
    executeSim(preset.intensity, preset.humidity, preset.wind);
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
        executeSim(preset.intensity, preset.humidity, preset.wind);
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
        Adjust atmospheric convective triggers to evaluate how the Random Forest AI model recalculates Hail, Lightning, and Downburst probabilities in real time.
      </p>

      {/* Preset Quick Chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CYCLE_PRESETS.map((p, idx) => (
          <button
            key={p.name}
            type="button"
            onClick={() => applyPreset(p, idx)}
            style={{
              background: cycleIndex === idx ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.6)',
              border: `1px solid ${cycleIndex === idx ? '#38bdf8' : '#334155'}`,
              color: cycleIndex === idx ? '#38bdf8' : 'var(--text-muted)',
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

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '2px' }}>
        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            color: 'var(--text-muted)',
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
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            border: '1px solid #38bdf8',
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

    </div>
  );
}
