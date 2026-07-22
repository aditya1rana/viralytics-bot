import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Creators() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);

  const fetchCreators = () => {
    setLoading(true);
    api.getCreators()
      .then(data => setCreators(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num || 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Creator Analytics & Social Accounts</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Track total views generated per creator and their submitted social media handles</p>
        </div>
        <button onClick={fetchCreators} style={{ padding: '10px 16px' }}>Refresh Data</button>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>Loading creator analytics...</div>
      ) : creators.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No creator data recorded yet. Submissions will populate creator stats automatically.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {creators.map((c) => (
            <div key={c.userId} className="glass-card flex-col gap-4">
              {/* Profile Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: 'white',
                  overflow: 'hidden'
                }}>
                  {c.avatarUrl ? <img src={c.avatarUrl} alt={c.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{c.username}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{c.tag} • ID: {c.userId}</div>
                </div>
              </div>

              {/* Total Views Big Card */}
              <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(139, 92, 246, 0.15))', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Views Generated</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                  👁 {formatNumber(c.totalViewsGenerated)}
                </div>
              </div>

              {/* Submissions Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TOTAL</div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>{c.totalSubmissions}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>APPROVED</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#10B981' }}>{c.approvedSubmissions}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>REJECTED</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#EF4444' }}>{c.rejectedSubmissions}</div>
                </div>
              </div>

              {/* Connected Social Accounts */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Connected Social Accounts</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {c.socialHandles.length > 0 ? (
                    c.socialHandles.map((h: string) => (
                      <span key={h} style={{ background: 'rgba(139, 92, 246, 0.2)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        @{h.replace('@', '')}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No accounts logged</span>
                  )}
                </div>
              </div>

              <button onClick={() => setSelectedCreator(c)} style={{ padding: '8px', width: '100%', fontSize: '13px', background: 'rgba(255,255,255,0.06)' }}>
                View Submitted Clips ({c.submissions.length})
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Creator Submitted Clips */}
      {selectedCreator && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{selectedCreator.username}'s Submitted Clips</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedCreator.tag}</div>
              </div>
              <button onClick={() => setSelectedCreator(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {selectedCreator.submissions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No submissions found for this creator.</p>
            ) : (
              <div className="flex-col gap-3">
                {selectedCreator.submissions.map((sub: any) => (
                  <div key={sub.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>{sub.platform} • {sub.campaignName}</div>
                      <a href={sub.url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'white', textDecoration: 'underline', marginTop: '2px', display: 'block' }}>
                        {sub.url} ↗
                      </a>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>👁 {formatNumber(sub.viewsCount)}</div>
                      <span className={`badge ${sub.status === 'APPROVED' ? 'active' : sub.status === 'REJECTED' ? 'error' : 'paused'}`} style={{ fontSize: '10px' }}>
                        {sub.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
