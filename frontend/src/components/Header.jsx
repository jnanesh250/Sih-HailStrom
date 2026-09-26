import React from 'react';
import { CloudLightning, Play, Pause, FastForward, RotateCcw, Activity, Network, Sprout, LayoutDashboard } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  dataMode,
  setDataMode,
  activeScenario,
  onSelectScenario,
  isRunning,
  onTogglePlay,
  speed,
  onChangeSpeed,
  onReset,
  onOpenArchModal
}) {
  const scenarios = [
    'Developing Storm',
    'Rapid Intensification',
    'Severe Convective Storm',
    'Storm Dissipation'
  ];

  return (
    <header className="glass-panel" style={{ margin: '14px 16px 12px 16px', padding: '12px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        
        {/* Brand & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)'
          }}>
            <CloudLightning size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                STORMSENSE AI
              </h1>
              <span className="badge-severe mono" style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                HAILSTORM NOWCAST
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Convective-Scale Nowcasting & Early Warning System (0–6h) • SIH Prototype
            </p>
          </div>
        </div>

        {/* Center: Main View Navigation Tabs */}
        <div style={{ display: 'flex', background: '#090d16', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)', gap: '4px' }}>
          <button
            onClick={() => setActiveTab('gis')}
            style={{
              background: activeTab === 'gis' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === 'gis' ? '#38bdf8' : 'var(--text-dim)',
              border: activeTab === 'gis' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              borderRadius: '7px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <LayoutDashboard size={14} />
            GIS Command Center
          </button>

          <button
            onClick={() => setActiveTab('eco')}
            style={{
              background: activeTab === 'eco' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
              color: activeTab === 'eco' ? '#4ade80' : 'var(--text-dim)',
              border: activeTab === 'eco' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid transparent',
              borderRadius: '7px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Sprout size={14} />
            Eco & Agri Defense
          </button>

          <button
            onClick={onOpenArchModal}
            style={{
              background: 'transparent',
              color: 'var(--text-dim)',
              border: '1px solid transparent',
              borderRadius: '7px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Network size={14} />
            Architecture Explorer
          </button>
        </div>

        {/* Right: Simulation Controls & Feeds OK */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Scenario Select */}
          <select
            value={activeScenario}
            onChange={(e) => onSelectScenario(e.target.value)}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {scenarios.map((sc) => (
              <option key={sc} value={sc}>{sc}</option>
            ))}
          </select>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            style={{
              background: isRunning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
              border: `1px solid ${isRunning ? '#ef4444' : '#22c55e'}`,
              color: isRunning ? '#f87171' : '#4ade80',
              borderRadius: '6px',
              padding: '5px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.74rem',
              fontWeight: 700
            }}
          >
            {isRunning ? <Pause size={13} /> : <Play size={13} />}
            {isRunning ? "PAUSE" : "PLAY"}
          </button>

          {/* Speed Toggle */}
          <button
            onClick={() => onChangeSpeed(speed === 1.0 ? 2.0 : speed === 2.0 ? 5.0 : 1.0)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '5px 7px',
              cursor: 'pointer',
              fontSize: '0.74rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}
          >
            <FastForward size={13} />
            {speed}x
          </button>

          {/* Data Feeds OK Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', background: '#090d16', padding: '4px 8px', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} className="pulsing-dot" />
            <span className="mono" style={{ color: '#4ade80', fontWeight: 600 }}>5/5 FEEDS OK</span>
          </div>

        </div>

      </div>
    </header>
  );
}
