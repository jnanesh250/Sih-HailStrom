import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Calendar, ChevronDown, ChevronUp, CloudLightning, Play, Pause,
  Volume2, VolumeX, Crosshair, TrendingUp, Wind, Zap, Droplets,
  Navigation, ShieldAlert, Activity, Clock, Compass
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine, Area } from 'recharts';

const NOWCAST_API = 'http://localhost:8001';

/* ── Helpers & IMD Scale ─────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const intensityLabel = (wind) => {
  if (wind >= 120) return { label: 'Super Cyclone', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', bg: 'rgba(239, 68, 68, 0.15)' };
  if (wind >= 89) return { label: 'Very Severe Cyclonic Storm', color: '#f97316', glow: 'rgba(249, 115, 22, 0.5)', bg: 'rgba(249, 115, 22, 0.15)' };
  if (wind >= 63) return { label: 'Severe Cyclonic Storm', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', bg: 'rgba(245, 158, 11, 0.15)' };
  if (wind >= 48) return { label: 'Cyclonic Storm', color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.5)', bg: 'rgba(56, 189, 248, 0.15)' };
  if (wind >= 31) return { label: 'Deep Depression', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)', bg: 'rgba(168, 85, 247, 0.15)' };
  return { label: 'Depression', color: '#60a5fa', glow: 'rgba(96, 165, 250, 0.5)', bg: 'rgba(96, 165, 250, 0.15)' };
};

/* ── Hailstorm Radar Canvas Simulation ──────────────────── */
function HailstormCanvas({ storm, nowcastData, animating }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const frameRef = useRef(0);
  const particlesRef = useRef([]);

  const wind = storm?.max_wind_kt ?? 60;
  const iClass = intensityLabel(wind);

  // Init swirling hailstone particles
  useEffect(() => {
    const N = Math.min(10 + Math.round(wind / 6), 40);
    particlesRef.current = Array.from({ length: N }, (_, i) => ({
      angle: (i / N) * Math.PI * 2,
      r: 28 + Math.random() * 45,
      speed: 0.010 + Math.random() * 0.016,
      size: 2 + Math.random() * 3.5,
      alpha: 0.45 + Math.random() * 0.5,
    }));
  }, [wind]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frameRef.current += animating ? 1 : 0;
      const t = frameRef.current;

      // 1. Radar background grid
      ctx.beginPath();
      ctx.arc(cx, cy, 95, 0, Math.PI * 2);
      ctx.fillStyle = '#060a14';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.stroke();

      // Range rings (50km, 100km, 150km)
      [32, 60, 88].forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - 95, cy);
      ctx.lineTo(cx + 95, cy);
      ctx.moveTo(cx, cy - 95);
      ctx.lineTo(cx, cy + 95);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cardinal direction letters
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N', cx, 12);
      ctx.fillText('S', cx, H - 4);
      ctx.fillText('W', 8, cy + 3);
      ctx.fillText('E', W - 8, cy + 3);

      // 2. Eyewall glow rings
      const numRings = 3;
      for (let ring = 0; ring < numRings; ring++) {
        const radius = 24 + ring * 18 + Math.sin(t * 0.04 + ring) * 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = iClass.color;
        ctx.globalAlpha = 0.22 - ring * 0.05;
        ctx.lineWidth = ring === 0 ? 2.5 : 1.2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 3. Spiral convective rain bands
      const bands = 3 + Math.round(wind / 35);
      for (let b = 0; b < bands; b++) {
        const offset = (b / bands) * Math.PI * 2;
        ctx.beginPath();
        for (let s = 0; s < 180; s++) {
          const angle = (s / 28) + offset + t * 0.014;
          const radius = 14 + s * 0.50;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * (radius * 0.84);
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = iClass.color;
        ctx.globalAlpha = 0.18 + (b % 2) * 0.08;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 4. Hailstone particles in orbit
      particlesRef.current.forEach((p, idx) => {
        if (animating) p.angle += p.speed;
        const orbitR = p.r + Math.sin(t * 0.03 + idx) * 4;
        const x = cx + Math.cos(p.angle) * orbitR;
        const y = cy + Math.sin(p.angle) * (orbitR * 0.82);

        ctx.beginPath();
        const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#7dd3fc');
        grad.addColorStop(1, iClass.color);
        ctx.fillStyle = grad;
        ctx.globalAlpha = p.alpha;
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // 5. Calm Eye Centre
      ctx.beginPath();
      const eyeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
      eyeGrad.addColorStop(0, '#040711');
      eyeGrad.addColorStop(0.7, '#0d1527');
      eyeGrad.addColorStop(1, iClass.color + '44');
      ctx.fillStyle = eyeGrad;
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing Eye centroid dot
      const pulse = 1 + Math.sin(t * 0.08) * 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = iClass.color;
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [animating, iClass.color, wind]);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        width={210}
        height={210}
        style={{
          borderRadius: '50%',
          boxShadow: `0 0 24px ${iClass.glow}, 0 0 60px ${iClass.glow}`,
          background: 'radial-gradient(circle, #090e1c 65%, #050811 100%)',
          border: `1.5px solid ${iClass.color}66`,
        }}
      />
      <div style={{
        marginTop: 8,
        background: iClass.bg,
        border: `1px solid ${iClass.color}`,
        color: iClass.color,
        fontWeight: 800,
        fontSize: '0.64rem',
        padding: '3px 12px',
        borderRadius: '99px',
        whiteSpace: 'nowrap',
        letterSpacing: '0.04em',
        boxShadow: `0 0 10px ${iClass.glow}`
      }}>
        {iClass.label}
      </div>
    </div>
  );
}

/* ── Nowcast Timeline Chart (Recharts) ────────────────────── */
function NowcastTimeline({ nowcastData, storm }) {
  if (!nowcastData) return null;
  const { observed = [], forecast = [] } = nowcastData;

  const obsData = observed.slice(-10).map((o) => ({
    time: String(o.time).slice(5, 16).replace('T', ' '),
    wind: Math.round(o.wind),
    pressure: Math.round(o.pressure),
    phase: 'Observed',
  }));
  const fcData = forecast.map((f) => ({
    time: `+${f.lead_hours}h`,
    wind: Math.round(f.wind),
    pressure: Math.round(f.pressure),
    phase: 'Forecast',
  }));
  const chartData = [...obsData, ...fcData];
  const dividerIdx = obsData.length;

  return (
    <div style={{
      marginTop: 14,
      background: 'rgba(4, 7, 18, 0.7)',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      borderRadius: '10px',
      padding: '14px 16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={14} color="#38bdf8" />
          <span>RECURSIVE XGBOOST NOWCAST HORIZON (OBSERVED → +18H LEAD)</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: '0.66rem' }}>
          <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2, background: '#38bdf8', display: 'inline-block' }} /> Wind Speed (kt)
          </span>
          <span style={{ color: '#c084fc', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 2, background: '#c084fc', display: 'inline-block' }} /> Pressure (hPa)
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={175}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="windAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#172238" vertical={false} />
          <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} interval="preserveStartEnd" />
          <YAxis yAxisId="w" stroke="#38bdf8" fontSize={10} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
          <YAxis yAxisId="p" orientation="right" stroke="#c084fc" fontSize={10} tickLine={false} domain={['dataMin - 4', 'dataMax + 4']} />
          <Tooltip
            contentStyle={{
              background: '#090e1c',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: 8,
              fontSize: '0.74rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
            }}
            labelStyle={{ color: '#38bdf8', fontWeight: 800 }}
          />
          {dividerIdx > 0 && (
            <ReferenceLine
              x={chartData[dividerIdx - 1]?.time}
              yAxisId="w"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{ value: 'NOW', fill: '#f59e0b', fontSize: 9, fontWeight: 800, position: 'insideTopRight' }}
            />
          )}
          <Line
            yAxisId="w"
            type="monotone"
            dataKey="wind"
            name="Wind (kt)"
            stroke="#38bdf8"
            strokeWidth={2.5}
            dot={(props) => {
              const { cx, cy, index } = props;
              const isFc = index >= dividerIdx;
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={isFc ? 3.5 : 2.5}
                  fill={isFc ? '#38bdf8' : '#0284c7'}
                  stroke={isFc ? '#ffffff' : '#38bdf8'}
                  strokeWidth={1.2}
                />
              );
            }}
          />
          <Line
            yAxisId="p"
            type="monotone"
            dataKey="pressure"
            name="Pressure (hPa)"
            stroke="#c084fc"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Event Card with Rich Intensity Spectrum Bar ─────────── */
