import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Clock, TrendingUp } from 'lucide-react';

export default function StormTimeline({ waypoints }) {
  const [selectedWaypoint, setSelectedWaypoint] = useState(waypoints?.[0] || null);

  const data = (waypoints || []).map((wp) => ({
    time: wp.label,
    risk: wp.risk,
    hail: wp.hail_prob,
    lightning: wp.lightning_prob,
    cloudburst: wp.cloudburst_prob
  }));

  const active = selectedWaypoint || waypoints?.[0];

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="#38bdf8" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
            0–6 HOUR CONVECTIVE NOWCAST TIMELINE
          </h3>
        </div>

        {active && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Projected at <strong style={{ color: '#38bdf8' }}>{active.label}</strong>:</span>
            <span>Risk: <strong className="mono" style={{ color: active.risk > 70 ? '#ef4444' : '#f59e0b' }}>{active.risk}%</strong></span>
            <span>Hail: <strong className="mono" style={{ color: '#38bdf8' }}>{active.hail_prob}%</strong></span>
            <span>Lightning: <strong className="mono" style={{ color: '#c084fc' }}>{active.lightning_prob}%</strong></span>
          </div>
        )}
      </div>

      {/* Scrubbable Waypoints Strip */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'thin'
      }}>
        {(waypoints || []).map((wp) => {
          const isSelected = active?.label === wp.label;
          const isSevere = wp.risk >= 75;
          const isHigh = wp.risk >= 60;
          return (
            <button
              key={wp.label}
              onClick={() => setSelectedWaypoint(wp)}
              style={{
                flex: '1 0 72px',
                background: isSelected ? 'rgba(56, 189, 248, 0.2)' : '#0d1322',
                border: `1px solid ${isSelected ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '8px',
                padding: '8px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <span className="mono" style={{ fontSize: '0.76rem', fontWeight: 700, color: isSelected ? '#38bdf8' : 'var(--text-main)' }}>
                {wp.label}
              </span>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isSevere ? '#ef4444' : isHigh ? '#f97316' : '#22c55e'
              }} />
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {wp.risk}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Recharts Trend Forecast Line Graph */}
      <div style={{ height: '140px', width: '100%', marginTop: '4px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#38bdf8', fontWeight: 700 }}
            />
            <Line type="monotone" dataKey="risk" name="Overall Risk" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="hail" name="Hail Probability" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="lightning" name="Lightning Prob" stroke="#c084fc" strokeWidth={1.8} dot={false} />
            <Line type="monotone" dataKey="cloudburst" name="Cloudburst Prob" stroke="#60a5fa" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
