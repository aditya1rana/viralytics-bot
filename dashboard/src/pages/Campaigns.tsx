import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = () => {
    setLoading(true);
    api.getCampaigns()
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateCampaignStatus(id, status);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active') return <span className="badge active">Active</span>;
    if (s === 'paused') return <span className="badge paused">Paused</span>;
    return <span className="badge error">{status}</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Campaigns</h1>
        <button onClick={fetchCampaigns}>Refresh</button>
      </div>

      {loading ? (
        <div>Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          No campaigns found.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {campaigns.map(camp => (
            <div key={camp.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0 }}>{camp.name}</h3>
                {getStatusBadge(camp.status)}
              </div>
              
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                <p>Reward: {camp.rewardXP || 0} XP</p>
                <p>Submissions: {camp.submissionCount || 0}</p>
                {camp.endDate && <p>Ends: {new Date(camp.endDate).toLocaleDateString()}</p>}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
                <select 
                  value={camp.status} 
                  onChange={(e) => handleStatusChange(camp.id, e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CLOSED">Closed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