function EventCard({ storm, index, onSelect, isSelected, nowcastData, loadingNowcast }) {
  const iClass = intensityLabel(storm.max_wind_kt ?? 0);
  const [open, setOpen] = useState(false);

  // Normalize wind 0 to 140 kt for the spectrum bar
  const windVal = Math.round(storm.max_wind_kt ?? 0);
  const windPercent = Math.min(100, Math.max(8, (windVal / 135) * 100));

  const motionSpeed = nowcastData?.current_motion?.speed_kmh;
  const hoursLand = nowcastData?.storm?.hours_to_land;

  return (
    <div
      style={{
        background: isSelected
          ? 'linear-gradient(135deg, rgba(15, 28, 54, 0.95) 0%, rgba(9, 16, 32, 0.98) 100%)'
          : 'rgba(10, 16, 30, 0.75)',
        border: `1px solid ${isSelected ? iClass.color : 'rgba(56, 189, 248, 0.18)'}`,
        borderRadius: 12,
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: isSelected ? `0 0 24px ${iClass.glow}` : '0 4px 12px rgba(0,0,0,0.3)',
      }}
      onClick={() => { onSelect(storm.sid); setOpen(true); }}
    >
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Avatar Icon */}
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            background: `radial-gradient(circle, ${iClass.color}33, #040814)`,
            border: `1.5px solid ${iClass.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: iClass.color,
            boxShadow: `0 0 10px ${iClass.glow}`
          }}>
            #{index + 1}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                {storm.name !== 'UNNAMED' ? storm.name : `Cyclone Fix #${index + 1}`}
              </span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                background: iClass.bg,
                color: iClass.color,
                border: `1px solid ${iClass.color}66`,
                padding: '2px 8px',
                borderRadius: 4
              }}>
                {iClass.label}
              </span>
            </div>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8', marginTop: 2 }}>
              {fmtDate(storm.start)} → {fmtDate(storm.end)} · <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{storm.sid}</span>
            </div>
          </div>
        </div>

        {/* Right Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase' }}>Peak Sustained</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: iClass.color }}>
              {windVal} <span style={{ fontSize: '0.65rem' }}>KT</span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(storm.sid); setOpen(!open); }}
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#38bdf8',
              padding: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {open && isSelected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* ── Event Intensity Spectrum Bar ──────────────────── */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#64748b', marginBottom: 4 }}>
          <span>Intensity Scale (IMD)</span>
          <span style={{ color: iClass.color, fontWeight: 700 }}>{windVal} kt / ~{Math.round(windVal * 1.852)} km/h</span>
        </div>
        <div style={{
          height: 6,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Graded Spectrum Fill */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${windPercent}%`,
            background: `linear-gradient(90deg, #60a5fa 0%, #38bdf8 30%, #f59e0b 60%, #f97316 80%, #ef4444 100%)`,
            borderRadius: 4,
            boxShadow: `0 0 10px ${iClass.color}`
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.56rem', color: '#475569', marginTop: 3 }}>
          <span>Depression (25kt)</span>
          <span>Cyclonic (48kt)</span>
          <span>VSCS (89kt)</span>
          <span>Super Cyclone (120kt+)</span>
        </div>
      </div>

      {/* Expanded: hailstorm viz + timeline */}
      {open && isSelected && (
        <div style={{ marginTop: 18, borderTop: '1px solid rgba(56, 189, 248, 0.2)', paddingTop: 16 }}>
          {loadingNowcast ? (
            <div style={{ textAlign: 'center', color: '#38bdf8', fontSize: '0.78rem', padding: 24 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', marginRight: 6, animation: 'pulse 1s infinite' }} />
              Running recursive XGBoost multi-lead inference…
            </div>
          ) : nowcastData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(210px, 230px) 1fr', gap: 20, alignItems: 'start' }}>
              
              {/* Left Column: Canvas radar simulation */}
              <HailstormCanvas storm={storm} nowcastData={nowcastData} animating={true} />

              {/* Right Column: Key metrics + Briefing + Timeline */}
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* 4 HUD Metric Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                  <div style={{ background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.62rem', color: '#94a3b8' }}>
                      <Wind size={11} color="#38bdf8" /> Peak Core Wind
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>{windVal} kt</div>
                  </div>

                  <div style={{ background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(192, 132, 252, 0.3)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.62rem', color: '#94a3b8' }}>
                      <Droplets size={11} color="#c084fc" /> Central Pres
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#c084fc', marginTop: 2 }}>
                      {Math.round(nowcastData.observed?.at(-1)?.pressure ?? 1000)} hPa
                    </div>
                  </div>

                  <div style={{ background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.62rem', color: '#94a3b8' }}>
                      <Activity size={11} color="#34d399" /> Forward Speed
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#34d399', marginTop: 2 }}>
                      {nowcastData.current_motion?.speed_kmh ?? 12} km/h
                    </div>
                  </div>

                  <div style={{ background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.62rem', color: '#94a3b8' }}>
                      <Zap size={11} color="#f59e0b" /> ML Steps
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>
                      {nowcastData.forecast?.length ?? 6} × 3h
                    </div>
                  </div>
                </div>

                {/* Briefing Card */}
                {(nowcastData.briefing || nowcastData.nowcast?.briefing) && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(8, 18, 38, 0.9) 0%, rgba(4, 9, 20, 0.95) 100%)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    fontSize: '0.80rem',
                    color: '#e2e8f0',
                    lineHeight: 1.6
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        📡 METEOROLOGICAL NOWCAST BRIEFING
                      </span>
                      {nowcastData.verification?.median_km && (
                        <span style={{ fontSize: '0.64rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '2px 8px', borderRadius: 4 }}>
                          Shadow Error: ±{nowcastData.verification.median_km} km
                        </span>
                      )}
                    </div>
                    <div>
                      {nowcastData.briefing || nowcastData.nowcast?.briefing}
                    </div>
                  </div>
                )}

                {/* Timeline Chart */}
                <NowcastTimeline nowcastData={nowcastData} storm={storm} />

              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '0.78rem', padding: 16 }}>
              Nowcast telemetry unavailable for this event.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Hailstorm Event Prediction Centre ───────────────── */
export default function HailstormPredictions({ onEventNowcast }) {
  const [storms, setStorms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSid, setSelectedSid] = useState(null);
  const [nowcastData, setNowcastData] = useState(null);
  const [loadingNowcast, setLoadingNowcast] = useState(false);
  const [filterYear, setFilterYear] = useState('All');
  const [sortDir, setSortDir] = useState('desc'); // by end date
  const [narrating, setNarrating] = useState(false);

  // Fetch all storms
  useEffect(() => {
    setLoading(true);
    fetch(`${NOWCAST_API}/storms?limit=500`)
      .then((r) => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((d) => setStorms(d.storms || []))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Load nowcast for selected storm
  const loadNowcast = useCallback((sid) => {
    if (!sid) return;
    setSelectedSid(sid);
    setLoadingNowcast(true);
    setNowcastData(null);
    fetch(`${NOWCAST_API}/nowcast/${sid}?steps=6`)
      .then((r) => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((d) => {
        setNowcastData(d);
        if (onEventNowcast) onEventNowcast({ nowcast: d, ...d }, storms.find((s) => s.sid === sid));
      })
      .catch(() => setNowcastData(null))
      .finally(() => setLoadingNowcast(false));
  }, [storms, onEventNowcast]);

  // Auto-select first storm
  useEffect(() => {
    if (!selectedSid && storms.length) loadNowcast(storms[0].sid);
  }, [storms, selectedSid, loadNowcast]);

  // Derive years
  const years = ['All', ...Array.from(
    new Set(storms.map((s) => String(s.start ?? '').slice(0, 4))).values()
  ).filter(Boolean).sort((a, b) => b - a)];

  const filtered = storms
    .filter((s) => filterYear === 'All' || String(s.start ?? '').startsWith(filterYear))
    .sort((a, b) => {
      const aDate = new Date(a.end ?? 0);
      const bDate = new Date(b.end ?? 0);
      return sortDir === 'desc' ? bDate - aDate : aDate - bDate;
    });

  // Voice narration for current event briefing
  const briefingText = nowcastData?.briefing || nowcastData?.nowcast?.briefing;
  const speak = () => {
    if (!briefingText) return;
    if (narrating) {
      window.speechSynthesis.cancel();
      setNarrating(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(briefingText);
    utter.rate = 0.95;
    utter.pitch = 1.02;
    utter.onend = () => setNarrating(false);
    utter.onerror = () => setNarrating(false);
    setNarrating(true);
    window.speechSynthesis.speak(utter);
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, #090e1c 0%, #0d1527 100%)',
      borderRadius: '14px',
      border: '1px solid rgba(56, 189, 248, 0.3)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      boxShadow: '0 12px 36px rgba(0,0,0,0.5)'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(56, 189, 248, 0.45)'
          }}>
            <CloudLightning size={22} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '0.02em' }}>
              HAILSTORM & CYCLONE EVENT PREDICTION CENTRE
            </h3>
            <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>
              IBTrACS North Indian Ocean Ground-Truth · Recursive XGBoost ML Forecasts
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Voice button */}
          <button
            type="button"
            onClick={speak}
            title="Narrate briefing for selected event"
            style={{
              background: narrating ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.15)',
              border: `1px solid ${narrating ? '#ef4444' : '#38bdf8'}`,
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: narrating ? '#f87171' : '#38bdf8',
              fontSize: '0.74rem',
              fontWeight: 700,
              transition: 'all 0.15s'
            }}
          >
            {narrating ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {narrating ? 'Stop Voice' : '🔊 Narrate Briefing'}
          </button>

          {/* Year filter selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#070b16', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 8, padding: '4px 8px' }}>
            <span style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700 }}>YEAR:</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e2e8f0',
                fontSize: '0.74rem',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: 700
              }}
            >
              {years.map((y) => <option key={y} value={y} style={{ background: '#090e1c' }}>{y}</option>)}
            </select>
          </div>

          {/* Sort direction */}
          <button
            type="button"
            onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              color: '#38bdf8',
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            title={sortDir === 'desc' ? 'Showing Latest first' : 'Showing Oldest first'}
          >
            <Calendar size={13} />
            {sortDir === 'desc' ? 'Latest' : 'Oldest'}
          </button>
        </div>
      </div>

      {/* Overview Statistics Tiles */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {[
            { label: 'Recorded Events', value: filtered.length, color: '#38bdf8', sub: 'Historical tracks' },
            { label: 'Max Wind Velocity', value: `${Math.round(Math.max(...filtered.map((s) => s.max_wind_kt ?? 0)))} kt`, color: '#ef4444', sub: 'Severe core peak' },
            { label: 'Filter Horizon', value: filterYear === 'All' ? 'All Seasons' : `Season ${filterYear}`, color: '#f59e0b', sub: 'Active filter' },
            { label: 'Ground-Truth', value: 'IBTrACS NI', color: '#a855f7', sub: 'WMO validated' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{
              background: 'rgba(4, 7, 18, 0.65)',
              border: `1px solid ${color}33`,
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: '0.60rem', color: '#475569' }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Events List */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 36, color: '#38bdf8', fontSize: '0.84rem' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#38bdf8', marginRight: 8, animation: 'pulse 1s infinite' }} />
          Loading historical storm catalogue…
        </div>
      )}
      {error && (
        <div style={{ color: '#ef4444', fontSize: '0.80rem', textAlign: 'center', padding: 18 }}>
          ⚠️ {error} — ensure StormAI prediction server is running on port 8001.
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ color: '#64748b', fontSize: '0.80rem', textAlign: 'center', padding: 20 }}>
          No convective storm events found for the selected season.
        </div>
      )}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxHeight: 740,
        overflowY: 'auto',
        paddingRight: 6,
        scrollbarWidth: 'thin'
      }}>
        {filtered.map((s, i) => (
          <EventCard
            key={s.sid}
            storm={s}
            index={i}
            isSelected={s.sid === selectedSid}
            onSelect={loadNowcast}
            nowcastData={s.sid === selectedSid ? nowcastData : null}
            loadingNowcast={s.sid === selectedSid && loadingNowcast}
          />
        ))}
      </div>
    </div>
  );
}
