import axios from 'axios';

const API_BASE = 'http://localhost:8000';
const NOWCAST_BASE = 'http://localhost:8001';

const http = axios.create({ timeout: 6000 });

export const api = {
  getStorms: () => http.get(`${API_BASE}/api/storms`),
  getStormDetail: (id = 'STORM-001') => http.get(`${API_BASE}/api/storms/${id}`),
  getForecast: (id = 'STORM-001') => http.get(`${API_BASE}/api/storms/${id}/forecast`),
  getHazards: () => http.get(`${API_BASE}/api/hazards`),
  getWeather: () => http.get(`${API_BASE}/api/weather`),

  // What-If Simulator
  simulateWhatIf: (params) => http.post(`${API_BASE}/api/simulate`, params),
  resetWhatIf: () => http.post(`${API_BASE}/api/simulate/reset`),
  login: (identity, password) => http.post(`${API_BASE}/api/auth/login`, { identity, password }),

  // Scenarios & Controls
  selectScenario: (scenario) => http.post(`${API_BASE}/api/scenarios/select`, { scenario }),
  controlSim: (action, speed = 1.0) => http.post(`${API_BASE}/api/simulation/control`, { action, speed }),
  selectMode: (mode) => http.post(`${API_BASE}/api/mode/select`, { mode }),

  // AI Analyst
  explainAlert: () => http.post(`${API_BASE}/api/ai/explain`),
  chatAI: (message, nowcast_briefing) => http.post(`${API_BASE}/api/ai/chat`, { message, nowcast_briefing }),

  // Nowcast Narrative & ML Event API
  getNowcastNarrative: (sid) => axios.get(`${NOWCAST_BASE}/nowcast/${sid}`),
  chatNowcast: (sid, message) => axios.post(`${NOWCAST_BASE}/nowcast/${sid}/chat`, { message }),

  // Health probe
  health: () => http.get(`${API_BASE}/`, { timeout: 2500 }),
};

