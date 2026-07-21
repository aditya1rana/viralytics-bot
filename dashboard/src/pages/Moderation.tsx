import { useEffect, useState } from 'react';
import { api } from '../api';

export function Moderation() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingSubmissions();
      setSubmissions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.approveSubmission(id);
      setSuccess('Submission approved successfully.');
      setTimeout(() => setSuccess(''), 3000);
      fetchSubmissions();
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectReason) {
      setError('Reject reason is required.');
      return;
    }
    try {
      await api.rejectSubmission(rejectingId, rejectReason);
      setSuccess('Submission rejected.');
      setTimeout(() => setSuccess(''), 3000);
      setRejectModalOpen(false);
      fetchSubmissions();
    } catch (err: any) {
      setError(err.message || 'Failed to reject');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: '"Inter", sans-serif' }}>
      <h2 style={{ color: '#fff', marginBottom: '20px' }}>Moderation Review</h2>

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

      {loading ? (
        <p style={{ color: '#aaa' }}>Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <p style={{ color: '#aaa' }}>No pending submissions.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {submissions.map((sub) => (
            <div key={sub.id} style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              backdropFilter: 'blur(20px)', 
              border: '1px solid rgba(255, 255, 255, 0.08)', 
              borderRadius: '12px', 
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff' }}>{sub.submitterName || 'Unknown User'}</h3>
                <span style={{ background: 'rgba(255, 255, 0, 0.1)', color: '#fcc419', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em' }}>PENDING</span>
              </div>
              <div style={{ color: '#aaa', fontSize: '0.9em' }}>
                <p style={{ margin: '5px 0' }}><strong>Campaign:</strong> {sub.campaignName}</p>
                <p style={{ margin: '5px 0' }}><strong>Platform:</strong> {sub.platform}</p>
                <p style={{ margin: '5px 0' }}>
                  <strong>URL:</strong> <a href={sub.url} target="_blank" rel="noreferrer" style={{ color: '#339af0', textDecoration: 'none' }}>{sub.url}</a>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  onClick={() => handleApprove(sub.id)}
                  style={{ 
                    background: 'linear-gradient(135deg, #2b8a3e, #40c057)', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Approve
                </button>
                <button 
                  onClick={() => openRejectModal(sub.id)}
                  style={{ 
                    background: 'linear-gradient(135deg, #c92a2a, #fa5252)', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectModalOpen && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            background: 'rgba(30, 30, 30, 0.9)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '12px', 
            padding: '25px',
            width: '90%', maxWidth: '400px'
          }}>
            <h3 style={{ color: '#fff', marginTop: 0 }}>Reject Submission</h3>
            <textarea 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              style={{
                width: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.2)', 
                border: '1px solid rgba(255,255,255,0.1)', color: '#fff', 
                padding: '10px', borderRadius: '6px', marginBottom: '15px',
                outline: 'none', boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 8px rgba(255,255,255,0.2)'}
              onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setRejectModalOpen(false)}
                style={{ background: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                style={{ 
                  background: 'linear-gradient(135deg, #c92a2a, #fa5252)', color: '#fff', 
                  border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' 
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
