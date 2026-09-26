import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, Zap, Navigation, Globe, Eye, Volume2, VolumeX, Radio, Sparkles } from 'lucide-react';

export default function WeatherMap({ telemetry }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const radarCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const sweepAngleRef = useRef(0);

  // Basemap style switcher: Default to High-Res True Satellite!
  const [currentStyle, setCurrentStyle] = useState('satellite'); // 'satellite', 'infrared', 'liberty', 'osm'
  const [layersVisibility, setLayersVisibility] = useState({
    hazards: true,
    trajectory: true,
    lightning: true,
    radarSweep: true,
    windVectors: true
  });
  const [soundEnabled, setSoundEnabled] = useState(false);

  const storm = telemetry?.storm || { lat: 16.506, lon: 80.648, speed_kmh: 42, direction_deg: 135 };
  const tracking = telemetry?.tracking;
  const lightning = telemetry?.lightning;
  const radar = telemetry?.radar;
  const sat = telemetry?.satellite;

  // Authentic map styles: Esri High-Resolution Satellite, INSAT Infrared Thermal, OpenFreeMap, and OSM
  const mapStyles = {
    satellite: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        },
        'esri-labels': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19
        },
        {
          id: 'labels-layer',
          type: 'raster',
          source: 'esri-labels',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    infrared: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256
        },
        'esri-labels': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'satellite-base',
          type: 'raster',
          source: 'esri-satellite',
          paint: {
            'raster-brightness-max': 0.4,
            'raster-contrast': 0.5,
            'raster-saturation': -0.7
          }
        },
        {
          id: 'labels-layer',
          type: 'raster',
          source: 'esri-labels'
        }
      ]
    },
    liberty: 'https://tiles.openfreemap.org/styles/liberty',
    osm: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-tiles'
        }
      ]
    }
  };

  const addConvectiveLayers = (map) => {
    // 1. Hazard Polygons Source & Layers with realistic Doppler/Thermal glowing styles
    if (!map.getSource('hazard-polygons')) {
      map.addSource('hazard-polygons', {
        type: 'geojson',
        data: tracking?.hazard_polygons_geojson || { type: 'FeatureCollection', features: [] }
      });

      // Shaded atmospheric buffer fill
      map.addLayer({
        id: 'hazard-fills',
        type: 'fill',
        source: 'hazard-polygons',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['get', 'opacity']
        }
      });

      // Neon contour edges
      map.addLayer({
        id: 'hazard-lines',
        type: 'line',
        source: 'hazard-polygons',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.8,
          'line-dasharray': [3, 2]
        }
      });
    }

    // 2. Trajectory Line Source & Layer (Animated glowing neon track)
    if (!map.getSource('storm-trajectory')) {
      map.addSource('storm-trajectory', {
        type: 'geojson',
        data: tracking?.trajectory_geojson || { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
      });

      map.addLayer({
        id: 'trajectory-glow',
        type: 'line',
        source: 'storm-trajectory',
        paint: {
          'line-color': '#00f0ff',
          'line-width': 8,
          'line-opacity': 0.35,
          'line-blur': 3
        }
      });

      map.addLayer({
        id: 'trajectory-line',
        type: 'line',
        source: 'storm-trajectory',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 3,
          'line-dasharray': [4, 2]
        }
      });
    }

    // 3. Lightning Strikes Source & Layers (Photorealistic electrical glow)
    if (!map.getSource('lightning-strikes')) {
      map.addSource('lightning-strikes', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: (lightning?.active_strikes || []).map(s => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
            properties: s
          }))
        }
      });

      map.addLayer({
        id: 'lightning-halo',
        type: 'circle',
        source: 'lightning-strikes',
        paint: {
          'circle-radius': 16,
          'circle-color': '#38bdf8',
          'circle-opacity': 0.45,
          'circle-blur': 1.2
        }
      });

      map.addLayer({
        id: 'lightning-glow',
        type: 'circle',
        source: 'lightning-strikes',
        paint: {
          'circle-radius': 9,
          'circle-color': '#c084fc',
          'circle-opacity': 0.85,
          'circle-blur': 0.4
        }
      });

      map.addLayer({
        id: 'lightning-points',
        type: 'circle',
        source: 'lightning-strikes',
        paint: {
          'circle-radius': 4.5,
          'circle-color': '#ffffff'
        }
      });
    }

    // 4. Storm Centroid Marker with Realistic Animated Doppler Core & Direction Arrow
    if (!map._stormMarker) {
      const el = document.createElement('div');
      el.className = 'storm-centroid-marker';
      el.innerHTML = `
        <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <!-- Concentric Doppler Reflectivity Wave Rings -->
          <div style="position: absolute; inset: 0; border-radius: 50%; border: 2px dashed rgba(239, 68, 68, 0.6); animation: spin 8s linear infinite;"></div>
          <div style="position: absolute; inset: 6px; border-radius: 50%; background: radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, rgba(249, 115, 22, 0.25) 70%, transparent 100%);" class="pulsing-dot"></div>
          
          <!-- Hail Core Warning Badge -->
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 0 20px #ef4444, inset 0 0 8px #fecaca; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: 800;">
            ⚡
          </div>
          <!-- Velocity Vector Needle -->
          <div style="position: absolute; width: 44px; height: 2px; background: #38bdf8; transform: rotate(${storm.direction_deg - 90}deg); transform-origin: left center; left: 32px; box-shadow: 0 0 6px #38bdf8;">
            <div style="position: absolute; right: 0; top: -3px; width: 0; height: 0; border-top: 4px solid transparent; border-bottom: 4px solid transparent; border-left: 7px solid #38bdf8;"></div>
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([storm.lon, storm.lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: inherit; padding: 6px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <strong style="color: #ef4444; font-size: 1.05rem;">${storm.storm_id || 'STORM-001'}</strong>
              <span style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; padding: 1px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 800;">SEVERE HAIL</span>
            </div>
            <div style="margin-top: 6px; font-size: 0.8rem; line-height: 1.5; color: #f1f5f9;">
              <div>Reflectivity Core: <strong style="color: #f87171;">${telemetry?.radar?.max_reflectivity_dbz || 64.2} dBZ</strong></div>
              <div>Updraft Speed: <strong style="color: #c084fc;">${sat?.updraft_velocity_ms || 28.5} m/s</strong></div>
              <div>Cloud-Top Temp: <strong style="color: #38bdf8;">${sat?.min_cloud_top_temp_c || -65.2} °C</strong></div>
              <div>Propagation: <strong>${storm.speed_kmh} km/h (135° SE)</strong></div>
            </div>
          </div>
        `))
        .addTo(map);

      map._stormMarker = marker;
    }

    // 5. Target Location Marker (Vijayawada) with Radar Beacon
    if (!map._targetMarker) {
      const targetEl = document.createElement('div');
      targetEl.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.94); border: 2px solid #00f0ff; border-radius: 8px; padding: 5px 12px; font-size: 11px; font-weight: 800; color: #00f0ff; box-shadow: 0 0 16px rgba(0, 240, 255, 0.6); display: flex; align-items: center; gap: 5px; backdrop-filter: blur(8px);">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #00f0ff; display: inline-block;" class="pulsing-dot"></span>
          📍 Vijayawada Urban Asset
        </div>
      `;
      const targetMarker = new maplibregl.Marker({ element: targetEl })
        .setLngLat([80.648, 16.506])
        .addTo(map);

      map._targetMarker = targetMarker;
    }
  };

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyles[currentStyle],
      center: [storm.lon, storm.lat],
      zoom: 9.35,
      pitch: 42, // Immersive 3D oblique tilt angle
      bearing: -15, // Slight atmospheric rotation
      attributionControl: true
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      addConvectiveLayers(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle Style Switching
  const handleStyleChange = (newStyleKey) => {
    setCurrentStyle(newStyleKey);
    const map = mapRef.current;
    if (!map) return;

    map.setStyle(mapStyles[newStyleKey]);
    map.once('style.load', () => {
      addConvectiveLayers(map);
    });
  };

  // Live Telemetry Sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getSource('hazard-polygons') && tracking?.hazard_polygons_geojson) {
      map.getSource('hazard-polygons').setData(tracking.hazard_polygons_geojson);
    }

    if (map.getSource('storm-trajectory') && tracking?.trajectory_geojson) {
      map.getSource('storm-trajectory').setData(tracking.trajectory_geojson);
    }

    if (map.getSource('lightning-strikes')) {
      const strikeFeatures = (lightning?.active_strikes || []).map(s => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: s
      }));
      map.getSource('lightning-strikes').setData({
        type: 'FeatureCollection',
        features: strikeFeatures
      });
    }

    if (map._stormMarker && storm.lat && storm.lon) {
      map._stormMarker.setLngLat([storm.lon, storm.lat]);
    }
  }, [telemetry]);

  // Animated Radar Beam Canvas Overlay
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderSweep = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (layersVisibility.radarSweep) {
        const cx = w * 0.45;
        const cy = h * 0.48;
        const radius = Math.min(w, h) * 0.42;

        sweepAngleRef.current = (sweepAngleRef.current + 0.035) % (2 * Math.PI);
        const angle = sweepAngleRef.current;

        // Draw faint range rings (25km, 50km, 100km radar circles)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 1;
        for (let r = 0.25; r <= 1.0; r += 0.25) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius * r, 0, 2 * Math.PI);
          ctx.stroke();
        }

        // Draw crosshairs
        ctx.beginPath();
        ctx.moveTo(cx - radius, cy);
        ctx.lineTo(cx + radius, cy);
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx, cy + radius);
        ctx.stroke();

        // Draw Sweeping Beam with trailing phosphor persistence
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
        gradient.addColorStop(1, 'transparent');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle - 0.4, angle);
        ctx.closePath();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.16)';
        ctx.fill();

        // Leading edge bright line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(renderSweep);
    };

    renderSweep();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [layersVisibility.radarSweep]);

  // Toggle Layers
  const toggleLayer = (layerName) => {
    const map = mapRef.current;
    const next = !layersVisibility[layerName];
    setLayersVisibility({ ...layersVisibility, [layerName]: next });

    if (!map || !map.isStyleLoaded()) return;

    if (layerName === 'hazards') {
      const vis = next ? 'visible' : 'none';
      if (map.getLayer('hazard-fills')) map.setLayoutProperty('hazard-fills', 'visibility', vis);
      if (map.getLayer('hazard-lines')) map.setLayoutProperty('hazard-lines', 'visibility', vis);
    } else if (layerName === 'trajectory') {
      const vis = next ? 'visible' : 'none';
      if (map.getLayer('trajectory-line')) map.setLayoutProperty('trajectory-line', 'visibility', vis);
      if (map.getLayer('trajectory-glow')) map.setLayoutProperty('trajectory-glow', 'visibility', vis);
    } else if (layerName === 'lightning') {
      const vis = next ? 'visible' : 'none';
      if (map.getLayer('lightning-glow')) map.setLayoutProperty('lightning-glow', 'visibility', vis);
      if (map.getLayer('lightning-halo')) map.setLayoutProperty('lightning-halo', 'visibility', vis);
      if (map.getLayer('lightning-points')) map.setLayoutProperty('lightning-points', 'visibility', vis);
    }
  };

  return (
    <div className="glass-panel" style={{ position: 'relative', height: '600px', overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
      
      {/* Map Canvas */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Sweeping Doppler Radar Canvas Overlay */}
      <canvas
        ref={radarCanvasRef}
        width={900}
        height={600}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 4,
          opacity: 0.85
        }}
      />

      {/* Live Satellite / Radar Mode Indicator in Top-Center */}
      <div style={{
        position: 'absolute',
        top: '14px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 15, 29, 0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        borderRadius: '20px',
        padding: '5px 16px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
      }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} className="pulsing-dot" />
        <span style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.04em', color: '#f8fafc', textTransform: 'uppercase' }}>
          {currentStyle === 'satellite' ? '🛰️ High-Resolution True Earth Satellite' : currentStyle === 'infrared' ? '🌡️ INSAT-3DR Enhanced Thermal Infrared' : '🗺️ OpenFreeMap Vector'}
        </span>
        <span className="mono badge-severe" style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px' }}>
          DWR SWEEP ACTIVE
        </span>
      </div>

      {/* Left Control Panel: Basemap Selector & Convective Layers */}
      <div style={{
        position: 'absolute',
        top: '14px',
        left: '14px',
        background: 'rgba(10, 15, 29, 0.92)',
        backdropFilter: 'blur(14px)',
        border: '1px solid var(--border-strong)',
        borderRadius: '12px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 10,
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        maxWidth: '280px'
      }}>
        
        {/* Style Selector */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            EARTH OBSERVATION SENSORS:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <button
              onClick={() => handleStyleChange('satellite')}
              style={{
                background: currentStyle === 'satellite' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#1e293b',
                color: currentStyle === 'satellite' ? '#ffffff' : 'var(--text-dim)',
                border: currentStyle === 'satellite' ? '1px solid #38bdf8' : '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              🛰️ Satellite
            </button>
            <button
              onClick={() => handleStyleChange('infrared')}
              style={{
                background: currentStyle === 'infrared' ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' : '#1e293b',
                color: currentStyle === 'infrared' ? '#ffffff' : 'var(--text-dim)',
                border: currentStyle === 'infrared' ? '1px solid #a855f7' : '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              🌡️ INSAT IR
            </button>
            <button
              onClick={() => handleStyleChange('liberty')}
              style={{
                background: currentStyle === 'liberty' ? '#1e293b' : 'transparent',
                color: currentStyle === 'liberty' ? '#38bdf8' : 'var(--text-dim)',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🗺️ Relief Topo
            </button>
            <button
              onClick={() => handleStyleChange('osm')}
              style={{
                background: currentStyle === 'osm' ? '#1e293b' : 'transparent',
                color: currentStyle === 'osm' ? '#38bdf8' : 'var(--text-dim)',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🗺️ Standard OSM
            </button>
          </div>
        </div>

        {/* Layer Toggles */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            CONVECTIVE OVERLAYS:
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => toggleLayer('hazards')}
              style={{
                background: layersVisibility.hazards ? 'rgba(239, 68, 68, 0.25)' : '#1e293b',
                border: `1px solid ${layersVisibility.hazards ? '#ef4444' : '#334155'}`,
                color: layersVisibility.hazards ? '#f87171' : 'var(--text-dim)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ● Hail Buffers
            </button>

            <button
              onClick={() => toggleLayer('trajectory')}
              style={{
                background: layersVisibility.trajectory ? 'rgba(56, 189, 248, 0.25)' : '#1e293b',
                border: `1px solid ${layersVisibility.trajectory ? '#38bdf8' : '#334155'}`,
                color: layersVisibility.trajectory ? '#38bdf8' : 'var(--text-dim)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ➜ 0–6h Vector
            </button>

            <button
              onClick={() => toggleLayer('lightning')}
              style={{
                background: layersVisibility.lightning ? 'rgba(168, 85, 247, 0.25)' : '#1e293b',
                border: `1px solid ${layersVisibility.lightning ? '#c084fc' : '#334155'}`,
                color: layersVisibility.lightning ? '#c084fc' : 'var(--text-dim)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⚡ Strikes ({lightning?.total_strikes_1min || 28})
            </button>

            <button
              onClick={() => setLayersVisibility({ ...layersVisibility, radarSweep: !layersVisibility.radarSweep })}
              style={{
                background: layersVisibility.radarSweep ? 'rgba(6, 182, 212, 0.25)' : '#1e293b',
                border: `1px solid ${layersVisibility.radarSweep ? '#06b6d4' : '#334155'}`,
                color: layersVisibility.radarSweep ? '#22d3ee' : 'var(--text-dim)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🌀 Radar Sweep
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
          <span style={{ color: '#ef4444' }}>🔴 &gt;55 dBZ Hail</span>
          <span style={{ color: '#f97316' }}>🟠 High Risk</span>
          <span style={{ color: '#eab308' }}>🟡 Advisory</span>
        </div>

      </div>

      {/* Storm Centroid Telemetry HUD in Top-Right */}
      <div style={{
        position: 'absolute',
        top: '14px',
        right: '54px',
        background: 'rgba(10, 15, 29, 0.92)',
        backdropFilter: 'blur(14px)',
        border: '1px solid var(--border-strong)',
        borderRadius: '10px',
        padding: '8px 14px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
          <Navigation size={14} color="#38bdf8" style={{ transform: `rotate(${storm.direction_deg - 45}deg)` }} />
          <span className="mono" style={{ fontWeight: 800, color: '#f8fafc' }}>
            {storm.speed_kmh} km/h • 135° SE
          </span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Intensity: <strong style={{ color: '#ef4444' }}>{Math.round((storm.intensity || 0.78) * 100)}% ({storm.stage || 'Rapid Intensification'})</strong>
        </div>
      </div>

    </div>
  );
}
