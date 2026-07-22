import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Subscriptions() {
  const [guilds, setGuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const handleToggleSubscription = async (guildId: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      await api.toggleSubscription(guildId, nextStatus);
      setSuccess(nextStatus ? 'Server subscription APPROVED and activated!' : 'Server subscription DEACTIVATED.');
      setTimeout(() => setSuccess(''), 3500);
      fetchSubscriptions();
    } catch (err: any) {
      setError(err.message || 'Failed to update subscription');
    }
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
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Approve or revoke Discord bot access for servers requesting access</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a
            href="https://discord.com/oauth2/authorize?client_id=1285324546592870460&permissions=8&scope=bot%20applications.commands"
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
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

              {/* Server Info */}
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

              {/* Status Badge & Approve Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                <div>
                  <span className={`badge ${g.isSubscribed ? 'active' : 'error'}`}>
                    {g.isSubscribed ? '● APPROVED & ACTIVE' : '○ UNAPPROVED / INACTIVE'}
                  </span>
                </div>

                <button
                  onClick={() => handleToggleSubscription(g.id, g.isSubscribed)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: g.isSubscribed ? '#EF4444' : '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                >
                  {g.isSubscribed ? 'Deactivate Permission' : '✓ Approve Subscription'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
