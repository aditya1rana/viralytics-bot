import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { removeAuthToken } from '../api';
import Overview from './Overview';
import ConfigEditor from './ConfigEditor';
import Logs from './Logs';
import Campaigns from './Campaigns';
import Members from './Members';
import Leaderboard from './Leaderboard';
import Moderation from './Moderation';
import { Payouts } from './Payouts';
import Creators from './Creators';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    removeAuthToken();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Overview', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { path: '/campaigns', label: 'Campaigns', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
    { path: '/moderation', label: 'Moderation', icon: 'M9.172 16.172a4 4 0 0 1 5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
    { path: '/creators', label: 'Creators & Analytics', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
    { path: '/config', label: 'Configuration', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' },
    { path: '/members', label: 'Members', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
    { path: '/leaderboard', label: 'Leaderboard', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    { path: '/payouts', label: 'Payouts', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    { path: '/logs', label: 'Audit Logs', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div className="glass-panel" style={{
        width: '270px',
        margin: '16px',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          padding: '0 8px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, var(--primary), hsl(260, 87%, 60%))',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>Viralytics SaaS</h2>
            <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>● Enterprise Active</span>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span style={{ fontWeight: isActive ? 600 : 400, fontSize: '14px' }}>{item.label}</span>
              </div>
            );
          })}
        </nav>

        <button className="secondary" onClick={handleLogout} style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" />
          </svg>
          Logout
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/moderation" element={<Moderation />} />
          <Route path="/creators" element={<Creators />} />
          <Route path="/config" element={<ConfigEditor />} />
          <Route path="/members" element={<Members />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/payouts" element={<Payouts />} />
          <Route path="/logs" element={<Logs />} />
        </Routes>
      </div>
    </div>
  );
}
