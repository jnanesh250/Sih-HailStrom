import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import WeatherMap from './components/WeatherMap';
import HazardCards from './components/HazardCards';
import Countdown from './components/Countdown';
import StormTimeline from './components/StormTimeline';
import AIAnalyst from './components/AIAnalyst';
import ScenarioSimulator from './components/ScenarioSimulator';
import WhyAlertModal from './components/WhyAlertModal';
import ArchitectureModal from './components/ArchitectureModal';
import EcoAgriHub from './components/EcoAgriHub';
import { stormWS } from './services/websocket';
import { api } from './services/api';

export default function App() {
  const [telemetry, setTelemetry] = useState(null);
  const [activeTab, setActiveTab] = useState('gis'); // 'gis' or 'eco'
  const [dataMode, setDataMode] = useState('Simulation');
  const [activeScenario, setActiveScenario] = useState('Rapid Intensification');
  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);

  // Initialize and connect live WebSocket telemetry
  useEffect(() => {
    // 1. Initial REST fetch for instant display
    api.getStormDetail('STORM-001')
      .then((res) => {
        setTelemetry({
          storm: res.data.storm,
          hazards: res.data.hazards,
          weather: res.data.weather,
          radar: res.data.radar,
          lightning: res.data.lightning,
          tracking: res.data.tracking,
          is_running: true
        });
      })
      .catch((err) => {
        console.warn('Initial REST load error:', err);
      });

    // 2. Connect WebSocket
    stormWS.connect();
    const unsubscribe = stormWS.subscribe((liveData) => {
      setTelemetry(liveData);
      if (liveData.is_running !== undefined) {
        setIsRunning(liveData.is_running);
      }
      if (liveData.active_scenario) {
        setActiveScenario(liveData.active_scenario);
      }
    });

    return () => {
      unsubscribe();
      stormWS.disconnect();
    };
  }, []);

  const handleTogglePlay = async () => {
    const next = !isRunning;
    setIsRunning(next);
    try {
      await api.controlSim(next ? 'play' : 'pause', speed);
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeSpeed = async (newSpeed) => {
    setSpeed(newSpeed);
    try {
      await api.controlSim(isRunning ? 'play' : 'pause', newSpeed);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    try {
      const res = await api.controlSim('reset');
      if (res.data) setIsRunning(res.data.is_running);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectScenario = async (sc) => {
    setActiveScenario(sc);
    try {
      const res = await api.selectScenario(sc);
      setTelemetry(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectMode = async (m) => {
    setDataMode(m);
    try {
      await api.selectMode(m);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* 1. Header with Controls & Feeds status */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dataMode={dataMode}
        setDataMode={handleSelectMode}
        activeScenario={activeScenario}
        onSelectScenario={handleSelectScenario}
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        speed={speed}
        onChangeSpeed={handleChangeSpeed}
        onReset={handleReset}
        onOpenArchModal={() => setIsArchModalOpen(true)}
      />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: '0 16px 24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        
        {activeTab === 'gis' ? (
          <>
            {/* Row 1: GIS Map (65%) + AI Analyst (35%) */}
            <section style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1.1fr)',
              gap: '16px'
            }}>
              {/* Live GIS Map */}
              <div>
                <WeatherMap telemetry={telemetry} />
              </div>

              {/* AI Storm Analyst Chat */}
              <div>
                <AIAnalyst onOpenWhyAlert={() => setIsWhyModalOpen(true)} />
              </div>
            </section>

            {/* Row 2: Convective Risk Banner & 4 Hazard Cards */}
            <section>
              <HazardCards
                hazards={telemetry?.hazards}
                weather={telemetry?.weather}
                radar={telemetry?.radar}
                onOpenWhyAlert={() => setIsWhyModalOpen(true)}
              />
            </section>

            {/* Row 3: Storm Arrival Countdown Card */}
            <section>
              <Countdown
                tracking={telemetry?.tracking}
                storm={telemetry?.storm}
              />
            </section>

            {/* Row 4: 0–6h Interactive Nowcast Timeline */}
            <section>
              <StormTimeline waypoints={telemetry?.tracking?.waypoints} />
            </section>

            {/* Row 5: What-If Experiment Simulator */}
            <section>
              <ScenarioSimulator
                storm={telemetry?.storm}
                weather={telemetry?.weather}
                onUpdateState={(newState) => setTelemetry(newState)}
              />
            </section>
          </>
        ) : (
          /* Eco & Agri Defense Tab */
          <section>
            <EcoAgriHub telemetry={telemetry} />
          </section>
        )}

      </main>

      {/* Explainability Dossier Modal */}
      <WhyAlertModal
        isOpen={isWhyModalOpen}
        onClose={() => setIsWhyModalOpen(false)}
        telemetry={telemetry}
      />

      {/* Architecture Explorer Modal */}
      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
        telemetry={telemetry}
      />

      {/* Footer Disclaimer */}
      <footer style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.72rem',
        color: 'var(--text-dim)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div>
          <span>🌩️ <strong>StormSense AI</strong> • SIH Convective-Scale Nowcasting & Early Warning Prototype</span>
          <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>
            Validation Mode: Synthetic remote sensing (DWR/INSAT/Lightning) calibrated with Open-Meteo environmental reanalysis.
          </span>
        </div>
        <div className="mono">
          Model: Multi-Source Random Forest (Scikit-Learn) + Grok/Groq AI Decision Support
        </div>
      </footer>

    </div>
  );
}
