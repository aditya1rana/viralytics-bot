import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Subscriptions() {
  const [guilds, setGuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Approval Modal State
  const [selectedGuild, setSelectedGuild] = useState<any | null>(null);
  const [durationMode, setDurationMode] = useState<string>('30'); // '30', '60', '90', '365', 'LIFETIME', 'CUSTOM'
  const [customDate, setCustomDate] = useState<string>('');
  const [tier, setTier] = useState<string>('ENTERPRISE');

  const fetchSubscriptions = () => {
    setLoading(true);
    api.getAdminSubscriptions()
      .then(data => setGuilds(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message || 'Failed to fetch server subscriptions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const openApprovalModal = (g: any) => {
    setSelectedGuild(g);
    setDurationMode('30');
    setCustomDate('');
    setTier(g.subscriptionTier || 'ENTERPRISE');
  };

  const handleConfirmApproval = async () => {
    if (!selectedGuild) return;

    let durationDays: number | undefined;
    let customExpiresAt: string | undefined;

    if (durationMode === 'LIFETIME') {
      durationDays = undefined;
      customExpiresAt = undefined;
    } else if (durationMode === 'CUSTOM') {
      if (!customDate) {
        setError('Please select a custom expiration date.');
        return;
      }
      customExpiresAt = new Date(customDate).toISOString();
    } else {
      durationDays = parseInt(durationMode, 10);
    }

    try {
      await api.toggleSubscription(selectedGuild.id, true, {
        durationDays,
        customExpiresAt,
        subscriptionTier: tier,
      });

      setSuccess(`Server "${selectedGuild.name}" APPROVED & commands deployed instantly!`);
      setTimeout(() => setSuccess(''), 4000);
      setSelectedGuild(null);
      fetchSubscriptions();
    } catch (err: any) {
      setError(err.message || 'Failed to approve subscription');
    }
  };

  const handleDeactivate = async (guildId: string, name: string) => {
    try {
      await api.toggleSubscription(guildId, false);
      setSuccess(`Server "${name}" DEACTIVATED and slash commands removed.`);
      setTimeout(() => setSuccess(''), 4000);
      fetchSubscriptions();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate server');
    }
  };

  const formatExpiration = (g: any) => {
    if (!g.isSubscribed) return <span style={{ color: '#EF4444' }}>○ Inactive</span>;
    if (!g.subscriptionExpiresAt) return <span style={{ color: '#10B981', fontWeight: 600 }}>♾ Lifetime Access</span>;

    const expDate = new Date(g.subscriptionExpiresAt);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return <span style={{ color: '#EF4444', fontWeight: 700 }}>⚠️ Expired ({expDate.toLocaleDateString()})</span>;
    }

    return (
      <span style={{ color: '#F59E0B', fontWeight: 600 }}>
        ⏱ Expires in {diffDays} {diffDays === 1 ? 'day' : 'days'} ({expDate.toLocaleDateString()})
      </span>
    );
  };

  const filteredGuilds = guilds.filter(g => {
    if (filter === 'APPROVED') return g.isSubscribed;
    if (filter === 'UNAPPROVED') return !g.isSubscribed;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>SaaS Server Subscriptions</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Approve, manage subscription durations, or revoke Discord bot access for servers</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href="https://discord.com/oauth2/authorize?client_id=1528892453287886898&permissions=8&scope=bot+applications.commands"
            target="_blank"
            rel="noreferrer"
            style={{
              background: 'var(--primary)', color: 'white', fontWeight: 600, padding: '10px 18px',
              borderRadius: '10px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            🤖 Public Invite Link ↗
          </a>
          <button onClick={fetchSubscriptions} style={{ padding: '10px 16px' }}>Refresh List</button>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="glass-card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>
      )}
      
      {success && (
        <div className="glass-card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '8px' }}>
        {['ALL', 'APPROVED', 'UNAPPROVED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderRadius: '20px',
              background: filter === f ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>Loading Discord servers...</div>
      ) : filteredGuilds.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No servers found for the selected filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          {filteredGuilds.map(g => (
            <div key={g.id} className="glass-card flex-col gap-4" style={{ position: 'relative' }}>
              {/* Server Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '16px', background: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: 'white',
                  overflow: 'hidden', flexShrink: 0
                }}>
                  {g.iconUrl ? <img src={g.iconUrl} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : g.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{g.name}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {g.id}</div>
                  {g.isPrimaryOwnerServer && (
                    <span style={{ fontSize: '10px', background: 'rgba(139, 92, 246, 0.3)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginTop: '2px', display: 'inline-block' }}>
                      PRIMARY OWNER SERVER
                    </span>
                  )}
                </div>
              </div>

              {/* Server Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Joined Date</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>{new Date(g.joinedAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tracked Members</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>{g.memberCount || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Campaigns</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>{g.campaignCount || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subscription Tier</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>{g.subscriptionTier || 'ENTERPRISE'}</div>
                </div>
              </div>

              {/* Expiration Banner */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                {formatExpiration(g)}
              </div>

              {/* Status Badge & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                <div>
                  <span className={`badge ${g.isSubscribed ? 'active' : 'error'}`}>
                    {g.isSubscribed ? '● ACTIVE' : '○ INACTIVE'}
                  </span>
                </div>

                {g.isSubscribed ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openApprovalModal(g)}
                      style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,255,255,0.08)' }}
                    >
                      ✏ Edit Duration
                    </button>
                    <button
                      onClick={() => handleDeactivate(g.id, g.name)}
                      style={{ padding: '6px 12px', fontSize: '12px', background: '#EF4444', color: 'white' }}
                    >
                      Deactivate
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openApprovalModal(g)}
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: '#10B981', color: 'white' }}
                  >
                    ✓ Approve Subscription
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval & Duration Modal */}
      {selectedGuild && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '28px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
              Subscription Settings for {selectedGuild.name}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Set subscription duration and tier. Slash commands will be deployed instantly upon approval.
            </p>

            {/* Tier Select */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Subscription Tier
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <option value="ENTERPRISE">ENTERPRISE</option>
                <option value="PRO">PRO</option>
                <option value="STANDARD">STANDARD</option>
              </select>
            </div>

            {/* Duration Presets */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Select Subscription Duration
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {[
                  { label: '30 Days', val: '30' },
                  { label: '60 Days', val: '60' },
                  { label: '90 Days', val: '90' },
                  { label: '1 Year (365d)', val: '365' },
                  { label: 'Lifetime ♾', val: 'LIFETIME' },
                  { label: 'Custom Date', val: 'CUSTOM' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setDurationMode(opt.val)}
                    style={{
                      padding: '10px 8px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      background: durationMode === opt.val ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {durationMode === 'CUSTOM' && (
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Custom Expiration Date</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    style={{ width: '100%', padding: '10px' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setSelectedGuild(null)}>Cancel</button>
              <button onClick={handleConfirmApproval} style={{ background: '#10B981', color: 'white', padding: '10px 20px', fontWeight: 600 }}>
                ✓ Save & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
