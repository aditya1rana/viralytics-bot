export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

const API_BASE = '/api'; // Use relative URLs since we proxy in dev or serve from same host in prod

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', token);
  }
  
  if (!headers.has('Content-Type') && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'API Request failed');
  }

  return data;
}

export const api = {
  login: (password: string) => fetchWithAuth('/auth', {
    method: 'POST',
    body: JSON.stringify({ password }),
  }),
  getStats: () => fetchWithAuth('/stats'),
  getConfig: () => fetchWithAuth('/config'),
  updateConfig: (config: any) => fetchWithAuth('/config', {
    method: 'POST',
    body: JSON.stringify(config),
  }),
  getLogs: (type: string, page = 1) => fetchWithAuth(`/logs?type=${type}&page=${page}`),
  getCampaigns: () => fetchWithAuth('/campaigns'),
  createCampaign: (campaign: any) => fetchWithAuth('/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaign),
  }),
  updateCampaignStatus: (id: string, status: string) => fetchWithAuth(`/campaigns/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  }),
  getMembers: (page = 1, search = '') => fetchWithAuth(`/members?page=${page}&search=${encodeURIComponent(search)}`),
  getPendingSubmissions: () => fetchWithAuth('/submissions/pending'),
  approveSubmission: (id: string) => fetchWithAuth(`/submissions/${id}/approve`, { method: 'POST' }),
  rejectSubmission: (id: string, reason: string) => fetchWithAuth(`/submissions/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  getPayouts: () => fetchWithAuth('/payouts'),
  calculatePayouts: (campaignId: string) => fetchWithAuth('/payouts/calculate', {
    method: 'POST',
    body: JSON.stringify({ campaignId }),
  }),
  payPayout: (id: string) => fetchWithAuth(`/payouts/${id}/pay`, { method: 'POST' }),
  getActivityStats: () => fetchWithAuth('/stats/activity'),
};
