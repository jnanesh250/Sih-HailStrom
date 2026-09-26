import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export const api = {
  getStorms: () => axios.get(`${API_BASE}/api/storms`),
  getStormDetail: (id = 'STORM-001') => axios.get(`${API_BASE}/api/storms/${id}`),
  getForecast: (id = 'STORM-001') => axios.get(`${API_BASE}/api/storms/${id}/forecast`),
  getHazards: () => axios.get(`${API_BASE}/api/hazards`),
  getWeather: () => axios.get(`${API_BASE}/api/weather`),
  
  // What-If Simulator
  simulateWhatIf: (params) => axios.post(`${API_BASE}/api/simulate`, params),
  resetWhatIf: () => axios.post(`${API_BASE}/api/simulate/reset`),
  
  // Scenarios & Controls
  selectScenario: (scenario) => axios.post(`${API_BASE}/api/scenarios/select`, { scenario }),
  controlSim: (action, speed = 1.0) => axios.post(`${API_BASE}/api/simulation/control`, { action, speed }),
  selectMode: (mode) => axios.post(`${API_BASE}/api/mode/select`, { mode }),
  
  // AI Analyst
  explainAlert: () => axios.post(`${API_BASE}/api/ai/explain`),
  chatAI: (message) => axios.post(`${API_BASE}/api/ai/chat`, { message }),
};
