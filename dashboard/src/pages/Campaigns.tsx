import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    brandName: '',
    description: '',
    instructions: '',
    rules: '',
    internalNotes: '',
    contractValue: '',
    viewsGoal: '',
    cpmRate: '',
    payPerApproved: '',
    status: 'ACTIVE',
    platforms: ['INSTAGRAM_REELS', 'TIKTOK', 'YOUTUBE_SHORTS'] as string[],
    startsAt: '',
    endsAt: ''
  });

  const ALL_PLATFORMS = ['INSTAGRAM_REELS', 'TIKTOK', 'YOUTUBE_SHORTS', 'FACEBOOK_REELS', 'X_VIDEOS', 'THREADS'];

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

  const openCreateModal = () => {
    setEditingCampaign(null);
    setFormData({
      name: '',
      brandName: '',
      description: '',
      instructions: '',
      rules: '',
      internalNotes: '',
      contractValue: '',
      viewsGoal: '',
      cpmRate: '',
      payPerApproved: '',
      status: 'ACTIVE',
      platforms: ['INSTAGRAM_REELS', 'TIKTOK', 'YOUTUBE_SHORTS'],
      startsAt: '',
      endsAt: ''
    });
    setShowModal(true);
  };

  const openEditModal = (c: any) => {
    setEditingCampaign(c);
    setFormData({
      name: c.name || '',
      brandName: c.brandName || '',
      description: c.description || '',
      instructions: c.instructions || '',
      rules: c.rules || '',
      internalNotes: c.internalNotes || '',
      contractValue: c.contractValue ? String(c.contractValue) : '',
      viewsGoal: c.viewsGoal ? String(c.viewsGoal) : '',
      cpmRate: c.cpmRate ? String(c.cpmRate) : '',
      payPerApproved: c.payPerApproved ? String(c.payPerApproved) : '',
      status: c.status || 'ACTIVE',
      platforms: c.platforms || ['INSTAGRAM_REELS', 'TIKTOK', 'YOUTUBE_SHORTS'],
      startsAt: c.startsAt ? new Date(c.startsAt).toISOString().split('T')[0] : '',
      endsAt: c.endsAt ? new Date(c.endsAt).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateCampaignStatus(id, status);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCampaign) {
        await api.updateCampaign(editingCampaign.id, formData);
        alert('Campaign updated successfully!');
      } else {
        await api.createCampaign(formData);
        alert('Campaign created successfully!');
      }
      setShowModal(false);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Failed to save campaign');
    }
  };

  const togglePlatform = (p: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(item => item !== p)
        : [...prev.platforms, p]
    }));
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'ACTIVE') return <span className="badge active">Active</span>;
    if (s === 'PAUSED') return <span className="badge paused">Paused</span>;
    if (s === 'COMPLETED') return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}>Completed</span>;
    if (s === 'DRAFT') return <span className="badge" style={{ background: 'rgba(156, 163, 175, 0.2)', color: '#9CA3AF' }}>Draft</span>;
    return <span className="badge error">{status}</span>;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Campaign Management</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Create, manage, and monitor real-time clipping campaigns</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={openCreateModal} style={{ background: 'var(--primary)', color: 'white', padding: '10px 18px', fontWeight: 600 }}>
            + Create Campaign
          </button>
          <button onClick={fetchCampaigns} style={{ padding: '10px 16px' }}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <h3>No Campaigns Found</h3>
          <p style={{ color: 'var(--text-muted)', margin: '12px 0 20px' }}>Create your first brand clipping campaign to start receiving video submissions.</p>
          <button onClick={openCreateModal} style={{ background: 'var(--primary)', color: 'white' }}>Create Campaign</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          {campaigns.map(c => (
            <div key={c.id} className="glass-card flex-col gap-4" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {c.brandName || 'Brand Campaign'}
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>{c.name}</h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {getStatusBadge(c.status)}
                  <button onClick={() => openEditModal(c)} style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(255,255,255,0.08)' }}>Edit</button>
                </div>
              </div>

              {c.description && (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{c.description}</p>
              )}

              {/* Progress Bar */}
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Views Goal Progress</span>
                  <span style={{ fontWeight: 700 }}>{c.goalProgress || 0}% ({formatNumber(c.viewsCompleted)} / {formatNumber(c.viewsGoal)})</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, c.goalProgress || 0)}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), #10B981)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* Financial & Video Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contract Value</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{formatCurrency(c.contractValue)}</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CPM Rate</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px', color: 'var(--primary)' }}>{formatCurrency(c.cpmRate)} / 1k</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spend Forecast</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px', color: '#F59E0B' }}>{formatCurrency(c.spendForecast)}</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining Budget</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px', color: '#10B981' }}>{formatCurrency(c.remainingBudget)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                <div style={{ color: 'var(--text-muted)' }}>
                  📹 <b>{c.approvedVideos || 0}</b> Approved / <b>{c.totalVideos || 0}</b> Submitted Clips
                </div>
                <select
                  value={c.status}
                  onChange={(e) => handleStatusChange(c.id, e.target.value)}
                  style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Creating / Editing Campaign */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-col gap-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Campaign Name *</label>
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Summer Launch Viral Clips" style={{ width: '100%', padding: '10px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Brand Name</label>
                  <input value={formData.brandName} onChange={e => setFormData({ ...formData, brandName: e.target.value })} placeholder="e.g. Nike / RedBull" style={{ width: '100%', padding: '10px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Campaign Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Contract Value ($)</label>
                  <input type="number" step="0.01" value={formData.contractValue} onChange={e => setFormData({ ...formData, contractValue: e.target.value })} placeholder="5000" style={{ width: '100%', padding: '10px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Views Goal</label>
                  <input type="number" value={formData.viewsGoal} onChange={e => setFormData({ ...formData, viewsGoal: e.target.value })} placeholder="5000000" style={{ width: '100%', padding: '10px', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>CPM Rate ($ / 1k views)</label>
                  <input type="number" step="0.01" value={formData.cpmRate} onChange={e => setFormData({ ...formData, cpmRate: e.target.value })} placeholder="1.50" style={{ width: '100%', padding: '10px', marginTop: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Allowed Platforms</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ALL_PLATFORMS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      style={{
                        padding: '6px 12px', fontSize: '12px', borderRadius: '20px',
                        background: formData.platforms.includes(p) ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                        color: 'white', border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Brief campaign summary" style={{ width: '100%', padding: '10px', marginTop: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Campaign Instructions & Rules</label>
                <textarea value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })} rows={3} placeholder="Requirements, hook guidelines, hashtags to use..." style={{ width: '100%', padding: '10px', marginTop: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Internal Admin Notes</label>
                <textarea value={formData.internalNotes} onChange={e => setFormData({ ...formData, internalNotes: e.target.value })} rows={2} placeholder="Private notes visible only to admins" style={{ width: '100%', padding: '10px', marginTop: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={{ background: 'var(--primary)', color: 'white', padding: '10px 24px' }}>Save Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
