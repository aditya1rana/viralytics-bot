import { useEffect, useState } from 'react';
import { api } from '../api';

export function Payouts() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [calculating, setCalculating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [camps, pays] = await Promise.all([
        api.getCampaigns(),
        api.getPayouts()
      ]);
      setCampaigns(camps);
      setPayouts(pays);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCalculate = async () => {
    if (!selectedCampaign) {
      setError('Please select a campaign first.');
      return;
    }
    setCalculating(true);
    try {
      const res = await api.calculatePayouts(selectedCampaign);
      setSuccess(`Created ${res.created || 0} new payout rows.`);
      setTimeout(() => setSuccess(''), 4000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to calculate payouts');
    } finally {
      setCalculating(false);
    }
  };

  const handlePay = async (id: string) => {
    try {
      await api.payPayout(id);
      setSuccess('Marked as paid.');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to mark as paid');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: '"Inter", sans-serif' }}>
      <h2 style={{ color: '#fff', marginBottom: '20px' }}>Payouts Manager</h2>

      {error && (
        <div style={{ background: 'rgba(255, 0, 0, 0.1)', border: '1px solid rgba(255, 0, 0, 0.3)', color: '#ff6b6b', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>×</button>
        </div>
      )}
      
      {success && (
        <div style={{ background: 'rgba(0, 255, 0, 0.1)', border: '1px solid rgba(0, 255, 0, 0.3)', color: '#51cf66', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
          {success}
          <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', color: '#51cf66', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.03)', 
        backdropFilter: 'blur(20px)', 
        border: '1px solid rgba(255, 255, 255, 0.08)', 
        borderRadius: '12px', 
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#fff' }}>Calculate Payouts</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <select 
            value={selectedCampaign} 
            onChange={(e) => setSelectedCampaign(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', 
              color: '#fff', padding: '10px', borderRadius: '6px', outline: 'none', flex: 1
            }}
          >
            <option value="" disabled>Select a campaign...</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button 
            onClick={handleCalculate}
            disabled={calculating}
            style={{ 
              background: 'linear-gradient(135deg, #4dabf7, #228be6)', 
              color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', 
              cursor: calculating ? 'not-allowed' : 'pointer',
              opacity: calculating ? 0.7 : 1
            }}
          >
            {calculating ? 'Calculating...' : 'Calculate Campaign Payouts'}
          </button>
        </div>
      </div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.03)', 
        backdropFilter: 'blur(20px)', 
        border: '1px solid rgba(255, 255, 255, 0.08)', 
        borderRadius: '12px', 
        padding: '20px',
        overflowX: 'auto'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#fff' }}>Payouts Directory</h3>
        {loading ? (
          <p style={{ color: '#aaa' }}>Loading payouts...</p>
        ) : payouts.length === 0 ? (
          <p style={{ color: '#aaa' }}>No payout records found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#eee' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                <th style={{ padding: '12px 10px' }}>User</th>
                <th style={{ padding: '12px 10px' }}>Campaign</th>
                <th style={{ padding: '12px 10px' }}>Amount</th>
                <th style={{ padding: '12px 10px' }}>Status</th>
                <th style={{ padding: '12px 10px' }}>Date</th>
                <th style={{ padding: '12px 10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 10px' }}>{p.username || p.userId}</td>
                  <td style={{ padding: '12px 10px' }}>{p.campaignName}</td>
                  <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>${p.amount !== undefined ? parseFloat(p.amount).toFixed(2) : '0.00'}</td>
                  <td style={{ padding: '12px 10px' }}>
                    {p.status === 'COMPLETED' ? (
                      <span style={{ background: 'rgba(0, 255, 0, 0.1)', color: '#51cf66', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em' }}>COMPLETED</span>
                    ) : (
                      <span style={{ background: 'rgba(255, 255, 0, 0.1)', color: '#fcc419', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em' }}>PENDING</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 10px' }}>{new Date(p.createdAt || Date.now()).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 10px' }}>
                    {p.status === 'PENDING' && (
                      <button 
                        onClick={() => handlePay(p.id)}
                        style={{ 
                          background: 'linear-gradient(135deg, #2b8a3e, #40c057)', 
                          color: '#fff', border: 'none', padding: '6px 12px', 
                          borderRadius: '6px', cursor: 'pointer',
                          transition: 'transform 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        Mark as Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
