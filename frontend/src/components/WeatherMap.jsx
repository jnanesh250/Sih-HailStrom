import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  CircleDashed, Crosshair, Globe, Map as MapIcon, Maximize2, Navigation, Pause, Play,
  Radar, RotateCcw, Route, Satellite, Target, Thermometer, Zap,
} from 'lucide-react';
import './weather-map.css';

/* Simulated storm clock shown under the map (UTC). */
const fmtClock = (ms) => (
  ms == null || !Number.isFinite(ms)
    ? '—'
    : new Date(ms).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
    })
);
const fmtElapsed = (ms) => {
  if (!Number.isFinite(ms)) return '—';
  const total = Math.max(0, Math.round(ms / 60000));
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
};
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const compass = (deg) => COMPASS[Math.round(((((deg ?? 0) % 360) + 360) % 360) / 45) % 8];

export default function WeatherMap({ telemetry, nowcast, overlays }) {
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
    windVectors: true,
    cone: true
  });

  // ----- ML Nowcast: the map IS the product. The storm travels its real
  // track, then the trained model takes over and carries it forward. -----
  const nc = nowcast?.nowcast || null;
  const [mapReady, setMapReady] = useState(false);
  const [styleEpoch, setStyleEpoch] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.018); // Slower, realistic tracking
  const [prog, setProg] = useState(0);           // playhead along the full path
  const [showAccuracy, setShowAccuracy] = useState(false);
  const [caption, setCaption] = useState('');
  const [speed, setSpeed] = useState(3); // simulated storm-hours replayed per real second
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceSubtitle, setVoiceSubtitle] = useState('');
  const lastSpokenMilestoneRef = useRef(-1);
  const timerRef = useRef(null);
  const stormMarkerRef = useRef(null);
  const camTickRef = useRef(0);

  // Synthesize voice announcements during map simulation
  const speakAnnouncement = useCallback((text) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.default));
      if (preferred) utterance.voice = preferred;
      setVoiceSubtitle(text);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Voice announcement error:', e);
    }
  }, [voiceEnabled]);
  
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const clampProg = useCallback((v) => Math.max(0, Math.min(v, Math.max((nc?.observed?.length || 0) + (nc?.forecast?.length || 0) - 1, 0))), [nc]);

  const obsCount = nc?.observed?.length || 0;
  const path = useMemo(() => (
    nc ? [
      ...nc.observed.map((p) => [p.lon, p.lat]),
      ...nc.forecast.map((p) => [p.lon, p.lat]),
    ] : []
  ), [nc]);
  // Timestamp for every path point (observed fix or forecast hour) so the
  // replay clock under the map can show real hours/minutes of storm time.
  const pathTimes = useMemo(() => (
    nc ? [
      ...nc.observed.map((p) => Date.parse(p.time) || NaN),
      ...nc.forecast.map((p) => Date.parse(p.time) || NaN),
    ] : []
  ), [nc]);
  const clockTime = useMemo(() => {
    if (!pathTimes.length) return null;
    const i = Math.min(Math.floor(clampProg(prog)), pathTimes.length - 1);
    const j = Math.min(i + 1, pathTimes.length - 1);
    const frac = clampProg(prog) - Math.floor(clampProg(prog));
    const a = pathTimes[i];
    const b = pathTimes[j];
    if (!Number.isFinite(a)) return null;
    if (!Number.isFinite(b)) return a;
    return a + (b - a) * frac;
  }, [pathTimes, prog]);

  const coneData = nc?.geojson?.cone || { type: 'FeatureCollection', features: [] };
  const travelledLine = nc?.geojson?.travelled || null;

  const markerPos = useMemo(() => (
    path.length >= 2
      ? lerp(path[Math.min(Math.floor(clampProg(prog)), path.length - 2)],
        path[Math.min(Math.floor(clampProg(prog)) + 1, path.length - 1)],
        clampProg(prog) - Math.floor(clampProg(prog)))
      : null
  ), [path, prog]);
  const trailCoords = useMemo(() => (
    path.length >= 2 && markerPos
      ? [...path.slice(0, Math.min(Math.floor(clampProg(prog)) + 1, path.length - 1)), markerPos]
      : []
  ), [path, prog, markerPos]);
  const segInfo = useMemo(() => {
    if (!nc || !path.length) return null;
    const idx = Math.min(Math.floor(clampProg(prog)), path.length - 1);
    if (idx < obsCount) {
      const p = nc.observed[idx];
      return { phase: 'observed', label: `Observed track · ${String(p.time).slice(11, 16)} UTC`, windWord: '' };
    }
    const f = nc.forecast[idx - obsCount];
    if (!f) return { phase: 'predicted', label: 'Predicted by the trained model', windWord: '' };
    const dw = f.wind - nc.observed[obsCount - 1].wind;
    const wtxt = dw >= 5 ? 'strengthening' : dw <= -5 ? 'weakening' : 'steady winds';
    return { phase: 'predicted', label: `Model forecast · +${f.lead_hours} hours`, windWord: wtxt };
  }, [nc, path, prog, obsCount]);

  const hudBtnStyle = {
    background: 'rgba(52, 211, 153, 0.18)',
    border: '1px solid #34d399',
    color: '#6ee7b7',
    borderRadius: '6px',
    padding: '2px 7px',
    fontSize: '0.72rem',
    fontWeight: 800,
    cursor: 'pointer'
  };

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
      setMapReady(true);
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
      setStyleEpoch((e) => e + 1); // re-add + resync the nowcast layers too
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

  // Motion animation: the storm travels the whole path smoothly, then loops.
  useEffect(() => {
    if (!playing || path.length < 2) return undefined;
    timerRef.current = setInterval(() => {
      setProg((p) => {
        const next = p + playbackSpeed; // dynamic speed
        return next >= path.length - 1 ? 0 : next; // loop the journey
      });
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [playing, path, playbackSpeed]);

  // A new storm restarts the journey from the beginning, automatically.
  useEffect(() => {
    setProg(0);
    setPlaying(true);
    setShowAccuracy(false);
  }, [nc?.storm?.sid, nc]);

  // Caption follows the playhead.
  useEffect(() => {
    setCaption(segInfo ? `${segInfo.label}${segInfo.windWord ? ` · ${segInfo.windWord}` : ''}` : '');
  }, [segInfo]);

  // Live Voice Copilot: Speaks situational advisories as the storm travels
  useEffect(() => {
    if (!playing || path.length < 2) return;
    const total = path.length - 1;
    const ratio = prog / Math.max(total, 1);
    const targetAsset = tracking?.target?.name || 'Vijayawada Urban Asset';

    if (ratio < 0.08 && lastSpokenMilestoneRef.current !== 0) {
      lastSpokenMilestoneRef.current = 0;
      speakAnnouncement(`Simulation running. Severe convective hailstorm propagating along airway track towards ${targetAsset}. Wind velocity at 42 kilometers per hour.`);
    } else if (ratio >= 0.28 && ratio < 0.45 && lastSpokenMilestoneRef.current < 1) {
      lastSpokenMilestoneRef.current = 1;
      speakAnnouncement(`Advisory: Doppler reflectivity aloft elevated at 58 dBZ. Inward cyclonic airway convergence intensifying.`);
    } else if (ratio >= 0.52 && ratio < 0.70 && lastSpokenMilestoneRef.current < 2) {
      lastSpokenMilestoneRef.current = 2;
      speakAnnouncement(`Nowcast forecast active. Storm trajectory maintained directly towards ${targetAsset}. Estimated arrival in approximately 25 minutes.`);
    } else if (ratio >= 0.75 && ratio < 0.92 && lastSpokenMilestoneRef.current < 3) {
      lastSpokenMilestoneRef.current = 3;
      speakAnnouncement(`Emergency Danger Warning! Hailstorm is now within 10 kilometers of ${targetAsset}. High hail probability detected. Seek reinforced shelter immediately.`);
    } else if (ratio >= 0.95 && lastSpokenMilestoneRef.current < 4) {
      lastSpokenMilestoneRef.current = 4;
      speakAnnouncement(`Impact window reached over ${targetAsset}. Intense hail and severe gale force gusts in progress.`);
    }
  }, [playing, prog, path, tracking, speakAnnouncement]);

  useEffect(() => {
    if (prog === 0) {
      lastSpokenMilestoneRef.current = -1;
    }
  }, [prog]);

  // (Re-)add nowcast sources/layers after map load and after style switches.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !nc) return undefined;

    const emptyLine = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } };
    const emptyFC = { type: 'FeatureCollection', features: [] };

    if (!map.getSource('nc-trail')) {
      map.addSource('nc-trail', { type: 'geojson', data: emptyLine });
      map.addLayer({
        id: 'nc-trail-glow',
        type: 'line',
        source: 'nc-trail',
        paint: { 'line-color': '#fbbf24', 'line-width': 12, 'line-blur': 6, 'line-opacity': 0.3 }
      });
      map.addLayer({
        id: 'nc-trail-line',
        type: 'line',
        source: 'nc-trail',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#fbbf24', 'line-width': 3.5, 'line-opacity': 0.95 }
      });
    }
    map.getSource('nc-trail').setData(trailCoords.length >= 2
      ? {
        type: 'Feature',
        properties: { head: true },
        geometry: { type: 'LineString', coordinates: trailCoords }
      }
      : emptyLine);

    if (!map.getSource('nc-cone')) {
      map.addSource('nc-cone', { type: 'geojson', data: coneData });
      map.addLayer({
        id: 'nc-cone-fill',
        type: 'fill',
        source: 'nc-cone',
        paint: { 'fill-color': '#34d399', 'fill-opacity': 0.08 }
      });
      map.addLayer({
        id: 'nc-cone-edge',
        type: 'line',
        source: 'nc-cone',
        paint: { 'line-color': '#34d399', 'line-width': 1.2, 'line-opacity': 0.5, 'line-dasharray': [2, 3] }
      });
    } else {
      map.getSource('nc-cone').setData(coneData);
    }

    // Add forecast track + ETA markers
    const forecastPts = nc?.forecast?.length ? [nc.observed[nc.observed.length - 1], ...nc.forecast] : [];
    const forecastPathFC = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: forecastPts.map(p => [p.lon, p.lat]) }
        },
        ...(nc?.forecast?.map(p => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: { label: `+${p.lead_hours}h` }
        })) || [])
      ]
    };

    if (!map.getSource('nc-forecast')) {
      map.addSource('nc-forecast', { type: 'geojson', data: forecastPathFC });
      map.addLayer({
        id: 'nc-forecast-line',
        type: 'line',
        source: 'nc-forecast',
        filter: ['==', '$type', 'LineString'],
        paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [3, 3], 'line-opacity': 0.7 }
      });
      map.addLayer({
        id: 'nc-forecast-labels',
        type: 'symbol',
        source: 'nc-forecast',
        filter: ['==', '$type', 'Point'],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-offset': [1, -1],
          'text-anchor': 'bottom-left'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#ef4444',
          'text-halo-width': 2,
        }
      });
      map.addLayer({
        id: 'nc-forecast-dots',
        type: 'circle',
        source: 'nc-forecast',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ef4444'
        }
      });
    } else {
      map.getSource('nc-forecast').setData(forecastPathFC);
    }

    if (!map.getSource('nc-verify')) {
      map.addSource('nc-verify', { type: 'geojson', data: emptyFC });
      map.addLayer({
        id: 'nc-verify-line',
        type: 'line',
        source: 'nc-verify',
        filter: ['==', ['get', 'kind'], 'actual'],
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': '#38bdf8', 'line-width': 2.5, 'line-opacity': 0.9 }
      });
      map.addLayer({
        id: 'nc-verify-pred',
        type: 'circle',
        source: 'nc-verify',
        filter: ['==', ['get', 'kind'], 'pred'],
        paint: { 'circle-radius': 5.5, 'circle-color': '#34d399', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 }
      });
      map.addLayer({
        id: 'nc-verify-actual',
        type: 'circle',
        source: 'nc-verify',
        filter: ['==', ['get', 'kind'], 'actual'],
        paint: { 'circle-radius': 5.5, 'circle-color': '#38bdf8', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 }
      });
      map.addLayer({
        id: 'nc-verify-links',
        type: 'line',
        source: 'nc-verify',
        filter: ['==', ['get', 'kind'], 'link'],
        paint: { 'line-color': '#94a3b8', 'line-width': 1.2, 'line-dasharray': [2, 2], 'line-opacity': 0.8 }
      });
    }

    return undefined;
  }, [nc, mapReady, styleEpoch, trailCoords]);

  // Push accuracy (model-said vs what-happened) geometry when toggled.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource('nc-verify')) return;
    const pts = (showAccuracy && nc?.geojson?.verify_points?.features) || [];
    const links = (showAccuracy && nc?.verification?.points || []).map((p) => ({
      type: 'Feature',
      properties: { kind: 'link' },
      geometry: { type: 'LineString', coordinates: [[p.pred[1], p.pred[0]], [p.actual[1], p.actual[0]]] }
    }));
    map.getSource('nc-verify').setData({ type: 'FeatureCollection', features: [...pts, ...links] });
    const vis = showAccuracy ? 'visible' : 'none';
    ['nc-verify-line', 'nc-verify-pred', 'nc-verify-actual', 'nc-verify-links'].forEach((l) => {
      if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', vis);
    });
  }, [showAccuracy, nc, mapReady, styleEpoch]);

  // Keep the cone/accuracy toggles in sync with the map (incl. style switch).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const setVis = (layer, visible) => {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none');
    };
    setVis('nc-cone-fill', layersVisibility.cone);
    setVis('nc-cone-edge', layersVisibility.cone);
    setVis('nc-forecast-line', layersVisibility.cone);
    setVis('nc-forecast-labels', layersVisibility.cone);
    setVis('nc-forecast-dots', layersVisibility.cone);
  }, [layersVisibility, mapReady, styleEpoch, nc]);

  // The storm itself: a glowing marker riding the playhead.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (!markerPos) {
      if (stormMarkerRef.current) {
        stormMarkerRef.current.remove();
        stormMarkerRef.current = null;
      }
      return;
    }
    const phase = segInfo?.phase || 'observed';
    const color = phase === 'predicted' ? '#34d399' : '#ef4444';
    
    // Hide static storm marker if nowcast moving marker is active
    if (map._stormMarker) {
      map._stormMarker.remove();
      map._stormMarker = null;
    }

    const html = `
      <div class="cyclone-marker-wrap" style="position: relative; width: 140px; height: 140px; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto;">
        
        <!-- Multi-Color Convective Spiral Arms & Moments of Airways Streamlines (Red, Orange, Blue) -->
        <svg viewBox="0 0 160 160" style="position: absolute; inset: 0; width: 100%; height: 100%; animation: cycloneVortexSpin 10s linear infinite; pointer-events: none; filter: drop-shadow(0 0 14px rgba(239, 68, 68, 0.5));">
          <defs>
            <linearGradient id="arm-core-red" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ef4444" stop-opacity="0.95" />
              <stop offset="60%" stop-color="#dc2626" stop-opacity="0.9" />
              <stop offset="100%" stop-color="#ea580c" stop-opacity="0.85" />
            </linearGradient>
            <linearGradient id="arm-mid-orange" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#ea580c" stop-opacity="0.9" />
              <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.85" />
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.8" />
            </linearGradient>
            <linearGradient id="arm-outer-blue" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#2563eb" stop-opacity="0.85" />
              <stop offset="50%" stop-color="#0284c7" stop-opacity="0.8" />
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.75" />
            </linearGradient>
          </defs>

          <!-- Outer Deep Blue & Cyan Feeder Rainband (25-40 dBZ) -->
          <path d="M 80 14 C 122 16, 148 48, 142 88 C 136 122, 108 144, 80 134 C 54 124, 44 104, 52 82 C 58 64, 72 58, 80 64" fill="none" stroke="url(#arm-outer-blue)" stroke-width="5.5" stroke-linecap="round" />
          
          <!-- Mid Orange / Amber Severe Updraft Band (45-55 dBZ) -->
          <path d="M 146 80 C 142 120, 110 148, 70 142 C 36 136, 16 108, 26 80 C 36 56, 56 46, 78 52 C 96 58, 102 72, 96 80" fill="none" stroke="url(#arm-mid-orange)" stroke-width="6" stroke-linecap="round" />

          <!-- Inner Crimson Red Hail Core Wall (>55 dBZ) -->
          <path d="M 80 146 C 40 142, 12 110, 18 70 C 24 36, 52 16, 80 26 C 104 36, 114 56, 108 78 C 102 96, 88 102, 80 96" fill="none" stroke="url(#arm-core-red)" stroke-width="6.5" stroke-linecap="round" />

          <!-- Dynamic Airways Streamlines (Cyan & Amber Inflow Inward Spirals) -->
          <path d="M 80 6 C 136 10, 156 58, 148 104 C 140 144, 96 156, 62 144 C 34 130, 26 94, 46 68 C 60 48, 76 56, 80 66" fill="none" stroke="#00f0ff" stroke-width="2.2" stroke-dasharray="6, 6" opacity="0.9" style="animation: airwayStreamFlow 1.4s linear infinite;" />
          <path d="M 154 80 C 148 136, 102 156, 56 148 C 16 140, 4 96, 16 62 C 30 34, 66 26, 92 46 C 112 60, 104 76, 94 80" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-dasharray="6, 6" opacity="0.9" style="animation: airwayStreamFlow 1.4s linear infinite;" />

          <!-- Airway Inflow Arrows (Tangential Vector Barbs) -->
          <g transform="translate(80, 12) rotate(100)">
            <polygon points="0,0 -4,7 4,7" fill="#00f0ff" />
          </g>
          <g transform="translate(148, 80) rotate(190)">
            <polygon points="0,0 -4,7 4,7" fill="#fbbf24" />
          </g>
          <g transform="translate(80, 148) rotate(280)">
            <polygon points="0,0 -4,7 4,7" fill="#ef4444" />
          </g>
          <g transform="translate(12, 80) rotate(10)">
            <polygon points="0,0 -4,7 4,7" fill="#06b6d4" />
          </g>
        </svg>

        <!-- Pulsing Convective Radar Halo with Multi-Color Convective Bleed -->
        <div style="position: absolute; width: 74px; height: 74px; border-radius: 50%; background: radial-gradient(circle, rgba(239, 68, 68, 0.75) 0%, rgba(249, 115, 22, 0.5) 45%, rgba(6, 182, 212, 0.35) 75%, transparent 100%); animation: eyePulse 1.6s ease-in-out infinite alternate;"></div>

        <!-- Eye of the Cyclone & Hail Core Center -->
        <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: #0f172a; border: 2.5px solid #ef4444; box-shadow: 0 0 20px #ef4444, inset 0 0 10px rgba(239, 68, 68, 0.85); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 14px; font-weight: 900; z-index: 2;">
          ⚡
        </div>

        <!-- Tactical Center Telemetry Label -->
        <div style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.95); border: 1px solid #ef4444; border-radius: 4px; padding: 2px 7px; font-size: 8.5px; font-weight: 800; color: #fee2e2; white-space: nowrap; box-shadow: 0 2px 10px rgba(0,0,0,0.85); letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px;">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: #ef4444;" class="pulsing-dot"></span>
          CYCLONE &gt;58 dBZ
        </div>
      </div>`;
    if (stormMarkerRef.current) {
      stormMarkerRef.current.setLngLat(markerPos);
    } else {
      const el = document.createElement('div');
      el.dataset.phase = phase;
      el.innerHTML = html;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(markerPos)
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="font-family: inherit; padding: 8px; color: #f8fafc; min-width: 190px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
              <strong style="color: #ef4444; font-size: 0.95rem;">CYCLONE VORTEX</strong>
              <span style="background: rgba(239, 68, 68, 0.25); color: #fca5a5; border: 1px solid #ef4444; padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 800;">CODE RED</span>
            </div>
            <div style="font-size: 0.78rem; line-height: 1.6; color: #cbd5e1;">
              <div>Reflectivity Core: <strong style="color: #ef4444;">58–64.2 dBZ</strong></div>
              <div>Airway Inflow: <strong style="color: #06b6d4;">Cyclonic Inflow Jet</strong></div>
              <div>Hail Probability: <strong style="color: #f97316;">88% Severe</strong></div>
              <div>Target: <strong>Vijayawada Urban Asset</strong></div>
            </div>
          </div>
        `))
        .addTo(map);
      stormMarkerRef.current = marker;
    }
  }, [markerPos, segInfo, mapReady, styleEpoch]);

  // Camera follows the storm while it travels.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markerPos || !playing) return;
    camTickRef.current += 1;
    if (camTickRef.current % 4 !== 0) return; // throttle easeTo to ~5 Hz
    map.easeTo({ center: markerPos, duration: 260, zoom: Math.max(map.getZoom(), 5.4) });
  }, [markerPos, playing]);

  useEffect(() => () => {
    if (stormMarkerRef.current) stormMarkerRef.current.remove();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

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

  const handlePlay = () => {
    if (prog >= path.length - 1) setProg(0); // replay from the start
    setPlaying((r) => !r);
  };

  const handleScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / Math.max(rect.width, 1);
    setPlaying(false);
    setProg(clampProg(frac * (path.length - 1)));
  };

  const fitNowcast = () => {
    const map = mapRef.current;
    if (!map || path.length < 2) return;
    map.fitBounds(path.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(path[0], path[0])), { padding: 70, duration: 900 });
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 'auto', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', overflow: 'hidden', background: '#0a0f1d' }}>
      
      {/* Map Canvas */}
      <div style={{ position: 'relative', height: '500px', width: '100%' }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

        {/* Sweeping Doppler Radar Canvas Overlay */}
        <canvas
          ref={radarCanvasRef}
          width={900}
          height={500}
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

        {/* Global Keyframes for Cyclone Rotation and Airway Streamlines */}
        <style>{`
          @keyframes cycloneVortexSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
          @keyframes airwayStreamFlow {
            to { stroke-dashoffset: -24; }
          }
          @keyframes eyePulse {
            0% { transform: scale(0.9); opacity: 0.75; }
            100% { transform: scale(1.18); opacity: 1; }
          }
        `}</style>

        {/* Live Voice Copilot Subtitle Bar */}
        {voiceSubtitle && (
          <div style={{
            position: 'absolute',
            bottom: '14px',
            left: '16px',
            right: '16px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
            border: '1.5px solid #38bdf8',
            borderRadius: '10px',
            padding: '9px 16px',
            color: '#f8fafc',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.75), 0 0 16px rgba(56, 189, 248, 0.3)',
            animation: 'fadeIn 0.25s ease-in'
          }}>
            <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.74rem', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} className="pulsing-dot" />
              🎙️ VOICE COPILOT:
            </span>
            <span style={{ color: '#bae6fd', fontStyle: 'italic', lineHeight: 1.4, flex: 1 }}>
              "{voiceSubtitle}"
            </span>
            <button
              type="button"
              onClick={() => {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                setVoiceSubtitle('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700,
                padding: '2px 6px'
              }}
              title="Dismiss subtitle"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Control Panel Below Map */}
      <div style={{ 
        padding: '16px', 
        background: 'rgba(15, 23, 42, 0.95)', 
        borderTop: '1px solid rgba(56, 189, 248, 0.25)', 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '20px',
        justifyContent: 'space-between'
      }}>
        
        {/* Style Selector */}
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
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
        <div style={{ flex: '2 1 300px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
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

            {nowcast?.nowcast && (
              <>
                <button
                  onClick={() => toggleLayer('cone')}
                  style={{
                    background: layersVisibility.cone ? 'rgba(52, 211, 153, 0.18)' : '#1e293b',
                    border: `1px solid ${layersVisibility.cone ? '#34d399' : '#334155'}`,
                    color: layersVisibility.cone ? '#6ee7b7' : 'var(--text-dim)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ◌ Uncertainty Cone
                </button>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '12px' }}>
            <span style={{ color: '#ef4444' }}>🔴 &gt;55 dBZ Hail</span>
            <span style={{ color: '#f97316' }}>🟠 High Risk</span>
            <span style={{ color: '#eab308' }}>🟡 Advisory</span>
          </div>

      {/* Storm Centroid Telemetry HUD in Top-Right (ML Nowcast when live data is present) */}
      {nowcast?.nowcast ? (
        <div style={{
          flex: '1 1 250px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em', color: '#34d399', textTransform: 'uppercase' }}>
            Nowcast · {nowcast.nowcast.storm.name} {nowcast.nowcast.storm.season}
          </div>
          <select
            value={nowcast.selectedSid}
            onChange={(e) => nowcast.selectStorm(e.target.value)}
            style={{
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 8px',
              fontSize: '0.76rem',
              cursor: 'pointer',
              width: '100%'
            }}
            aria-label="Choose a real storm to watch"
          >
            {(nowcast.storms || []).map((s) => (
              <option key={s.sid} value={s.sid}>{s.name} · {s.season}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" onClick={handlePlay} style={{ ...hudBtnStyle, background: playing ? 'rgba(52, 211, 153, 0.4)' : 'rgba(52, 211, 153, 0.18)', padding: '4px 10px' }} aria-label={playing ? 'Pause the storm journey' : 'Play the storm journey'}>
              {playing ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
            <button type="button" onClick={() => { setProg(0); setPlaying(true); }} style={{ ...hudBtnStyle, padding: '4px 10px' }} aria-label="Replay the storm journey">↺ REPLAY</button>
            <button type="button" onClick={fitNowcast} style={{ ...hudBtnStyle, padding: '4px 10px' }} aria-label="Show the whole journey">⤢ FIT</button>
            <button
              type="button"
              onClick={() => setShowAccuracy((s) => !s)}
              style={{ ...hudBtnStyle, padding: '4px 10px', background: showAccuracy ? 'rgba(56, 189, 248, 0.35)' : hudBtnStyle.background, borderColor: showAccuracy ? '#38bdf8' : '#34d399', color: showAccuracy ? '#bae6fd' : '#6ee7b7' }}
              aria-label="Show where the model was checked against reality"
            >
              ◎ ACCURACY
            </button>
            <button
              type="button"
              onClick={() => {
                if (voiceEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                setVoiceEnabled((v) => !v);
              }}
              style={{
                ...hudBtnStyle,
                padding: '4px 10px',
                background: voiceEnabled ? 'rgba(56, 189, 248, 0.25)' : 'rgba(239, 68, 68, 0.15)',
                borderColor: voiceEnabled ? '#38bdf8' : '#ef4444',
                color: voiceEnabled ? '#38bdf8' : '#fca5a5'
              }}
              aria-label="Toggle voice copilot assistant"
              title={voiceEnabled ? 'Mute Voice Copilot' : 'Enable Voice Copilot'}
            >
              {voiceEnabled ? '🔊 VOICE: ON' : '🔇 VOICE: OFF'}
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>SPEED:</span>
            {[
              { spd: 0.009, label: '0.25x' },
              { spd: 0.018, label: '0.5x' },
              { spd: 0.04, label: '1x' },
              { spd: 0.08, label: '2x' }
            ].map(({ spd, label }) => (
              <button 
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                style={{
                  ...hudBtnStyle, 
                  background: playbackSpeed === spd ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.1)',
                  borderColor: playbackSpeed === spd ? '#38bdf8' : '#334155',
                  color: playbackSpeed === spd ? '#fff' : '#38bdf8',
                  padding: '2px 8px'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            role="slider"
            aria-label="Storm journey position"
            aria-valuemin={0}
            aria-valuemax={Math.max(path.length - 1, 1)}
            aria-valuenow={Math.round(prog)}
            tabIndex={0}
            onClick={handleScrub}
            style={{ height: '8px', borderRadius: '4px', background: 'rgba(148, 163, 184, 0.25)', cursor: 'pointer', position: 'relative', marginTop: '6px' }}
          >
            <div style={{
              position: 'absolute', inset: 0, width: `${path.length > 1 ? (prog / (path.length - 1)) * 100 : 0}%`,
              borderRadius: '4px',
              background: 'linear-gradient(90deg, #fbbf24 0%, #34d399 100%)'
            }} />
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: caption.startsWith('Predicted') ? '#6ee7b7' : '#fbbf24', minHeight: '1.2em' }}>
            {caption}
          </div>
        </div>
      ) : (
        <div style={{
          flex: '1 1 250px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <Navigation size={18} color="#38bdf8" style={{ transform: `rotate(${storm.direction_deg - 45}deg)` }} />
            <span className="mono" style={{ fontWeight: 800, color: '#f8fafc' }}>
              {storm.speed_kmh} km/h • 135° SE
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Intensity: <strong style={{ color: '#ef4444' }}>{Math.round((storm.intensity || 0.78) * 100)}% ({storm.stage || 'Rapid Intensification'})</strong>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
