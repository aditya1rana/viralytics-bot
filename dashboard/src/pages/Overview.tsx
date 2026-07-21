import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Overview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStats()
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading stats...</div>;
  if (error) return <div style={{ color: 'var(--error)' }}>Error: {error}</div>;

  const kpis = [
    { label: 'Total Members', value: stats?.totalMembers || 0, icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', color: 'var(--primary)' },
    { label: 'Verified Members', value: stats?.verifiedMembers || 0, icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3', color: 'var(--success)' },
    { label: 'Active Campaigns', value: stats?.activeCampaigns || 0, icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', color: 'var(--warning)' },
    { label: 'Total Submissions', value: stats?.totalSubmissions || 0, icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8', color: 'hsl(300, 70%, 60%)' },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Overview</h1>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: `color-mix(in srgb, ${kpi.color} 15%, transparent)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: kpi.color,
              boxShadow: `0 0 15px color-mix(in srgb, ${kpi.color} 20%, transparent)`
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={kpi.icon} />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '13px', margin: 0 }}>{kpi.label}</p>
              <h2 style={{ fontSize: '24px', margin: 0, color: 'white' }}>{kpi.value.toLocaleString()}</h2>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card">
        <h3>Recent System Activity</h3>
        <p>System is online and running smoothly.</p>
        {/* Placeholder for chart or recent logs */}
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--glass-border)', borderRadius: '8px', marginTop: '16px' }}>
          <p>Activity Chart (Coming soon)</p>
        </div>
      </div>
    </div>
  );
}
