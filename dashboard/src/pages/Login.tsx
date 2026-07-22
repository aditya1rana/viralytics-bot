import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '../api';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login({ username, password });
      if (data.token) {
        setAuthToken(data.token);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw'
    }}>
      <div className={`glass-card animate-fade-in ${shake ? 'animate-shake' : ''}`} style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'linear-gradient(135deg, var(--primary), hsl(260, 87%, 60%))',
          borderRadius: '16px',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        
        <h1 style={{ fontSize: '24px', marginBottom: '6px' }}>Viralytics SaaS Portal</h1>
        <p style={{ marginBottom: '28px', color: 'var(--text-muted)', fontSize: '14px' }}>Sign in to manage campaigns and video clipping analytics</p>
        
        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Username</label>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              style={{ fontSize: '15px', padding: '12px' }}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{ fontSize: '15px', padding: '12px' }}
            />
          </div>

          {error && <div style={{ color: 'var(--error)', fontSize: '14px', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '8px' }}>{error}</div>}
          
          <button type="submit" disabled={loading} style={{ padding: '12px', marginTop: '8px' }} className="w-full">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
