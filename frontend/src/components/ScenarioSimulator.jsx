import React, { useState } from 'react';
import { Sliders, RefreshCw, PlayCircle } from 'lucide-react';
import { api } from '../services/api';

export default function ScenarioSimulator({ storm, weather, onUpdateState }) {
  const [intensity, setIntensity] = useState(Math.round((storm?.intensity || 0.78) * 100));
  const [humidity, setHumidity] = useState(Math.round(weather?.humidity_percent || 80));
  const [wind, setWind] = useState(Math.round(weather?.wind_speed_kmh || 38));
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await api.simulateWhatIf({
        intensity: intensity / 100.0,
        humidity: Number(humidity),
        wind_speed: Number(wind)
      });
      if (onUpdateState) onUpdateState(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await api.resetWhatIf();
      setIntensity(Math.round((res.data?.storm?.intensity || 0.78) * 100));
      setHumidity(Math.round(res.data?.weather?.humidity_percent || 80));
      setWind(Math.round(res.data?.weather?.wind_speed_kmh || 38));
      if (onUpdateState) onUpdateState(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="#38bdf8" />
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700 }}>
            INTERACTIVE "WHAT-IF?" EXPERIMENT ENGINE
          </h3>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
          HACKATHON DEMO TOOL
        </span>
      </div>

      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        Adjust atmospheric convective triggers to evaluate how the Random Forest AI model recalculates Hail, Lightning, and Downburst probabilities in real time.
      </p>

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
            onChange={(e) => setIntensity(Number(e.target.value))}
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
            onChange={(e) => setHumidity(Number(e.target.value))}
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
            onChange={(e) => setWind(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
          />
        </div>

      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '2px' }}>
        <button
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
