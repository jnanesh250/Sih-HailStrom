import React, { useState } from 'react';
import { Sprout, Sun, ShieldAlert, Radio, Copy, Check, AlertTriangle, Droplets } from 'lucide-react';

export default function EcoAgriHub({ telemetry }) {
  const [copied, setCopied] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const hazards = telemetry?.hazards;
  const storm = telemetry?.storm;
  const target = telemetry?.tracking?.target;

  const hailProb = hazards?.hail_probability || 74.0;
  const risk = hazards?.overall_convective_risk || 88.0;
  const eta = target?.formatted_countdown || '00:27:14';
  const speed = storm?.speed_kmh || 42;

  const englishAlert = `🚨 URGENT HAILSTORM & CONVECTIVE WARNING | STORMSENSE AI
District: Krishna / Vijayawada Urban Zone
Hazard: Severe Hailstorm (>2.5 cm stones), High-Frequency Lightning, Squall Gusts (${speed} km/h).
Estimated Impact ETA: ${eta}
Actions Required:
1. FARMERS: Secure anti-hail protective netting over high-value horticulture/orchards.
2. SOLAR ASSETS: Trigger emergency PV panel tilt (>60° stow position) to deflect kinetic impact.
3. LIVESTOCK: Relocate open-grazing cattle into covered, reinforced pens immediately.
4. CIVILIANS: Do not take shelter under trees or temporary tin sheds. Move indoors.`;

  const teluguAlert = `🚨 అత్యవసర వడగండ్ల వాన హెచ్చరిక | స్టోర్మ్‌సెన్స్ AI
ప్రాంతం: కృష్ణా / విజయవాడ అర్బన్ జోన్
ప్రమాదం: తీవ్రమైన వడగండ్ల వాన (>2.5 సెం.మీ రాళ్లు), పిడుగుపాటు, ఈదురుగాలులు (${speed} కి.మీ/గం).
అంచనా సమయం: ${eta}
తీసుకోవలసిన జాగ్రత్తలు:
1. రైతులు: ఉద్యానవన పంటలపై యాంటీ-హెయిల్ వలలను ఏర్పాటు చేసుకోండి.
2. సోలార్ ప్యానెల్స్: వడగండ్ల నష్టాన్ని నివారించడానికి ప్యానెల్స్‌ను 60 డిగ్రీల కోణంలోకి తిప్పండి.
3. పశువులు: పశువులను వెంటనే సురక్షితమైన షెడ్లలోకి తరలించండి.
4. ప్రజలు: చెట్ల కింద లేదా రేకుల షెడ్లలో ఉండకండి. ఇళ్లలోకి వెళ్లండి.`;

  const handleCopy = () => {
    const text = selectedLanguage === 'en' ? englishAlert : teluguAlert;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '18px 22px',
        borderLeft: '5px solid #22c55e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sprout size={26} color="#4ade80" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                ECO & AGRI-DEFENSE ADVISORY HUB
              </h2>
              <span className="badge-low mono" style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px' }}>
                GREEN ENERGY & CROP SHIELD
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Actionable nowcasting directives for farmers, agro-forestry, solar farms, and rural communities.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Hail Hazard Potential:</span>
          <span className="mono badge-severe" style={{ fontSize: '1.1rem', fontWeight: 800, padding: '4px 12px', borderRadius: '8px' }}>
            {hailProb}% PROBABILITY
          </span>
        </div>
      </div>

      {/* 3 Protection Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '14px' }}>
        
        {/* Pillar 1: Crop Defense */}
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.2)' }}>
              <Sprout size={20} color="#4ade80" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 700 }}>Horticulture & Crop Defense</h3>
              <span style={{ fontSize: '0.72rem', color: '#4ade80' }}>Paddy, Mango, Cotton, & Chillies</span>
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Convective hail (&gt;2.5 cm) causes catastrophic defoliation and flower drop.
          </p>
          <ul style={{ fontSize: '0.76rem', color: '#e2e8f0', paddingLeft: '18px', lineHeight: 1.6 }}>
            <li>Deploy anti-hail protective netting across active nursery beds.</li>
            <li>Postpone foliar pesticide / fertilizer spraying (rain washout threat &gt;80%).</li>
            <li>Open field drainage sluices to mitigate localized flash pooling.</li>
          </ul>
        </div>

        {/* Pillar 2: Clean Solar Energy Safeguard */}
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.2)' }}>
              <Sun size={20} color="#fde047" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 700 }}>Solar Farm Hail Defense</h3>
              <span style={{ fontSize: '0.72rem', color: '#fde047' }}>PV Glass Shatter Mitigation</span>
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Automated tracker angle adjustment significantly reduces kinetic stone impact energy.
          </p>
          <ul style={{ fontSize: '0.76rem', color: '#e2e8f0', paddingLeft: '18px', lineHeight: 1.6 }}>
            <li>Command dual-axis trackers into maximum tilt (<strong>60° stow angle</strong>).</li>
            <li>Reduces frontal perpendicular glass impact energy by up to <strong>85%</strong>.</li>
            <li>Isolate combiner boxes to prevent lightning strike surges.</li>
          </ul>
        </div>

        {/* Pillar 3: Livestock & Rural Labor Safety */}
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.2)' }}>
              <ShieldAlert size={20} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 700 }}>Livestock & Rural Safety</h3>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>30-Min Pre-Impact Window</span>
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Hailstones combined with high Cloud-to-Ground lightning strokes pose acute danger outdoors.
          </p>
          <ul style={{ fontSize: '0.76rem', color: '#e2e8f0', paddingLeft: '18px', lineHeight: 1.6 }}>
            <li>Corral open-pasture cattle and poultry into covered masonry sheds.</li>
            <li>Issue immediate recall for agricultural laborers working open fields.</li>
            <li>Enforce 30/30 lightning safety rule—stay indoors until 30 min after last thunder.</li>
          </ul>
        </div>

      </div>

      {/* CAP Common Alerting Protocol & Multilingual Broadcast Generator */}
      <div className="glass-panel" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={20} color="#f87171" className="pulsing-dot" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                DISTRICT EMERGENCY OPERATIONS BROADCAST GENERATOR
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Common Alerting Protocol (CAP) compliant broadcast text for SMS, WhatsApp, & Siren towers
              </span>
            </div>
          </div>

          {/* Language Selector & Copy Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', background: '#090d16', padding: '2px', borderRadius: '6px', border: '1px solid #334155' }}>
              <button
                onClick={() => setSelectedLanguage('en')}
                style={{
                  background: selectedLanguage === 'en' ? '#1e293b' : 'transparent',
                  color: selectedLanguage === 'en' ? '#38bdf8' : 'var(--text-dim)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                English
              </button>
              <button
                onClick={() => setSelectedLanguage('te')}
                style={{
                  background: selectedLanguage === 'te' ? '#1e293b' : 'transparent',
                  color: selectedLanguage === 'te' ? '#38bdf8' : 'var(--text-dim)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                తెలుగు (Telugu)
              </button>
            </div>

            <button
              onClick={handleCopy}
              style={{
                background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                border: `1px solid ${copied ? '#22c55e' : '#38bdf8'}`,
                color: copied ? '#4ade80' : '#38bdf8',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied Alert!' : 'Copy Dispatch Alert'}
            </button>
          </div>
        </div>

        {/* Text Area Display */}
        <div style={{
          background: '#090d16',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '14px',
          fontSize: '0.82rem',
          lineHeight: 1.55,
          color: '#f8fafc',
          whiteSpace: 'pre-line',
          fontFamily: 'inherit'
        }}>
          {selectedLanguage === 'en' ? englishAlert : teluguAlert}
        </div>
      </div>

    </div>
  );
}
