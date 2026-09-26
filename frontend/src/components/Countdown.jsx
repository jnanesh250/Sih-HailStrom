import React from 'react';
import { Clock, MapPin, Compass, AlertOctagon } from 'lucide-react';

export default function Countdown({ tracking, storm }) {
  const target = tracking?.target || {
    name: 'Vijayawada Urban Zone',
    distance_km: 24.8,
    formatted_countdown: '00:27:14',
    imminent_threat: true
  };

  return (
    <div className="glass-panel" style={{
      padding: '16px 20px',
      borderLeft: '5px solid #ef4444',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '14px'
    }}>
      
      {/* Left: Target details & Threat Alert */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '10px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <AlertOctagon size={26} color="#ef4444" className="pulsing-dot" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: '#f87171', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ⚠️ STORM APPROACHING TARGET
            </span>
            <span className="badge-severe mono" style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '3px' }}>
              IMMINENT IMPACT
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <MapPin size={15} color="#38bdf8" />
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
              {target.name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span>Distance: <strong className="mono" style={{ color: '#38bdf8' }}>{target.distance_km} km</strong></span>
            <span>Speed: <strong className="mono" style={{ color: '#f8fafc' }}>{storm?.speed_kmh || 42} km/h</strong></span>
            <span>Vector: <strong className="mono" style={{ color: '#f8fafc' }}>135° SE</strong></span>
          </div>
        </div>
      </div>

      {/* Right: Big Digital Countdown Clock */}
      <div style={{
        background: '#090d16',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '10px',
        padding: '10px 20px',
        textAlign: 'center',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
      }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
          ESTIMATED ARRIVAL TIME (ETA)
        </div>
        <div className="mono" style={{
          fontSize: '2.3rem',
          fontWeight: 800,
          color: '#ef4444',
          letterSpacing: '0.04em',
          lineHeight: 1.1,
          textShadow: '0 0 12px rgba(239, 68, 68, 0.6)'
        }}>
          {target.formatted_countdown || '00:27:14'}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#f87171', marginTop: '3px', fontWeight: 600 }}>
          Countdown to Urban Perimeter Impact
        </div>
      </div>

    </div>
  );
}
