/* StormSense ML nowcast client — talks to the trained-model API in
   stormai/serve_api.py (uvicorn, port 8001). Returns real IBTrACS storms
   and recursive XGBoost forecasts for the live map simulation. */

import { useCallback, useEffect, useState } from 'react';
import { NOWCAST_BASE as NOWCAST_API } from '../config/services';

export function useNowcast() {
  const [storms, setStorms] = useState([]);
  const [nowcast, setNowcast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSid, setSelectedSid] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`${NOWCAST_API}/storms?limit=200`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (alive) setStorms(d.storms || []);
      })
      .catch((e) => {
        if (alive) setError(e?.message || String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  const loadStorm = useCallback((sid, steps = 6) => {
    if (!sid) return;
    setSelectedSid(sid);
    setLoading(true);
    setError(null);
    fetch(`${NOWCAST_API}/nowcast/${sid}?steps=${steps}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setNowcast(d))
      .catch((e) => setError(e?.message || String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Auto-load the most recent storm once the catalogue arrives.
  useEffect(() => {
    if (!selectedSid && storms.length) loadStorm(storms[0].sid);
  }, [storms, selectedSid, loadStorm]);

  return { storms, nowcast, loading, error, selectedSid, selectStorm: loadStorm };
}

/* POST the last 3 radar volume scans of one storm cell to the SWDI hail
   model (stormai/serve_api.py) and get P(severe hail on the NEXT scan). */
export async function predictSevereHail(recentScans) {
  const res = await fetch(`${NOWCAST_API}/predict/severe-weather`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recent_scans: recentScans }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
