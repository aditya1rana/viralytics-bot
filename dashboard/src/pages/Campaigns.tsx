import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    payPerApprovedClip: 0,
    allowedPlatforms: [] as string[],
    guidelines: ''
  });

  const PLATFORMS = ['INSTAGRAM_REELS', 'TIKTOK', 'YOUTUBE_SHORTS', 'FACEBOOK_REELS', 'X_VIDEOS', 'THREADS'];

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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCampaign({
        ...formData,
        payPerApprovedClip: Number(formData.payPerApprovedClip)
      });
      alert('Campaign created successfully!');
      setShowCreator(false);
      setFormData({ name: '', description: '', payPerApprovedClip: 0, allowedPlatforms: [], guidelines: '' });
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Failed to create campaign');
    }
  };

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      allowedPlatforms: prev.allowedPlatforms.includes(platform)
        ? prev.allowedPlatforms.filter(p => p !== platform)
        : [...prev.allowedPlatforms, platform]
    }));
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowCreator(!showCreator)} style={{ background: 'var(--primary)', color: 'white' }}>
            {showCreator ? 'Cancel' : 'Create Campaign'}
          </button>
          <button onClick={fetchCampaigns}>Refresh</button>
        </div>
      </div>

      {showCreator && (
        <form onSubmit={handleCreateSubmit} className="glass-card" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3>Create New Campaign</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Name</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Campaign Name" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Description</label>
            <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Description" rows={3} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Pay Per Approved Clip ($)</label>
            <input required type="number" step="0.01" min="0" value={formData.payPerApprovedClip} onChange={e => setFormData({...formData, payPerApprovedClip: Number(e.target.value)})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Allowed Platforms</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {PLATFORMS.map(platform => (
                <label key={platform} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.allowedPlatforms.includes(platform)} onChange={() => togglePlatform(platform)} />
                  {platform}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Guidelines</label>
            <textarea required value={formData.guidelines} onChange={e => setFormData({...formData, guidelines: e.target.value})} placeholder="Guidelines" rows={4} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }} />
          </div>

          <button type="submit" style={{ background: 'var(--success)', color: 'white', marginTop: '12px' }}>
            Submit Campaign
          </button>
        </form>
      )}

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
