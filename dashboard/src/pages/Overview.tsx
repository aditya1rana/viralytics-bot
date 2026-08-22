import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Overview() {
  const [stats, setStats] = useState<any>(null);
  const [activityStats, setActivityStats] = useState<{date: string, count: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getStats(), api.getActivityStats()])
      .then(([statsData, activityData]) => {
        setStats(statsData);
        setActivityStats(activityData || []);
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
    { label: 'Total Members', value: stats?.members?.total || 0, icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', color: 'var(--primary)' },
    { label: 'Verified Members', value: stats?.members?.verified || 0, icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3', color: 'var(--success)' },
    { label: 'Active Campaigns', value: stats?.campaigns?.active || 0, icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', color: 'var(--warning)' },
    { label: 'Total Submissions', value: stats?.submissions?.total || 0, icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8', color: 'hsl(300, 70%, 60%)' },
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
        <h3>Recent System Activity (Submissions)</h3>
        {activityStats.length > 0 ? (
          <div style={{ position: 'relative', height: '200px', marginTop: '32px', marginBottom: '24px' }}>
            <svg width="100%" height="200px" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {(() => {
                const maxCount = Math.max(...activityStats.map(d => d.count), 10);
                const getPoints = () => activityStats.map((d, i) => {
                  const x = (i / (activityStats.length - 1 || 1)) * 500;
                  const y = 180 - (d.count / maxCount) * 160;
                  return { x, y, count: d.count, date: d.date };
                });
                
                const points = getPoints();
                const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
                
                return (
                  <>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="url(#line-gradient)"
                      strokeWidth="4"
                      filter="url(#glow)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {points.map((p, i) => (
                      <g key={i} className="chart-point">
                        <circle cx={p.x} cy={p.y} r="6" fill="#1e1e2e" stroke="var(--primary)" strokeWidth="3" filter="url(#glow)" />
                        <text x={p.x} y={p.y - 15} fill="white" fontSize="12" textAnchor="middle" fontWeight="bold">
                          {p.count}
                        </text>
                        <text x={p.x} y={198} fill="var(--text-secondary)" fontSize="10" textAnchor="middle">
                          {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        ) : (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--glass-border)', borderRadius: '8px', marginTop: '16px' }}>
            <p>No activity data available.</p>
          </div>
        )}
      </div>

      <div className="glass-card" style={{ marginTop: '24px', padding: '0', overflowX: 'auto' }}>
        <h3 style={{ padding: '24px 24px 0 24px', margin: 0 }}>Recent Joins</h3>
        <RecentJoinsTable />
      </div>
    </div>
  );
}

function RecentJoinsTable() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch page 1, empty search, current members
    api.getMembers(1, '', 'current')
      .then(data => {
        // Just take the top 10 most recent
        setMembers((data.data || []).slice(0, 10));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading recent joins...</div>;
  }

  if (members.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>No recent joins found.</div>;
  }

  return (
    <table style={{ width: '100%', minWidth: '600px', marginTop: '16px' }}>
      <thead>
        <tr>
          <th>User ID</th>
          <th>Username</th>
          <th>Joined / Created</th>
          <th>Invited By</th>
        </tr>
      </thead>
      <tbody>
        {members.map(member => (
          <tr key={member.id}>
            <td style={{ fontFamily: 'monospace' }}>{member.userId}</td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold'
                }}>
                  {(member.user?.username || '?')[0].toUpperCase()}
                </div>
                {member.user?.username || 'Unknown'}
              </div>
            </td>
            <td>
              <div style={{ fontSize: '13px' }}>{new Date(member.createdAt).toLocaleDateString()}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {new Date(member.createdAt).toLocaleTimeString()}
              </div>
            </td>
            <td>
              {member.inviter ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', background: 'var(--surface-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'
                  }}>
                    {member.inviter.username[0].toUpperCase()}
                  </div>
                  <span>{member.inviter.username}</span>
                </div>
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>Unknown/None</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
