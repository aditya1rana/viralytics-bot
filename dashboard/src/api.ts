export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

const API_BASE = '/api'; // Relative URLs for proxy/production serving

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
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
  login: (credentials: { username?: string; password?: string } | string) => {
    const body = typeof credentials === 'string' ? { password: credentials } : credentials;
    return fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
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
  updateCampaign: (id: string, campaign: any) => fetchWithAuth(`/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(campaign),
  }),
  updateCampaignStatus: (id: string, status: string) => fetchWithAuth(`/campaigns/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  }),
  getMembers: (page = 1, search = '') => fetchWithAuth(`/members?page=${page}&search=${encodeURIComponent(search)}`),
  getSubmissions: (status = 'ALL', campaignId = '', search = '') => 
    fetchWithAuth(`/submissions?status=${status}&campaignId=${campaignId}&search=${encodeURIComponent(search)}`),
  getPendingSubmissions: () => fetchWithAuth('/submissions?status=PENDING'),
  approveSubmission: (id: string, viewsCount?: number) => fetchWithAuth(`/submissions/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ viewsCount })
  }),
  rejectSubmission: (id: string, reason: string) => fetchWithAuth(`/submissions/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  updateSubmissionViews: (id: string, viewsCount: number, likesCount?: number) => fetchWithAuth(`/submissions/${id}/views`, {
    method: 'POST',
    body: JSON.stringify({ viewsCount, likesCount }),
  }),
  getCSVExportUrl: (status = 'ALL', campaignId = '') => `${API_BASE}/submissions/export/csv?status=${status}&campaignId=${campaignId}`,
  getCreators: () => fetchWithAuth('/creators'),
  getPayouts: () => fetchWithAuth('/payouts'),
  calculatePayouts: (campaignId: string) => fetchWithAuth('/payouts/calculate', {
    method: 'POST',
    body: JSON.stringify({ campaignId }),
  }),
  payPayout: (id: string) => fetchWithAuth(`/payouts/${id}/pay`, { method: 'POST' }),
  getActivityStats: () => fetchWithAuth('/stats/activity'),
  getLeaderboards: () => fetchWithAuth('/leaderboards'),
  getInviteLink: () => fetchWithAuth('/auth/invite-link'),
  getAdminSubscriptions: () => fetchWithAuth('/admin/subscriptions'),
  toggleSubscription: (guildId: string, isSubscribed: boolean, options: { durationDays?: number; customExpiresAt?: string; subscriptionTier?: string } = {}) => 
    fetchWithAuth(`/admin/subscriptions/${guildId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ isSubscribed, ...options }),
    }),
};
