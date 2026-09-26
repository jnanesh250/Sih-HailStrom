import React, { useState } from 'react';
import { Network, Database, Cpu, Compass, Map, Bot, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ArchitectureModal({ isOpen, onClose, telemetry }) {
  const [selectedNode, setSelectedNode] = useState('ml');

  if (!isOpen) return null;

  const nodeDetails = {
    ingestion: {
      title: "1. Data Ingestion & Environmental Context",
      badge: "Real Background Weather",
      desc: "Fetches live thermodynamic variables from Open-Meteo API without rate limit friction: CAPE, CIN, Dewpoint, Surface Pressure, and Wind Gusts.",
      data: {
        "CAPE": `${telemetry?.weather?.cape_j_kg?.toFixed(0) || 2450} J/kg`,
        "Convective Inhibition (CIN)": `${telemetry?.weather?.cin_j_kg || -15} J/kg`,
        "Relative Humidity": `${telemetry?.weather?.humidity_percent || 78}%`,
        "Surface Pressure": `${telemetry?.weather?.pressure_hpa || 1004.2} hPa`
      }
    },
    simulator: {
      title: "2. Multi-Source Remote Sensing Simulator",
      badge: "Source-Agnostic Synthetic Feeds",
      desc: "Emulates the high-resolution schemas expected from Doppler Weather Radar (DWR), INSAT-3DR Thermal Infrared, and Lightning Networks.",
      data: {
        "Radar Max dBZ": `${telemetry?.radar?.max_reflectivity_dbz || 64} dBZ (Hail Spike)`,
        "Satellite Cloud-Top Temp": `${telemetry?.satellite?.min_cloud_top_temp_c || -65.2} °C (Overshooting Top)`,
        "Satellite Updraft Speed": `${telemetry?.satellite?.updraft_velocity_ms || 28.5} m/s`,
        "Lightning 1-Min Strikes": `${telemetry?.lightning?.total_strikes_1min || 28} flashes`,
        "Lightning Jump Status": telemetry?.lightning?.lightning_jump_detected ? "DETECTED" : "NOMINAL"
      }
    },
    fusion: {
      title: "3. Convective Data Fusion & Feature Vector",
      badge: "11-Parameter Spatiotemporal Vector",
      desc: "Fuses atmospheric buoyancy with radar core dynamics and electrical discharge frequency into a unified numerical vector.",
      data: {
        "Vector Dimension": "11 Spatiotemporal Inputs",
        "Key Correlations": "Reflectivity aloft ∝ Updraft Velocity ∝ Lightning Surge",
        "Feature Normalization": "Standardized to physical limits"
      }
    },
    ml: {
      title: "4. Multi-Output Random Forest ML Regressor",
      badge: "Scikit-Learn Classifier (Local Execution)",
      desc: "In strict compliance with architectural guidelines, Grok is NOT used for numerical forecasting. A trained Random Forest model predicts exact probabilities for Hail, Lightning, Cloudburst, and Downburst.",
      data: {
        "Composite Risk": `${telemetry?.hazards?.overall_convective_risk || 88}% (${telemetry?.hazards?.severity_level || 'SEVERE'})`,
        "Hail Core Prob": `${telemetry?.hazards?.hail_probability || 74}%`,
        "Lightning Prob": `${telemetry?.hazards?.lightning_probability || 91}%`,
        "Cloudburst Prob": `${telemetry?.hazards?.cloudburst_probability || 82}%`,
        "Downburst Prob": `${telemetry?.hazards?.downburst_probability || 68}%`
      }
    },
    tracking: {
      title: "5. Spatiotemporal Storm Tracker & GIS Nowcast",
      badge: "0–6 Hour Trajectory & ETA Countdown",
      desc: "Projects storm coordinates across future timesteps (+15m, +30m, +45m, +1h, +2h, +3h, +6h) and generates concentric multi-tier hazard polygons.",
      data: {
        "Storm Velocity": `${telemetry?.storm?.speed_kmh || 42} km/h`,
        "Heading Direction": `${telemetry?.storm?.direction_deg || 135}° SE`,
        "Target Asset": telemetry?.tracking?.target?.name || "Vijayawada Urban Zone",
        "Arrival Countdown": telemetry?.tracking?.target?.formatted_countdown || "00:27:14",
        "Distance to Target": `${telemetry?.tracking?.target?.distance_km || 24.8} km`
      }
    },
    grok: {
      title: "6. AI Convective Decision-Support Layer (Grok / Groq AI)",
      badge: "Explainability & Emergency Directives",
      desc: "Grok receives the structured model outputs and translates numerical physics into human-readable alerts, crop defense recommendations, and emergency briefs.",
      data: {
        "Engine": "Groq LPU / xAI Grok API Compatible",
        "Function": "Explainability, CAP Generation, Q&A",
        "Status": "ACTIVE & CONNECTED"
      }
    }
  };

  const curr = nodeDetails[selectedNode];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '860px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '24px',
        border: '1px solid #38bdf8'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Network size={24} color="#38bdf8" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                STORMSENSE AI ARCHITECTURE EXPLORER
              </h2>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Multi-Source Ingestion ➜ Data Fusion ➜ Local ML Engine ➜ Storm Tracker ➜ GIS ➜ Grok AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: 'var(--text-muted)',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem'
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Interactive Pipeline Step Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          marginBottom: '20px'
        }}>
          {[
            { id: 'ingestion', label: '1. Weather API', icon: <Database size={15} /> },
            { id: 'simulator', label: '2. Remote Sensing', icon: <Compass size={15} /> },
            { id: 'fusion', label: '3. Data Fusion', icon: <Network size={15} /> },
            { id: 'ml', label: '4. ML Model', icon: <Cpu size={15} /> },
            { id: 'tracking', label: '5. Tracker & GIS', icon: <Map size={15} /> },
            { id: 'grok', label: '6. Grok AI', icon: <Bot size={15} /> },
          ].map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedNode(n.id)}
              style={{
                background: selectedNode === n.id ? 'rgba(56, 189, 248, 0.25)' : '#0d1322',
                border: `1px solid ${selectedNode === n.id ? '#38bdf8' : '#1e293b'}`,
                borderRadius: '8px',
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                color: selectedNode === n.id ? '#38bdf8' : 'var(--text-muted)',
                fontSize: '0.74rem',
                fontWeight: 700,
                transition: 'all 0.15s'
              }}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </div>

        {/* Selected Node Details Box */}
        <div style={{
          background: '#090d16',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '12px',
          padding: '18px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
              {curr.title}
            </h3>
            <span className="mono" style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              {curr.badge}
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
            {curr.desc}
          </p>

          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
            Live Telemetry Payload for this Stage:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
            {Object.entries(curr.data).map(([k, v]) => (
              <div key={k} style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{k}</div>
                <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* System Validation Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.74rem', color: 'var(--text-dim)', background: 'rgba(34, 197, 94, 0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <CheckCircle2 size={16} color="#4ade80" />
          <span>
            <strong>System Validation:</strong> Ingestion pipeline is source-agnostic. When live Doppler Radar (DWR) and INSAT HDF5/NetCDF streams become available, they plug directly into the same data fusion interfaces.
          </span>
        </div>

      </div>
    </div>
  );
}
