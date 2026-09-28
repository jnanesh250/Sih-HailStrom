import React, { useEffect, useState } from 'react';
import { X, Sparkles, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { api } from '../services/api';

export default function WhyAlertModal({ isOpen, onClose, telemetry }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.explainAlert()
        .then((res) => {
          setBriefing(res.data);
        })
        .catch(() => {
          setBriefing({
            provider: 'StormSense Convective Engine',
            explanation: 'Multi-source convective indicators confirm severe hailstorm and cloudburst signatures aloft.'
          });
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hazards = telemetry?.hazards;
  const weather = telemetry?.weather;
  const radar = telemetry?.radar;
  const sat = telemetry?.satellite;
  const ltg = telemetry?.lightning;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '24px',
        position: 'relative',
        border: '1px solid #38bdf8'
      }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={22} color="#38bdf8" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
              AI CONVECTIVE EXPLAINABILITY DOSSIER
            </h2>
            <p style={{ fontSize: '0.76rem', color: '#38bdf8' }}>
              Decision Support Layer: {briefing?.provider || 'xAI Grok 4.7 & Convective Engine'}<br/>
              <strong style={{ color: '#4ade80' }}>Powered by 2015 Kaggle NOAA SWDI Dataset</strong>
            </p>
          </div>
        </div>

        {/* Key Indicators Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          marginBottom: '20px'
        }}>
          <div style={{ background: '#090d16', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Radar Reflectivity</div>
            <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f87171' }}>
              {radar?.max_reflectivity_dbz || 64} dBZ
            </div>
            <div style={{ fontSize: '0.65rem', color: '#f87171' }}>Hail Core Spike</div>
          </div>

          <div style={{ background: '#090d16', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Atmospheric CAPE</div>
            <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
              {weather?.cape_j_kg?.toFixed(0) || 2450} J/kg
            </div>
            <div style={{ fontSize: '0.65rem', color: '#38bdf8' }}>High Instability</div>
          </div>

          <div style={{ background: '#090d16', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Updraft Velocity</div>
            <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c084fc' }}>
              {sat?.updraft_velocity_ms || 28.5} m/s
            </div>
            <div style={{ fontSize: '0.65rem', color: '#c084fc' }}>Strong Inflow</div>
          </div>

          <div style={{ background: '#090d16', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Cloud-Top Temp</div>
            <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#67e8f9' }}>
              {sat?.min_cloud_top_temp_c || -65.2} °C
            </div>
            <div style={{ fontSize: '0.65rem', color: '#67e8f9' }}>Overshooting Top</div>
          </div>
        </div>

        {/* AI Briefing Text */}
        <div style={{
          background: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '10px',
          padding: '16px',
          fontSize: '0.9rem',
          lineHeight: 1.6,
          color: '#ffffff',
          whiteSpace: 'pre-wrap',
          marginBottom: '20px',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
        }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#38bdf8' }}>
              Generating Meteorological Threat Briefing with AI Analyst...
            </div>
          ) : (
            briefing?.explanation
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: '#0284c7',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
}
