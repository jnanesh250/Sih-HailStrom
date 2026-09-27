/*
 * MapLibre worker setup for Vite.
 * Vite's dep pre-bundling breaks maplibre's inline worker URL resolution,
 * so the worker must be registered explicitly (works in dev and build).
 */
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

maplibregl.setWorkerUrl(maplibreWorkerUrl);
