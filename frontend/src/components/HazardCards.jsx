import React from 'react';
import { Zap, CloudRain, Wind, AlertCircle, ShieldAlert, Sparkles, Activity } from 'lucide-react';

export default function HazardCards({ hazards, weather, radar, onOpenWhyAlert }) {
  const overallRisk = hazards?.overall_convective_risk || 88.0;
  const severity = hazards?.severity_level || 'SEVERE';
  const color = hazards?.severity_color || '#ef4444';

  const cards = [
    {
      title: 'Severe Hail Core',
      prob: hazards?.hail_probability || 74.0,
      icon: <Sparkles size={22} color="#38bdf8" />,
      sub: `${radar?.max_reflectivity_dbz || 64.2} dBZ core aloft (>2.5–4.0 cm)`,
      accent: '#38bdf8',
      scaleLabel: 'Hailstone Diameter: 3.2 cm (Golf-ball)',
      scaleLevel: 3, // 1 to 4
      badge: hazards?.hail_probability > 70 ? 'SEVERE HAIL' : 'MODERATE'
    },
    {
      title: 'Lightning Hazard',
      prob: hazards?.lightning_probability || 91.0,
      icon: <Zap size={22} color="#c084fc" />,
      sub: 'Frequent CG strokes + lightning jump',
      accent: '#c084fc',
      scaleLabel: 'Discharge Rate: ~34 strokes/min',
      scaleLevel: 4,
      badge: 'EXTREME'
    },
    {
      title: 'Cloudburst Hazard',
      prob: hazards?.cloudburst_probability || 82.0,
      icon: <CloudRain size={22} color="#60a5fa" />,
      sub: 'Extreme downpour rate (>50 mm/hr)',
      accent: '#60a5fa',
      scaleLabel: 'Precip Rate: 65 mm/hr (Torrential)',
      scaleLevel: 3,
      badge: 'HIGH IMPACT'
    },
    {
      title: 'Downburst / Gusts',
      prob: hazards?.downburst_probability || 68.0,
      icon: <Wind size={22} color="#f59e0b" />,
      sub: `Peak squall gusts ~ ${weather?.wind_gusts_kmh || 62} km/h`,
      accent: '#f59e0b',
      scaleLabel: 'Outflow Squall: Gale Force 8',
      scaleLevel: 2,
      badge: 'STRONG GUST'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Master Convective Risk Banner */}
      <div className="glass-panel" style={{
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        borderLeft: `6px solid ${color}`,
        background: 'linear-gradient(135deg, rgba(14, 19, 32, 0.9) 0%, rgba(20, 26, 45, 0.7) 100%)',
        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 20px ${color}20`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: `${color}20`,
            border: `1.5px solid ${color}60`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 16px ${color}35`
          }}>
            <ShieldAlert size={30} color={color} className="pulsing-dot" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#f8fafc' }}>
                COMPOSITE CONVECTIVE RISK
              </h2>
              <span className={`badge-${severity.toLowerCase()}`} style={{ fontSize: '0.76rem', padding: '3px 10px', borderRadius: '5px', fontWeight: 800 }}>
                {severity} WARNING
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              Multi-Source Data Fusion (Doppler Reflectivity + INSAT Cloud-Top + Lightning Jump + Open-Meteo CAPE)
            </p>
          </div>
        </div>

        {/* Big Percentage & Circular Animated Meter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* SVG Circular Progress Ring */}
            <div style={{ position: 'relative', width: '64px', height: '64px' }}>
              <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="32" cy="32" r="26" stroke="#1e293b" strokeWidth="5" fill="none" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke={color}
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray="163.36"
                  strokeDashoffset={163.36 - (163.36 * overallRisk) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s ease-in-out', filter: `drop-shadow(0 0 6px ${color})` }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={18} color={color} />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span className="mono" style={{ fontSize: '2.6rem', fontWeight: 900, color: color, lineHeight: 1 }}>
                {overallRisk}%
              </span>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                Convective Score
              </div>
            </div>
          </div>

          <button
            onClick={onOpenWhyAlert}
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              color: '#38bdf8',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <AlertCircle size={16} />
            Why {severity} Risk?
          </button>
        </div>
      </div>

      {/* 4 Hazard Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px'
      }}>
        {cards.map((c) => (
          <div key={c.title} className="glass-panel" style={{
            padding: '18px',
            position: 'relative',
            overflow: 'hidden',
            borderTop: `3px solid ${c.accent}`,
            background: 'rgba(15, 23, 42, 0.75)'
          }}>
            
            {/* Top Row: Icon & Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: `${c.accent}20`,
                border: `1px solid ${c.accent}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {c.icon}
              </div>
              <span className="mono" style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: c.accent,
                background: `${c.accent}15`,
                padding: '3px 8px',
                borderRadius: '5px',
                border: `1px solid ${c.accent}40`
              }}>
                {c.badge}
              </span>
            </div>

            {/* Title & Probability */}
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              {c.title}
            </div>
            <div className="mono" style={{ fontSize: '2.1rem', fontWeight: 900, color: '#f8fafc', margin: '4px 0 8px 0' }}>
              {c.prob}%
            </div>

            {/* Realistic Progress Bar */}
            <div style={{ width: '100%', height: '6px', background: '#090d16', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px', border: '1px solid #1e293b' }}>
              <div style={{
                width: `${c.prob}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${c.accent}80 0%, ${c.accent} 100%)`,
                borderRadius: '3px',
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: `0 0 10px ${c.accent}`
              }} />
            </div>

            {/* Physical Hazard Scale Metric */}
            <div style={{
              background: '#090d16',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #1e293b',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem'
            }}>
              <span style={{ color: c.accent, fontWeight: 700 }}>{c.scaleLabel}</span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[1, 2, 3, 4].map((lvl) => (
                  <span
                    key={lvl}
                    style={{
                      width: '5px',
                      height: '10px',
                      borderRadius: '1px',
                      background: lvl <= c.scaleLevel ? c.accent : '#334155'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Subtext description */}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.35 }}>
              {c.sub}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
