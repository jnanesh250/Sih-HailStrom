import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Volume2, VolumeX, ShieldAlert, X, Radio, ArrowRight, Zap, Wind } from 'lucide-react';

export default function DangerSirenAlert({ telemetry, onAcknowledge }) {
  const [dismissed, setDismissed] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  const storm = telemetry?.storm;
  const hazards = telemetry?.hazards;
  const radar = telemetry?.radar;
  const tracking = telemetry?.tracking;

  const dbz = radar?.max_reflectivity_dbz ?? 58.4;
  const hailProb = hazards?.hail_probability ?? 78;
  const severity = hazards?.severity_level ?? 'CRITICAL';
  const targetName = tracking?.target?.name ?? 'Vijayawada Urban Asset';
  const countdown = tracking?.target?.formatted_countdown ?? '15–25 mins';
  const isImminent = tracking?.target?.imminent_threat ?? true;

  // Danger threshold condition: severe reflectivity aloft, high hail probability, or critical severity
  const isDanger = (dbz >= 52 || hailProb >= 60 || severity === 'CRITICAL' || isImminent);

  // Web Audio API synthesizer for realistic emergency siren
  const startSiren = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscRef.current = osc;
      gainRef.current = gain;

      // Realistic warbling oscillating siren tone (650Hz to 900Hz)
      let high = false;
      if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = setInterval(() => {
        if (!oscRef.current || !audioCtxRef.current) return;
        const now = audioCtxRef.current.currentTime;
        oscRef.current.frequency.exponentialRampToValueAtTime(high ? 920 : 620, now + 0.35);
        high = !high;
      }, 400);
    } catch (e) {
      console.warn('Audio siren initiation error:', e);
    }
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch (e) {}
      oscRef.current = null;
    }
  };

  useEffect(() => {
    if (soundEnabled && isDanger && !dismissed && !minimized) {
      startSiren();
    } else {
      stopSiren();
    }
    return () => stopSiren();
  }, [soundEnabled, isDanger, dismissed, minimized]);

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      stopSiren();
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  if (!isDanger || dismissed) return null;

  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'rgba(220, 38, 38, 0.95)',
          border: '2px solid #fecaca',
          boxShadow: '0 0 25px rgba(239, 68, 68, 0.8)',
          borderRadius: '9999px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.78rem',
          letterSpacing: '0.08em',
          animation: 'sirenPulse 1.2s infinite alternate',
        }}
        title="Click to expand Danger Siren Alert"
      >
        <span style={{ fontSize: '1.2rem', animation: 'spin 2s linear infinite', display: 'inline-block' }}>🚨</span>
        <span>SIREN ACTIVE: {Math.round(hailProb)}% HAIL DANGER</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '22px',
        right: '22px',
        width: '380px',
        maxWidth: 'calc(100vw - 44px)',
        zIndex: 9999,
        background: 'linear-gradient(135deg, rgba(30, 10, 15, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)',
        border: '2px solid #ef4444',
        borderRadius: '14px',
        boxShadow: '0 0 35px rgba(239, 68, 68, 0.55), 0 20px 45px rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(16px)',
        color: '#f8fafc',
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        overflow: 'hidden',
        animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes sirenPulse {
          0% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.6); }
          100% { box-shadow: 0 0 35px rgba(239, 68, 68, 0.95), 0 0 50px rgba(249, 115, 22, 0.4); }
        }
        @keyframes strobeLight {
          0%, 100% { opacity: 0.95; filter: drop-shadow(0 0 12px #ef4444); }
          50% { opacity: 0.35; filter: drop-shadow(0 0 2px #ef4444); }
        }
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Flashing Top Hazard Beacon Bar */}
      <div
        style={{
          background: 'linear-gradient(90deg, #dc2626, #ea580c, #dc2626)',
          backgroundSize: '200% 100%',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ animation: 'strobeLight 0.8s infinite', display: 'inline-block' }}>🚨</span>
          <span>DANGER ALERT · CODE RED</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: soundEnabled ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.25)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '2px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.68rem',
              fontWeight: 800,
            }}
            title={soundEnabled ? 'Mute Siren Tone' : 'Play Siren Tone'}
          >
            {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
            {soundEnabled ? 'SIREN ON' : 'AUDIO OFF'}
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0 4px',
            }}
            title="Minimize"
          >
            _
          </button>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              if (onAcknowledge) onAcknowledge();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Dismiss Alert"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Alert Body */}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          {/* Siren Strobe Beacon Icon */}
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(185, 28, 28, 0.8) 100%)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.65)',
              animation: 'sirenPulse 1s infinite alternate',
            }}
          >
            <ShieldAlert size={26} color="#ffffff" style={{ animation: 'strobeLight 0.7s infinite' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h4
              style={{
                margin: '0 0 3px',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#fee2e2',
                letterSpacing: '-0.01em',
              }}
            >
              Severe Hailstorm Approaching
            </h4>
            <div style={{ fontSize: '0.8rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Target: <strong>{targetName}</strong></span>
              <span>·</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>ETA {countdown}</span>
            </div>
          </div>
        </div>

        {/* Hazard Metrics Row */}
        <div
          style={{
            marginTop: '14px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '8px',
            padding: '10px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reflectivity</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ef4444' }}>{dbz} <span style={{ fontSize: '0.7rem' }}>dBZ</span></div>
            <div style={{ fontSize: '0.62rem', color: '#f87171' }}>Hail core aloft</div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hail Threat</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f97316' }}>{Math.round(hailProb)}%</div>
            <div style={{ fontSize: '0.62rem', color: '#fdba74' }}>Diameter &gt;3.5cm</div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Severity</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#e11d48' }}>CRITICAL</div>
            <div style={{ fontSize: '0.62rem', color: '#f43f5e' }}>Imminent impact</div>
          </div>
        </div>

        {/* Directives */}
        <div
          style={{
            marginTop: '12px',
            fontSize: '0.78rem',
            lineHeight: 1.45,
            color: '#cbd5e1',
            background: 'rgba(239, 68, 68, 0.08)',
            borderLeft: '3px solid #ef4444',
            padding: '8px 10px',
            borderRadius: '0 6px 6px 0',
          }}
        >
          <strong>Immediate Safety Directive:</strong> Seek reinforced indoor shelter. Move vehicles under cover and stay clear of skylights and glass apertures.
        </div>

        {/* Action Button Bar */}
        <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
            }}
            style={{
              flex: 1,
              background: soundEnabled ? '#dc2626' : 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '7px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {soundEnabled ? 'Siren Sounding...' : 'Sound Alarm Siren'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMinimized(true);
              if (onAcknowledge) onAcknowledge();
            }}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid #475569',
              color: '#94a3b8',
              borderRadius: '6px',
              padding: '7px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
