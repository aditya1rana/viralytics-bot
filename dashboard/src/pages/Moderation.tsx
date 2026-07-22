import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Moderation() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const [editingViewsId, setEditingViewsId] = useState<string | null>(null);
  const [viewsInput, setViewsInput] = useState('');

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await api.getSubmissions(statusFilter, '', searchQuery);
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubmissions();
  };

  const handleApprove = async (id: string, currentViews?: number) => {
    try {
      await api.approveSubmission(id, currentViews);
      setSuccess('Submission approved! Views and campaign budget updated.');
      setTimeout(() => setSuccess(''), 3500);
      fetchSubmissions();
    } catch (err: any) {
      setError(err.message || 'Failed to approve submission');
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }
    try {
      await api.rejectSubmission(rejectingId, rejectReason);
      setSuccess('Submission rejected.');
      setTimeout(() => setSuccess(''), 3500);
      setRejectModalOpen(false);
      fetchSubmissions();
    } catch (err: any) {
      setError(err.message || 'Failed to reject submission');
    }
  };

  const handleSaveViews = async (id: string) => {
    const num = parseInt(viewsInput, 10) || 0;
    try {
      await api.updateSubmissionViews(id, num);
      setEditingViewsId(null);
      fetchSubmissions();
    } catch (err: any) {
      setError(err.message || 'Failed to update views');
    }
  };

  const handleCSVExport = () => {
    const url = api.getCSVExportUrl(statusFilter);
    window.open(url, '_blank');
  };

  const getStatusBadge = (st: string) => {
    const s = st.toUpperCase();
    if (s === 'APPROVED') return <span className="badge active">Approved</span>;
    if (s === 'REJECTED') return <span className="badge error">Rejected</span>;
    if (s === 'PENDING') return <span className="badge paused">Pending</span>;
    return <span className="badge">{st}</span>;
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num || 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Submission Moderation</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Review submitted clips, verify views, approve/reject, and export datasets</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleCSVExport} style={{ background: '#10B981', color: 'white', fontWeight: 600, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📥 Export CSV ({statusFilter})
          </button>
          <button onClick={fetchSubmissions} style={{ padding: '10px 16px' }}>Refresh</button>
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

      {/* Filters & Search */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                borderRadius: '20px',
                background: statusFilter === st ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search URL or Creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 14px', fontSize: '13px', width: '240px' }}
          />
          <button type="submit" style={{ padding: '8px 16px' }}>Search</button>
        </form>
      </div>

      {/* Submissions Feed */}
      {loading ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>Loading submission feed...</div>
      ) : submissions.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No submissions found for the selected filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {submissions.map((sub) => (
            <div key={sub.id} className="glass-card flex-col gap-3" style={{ position: 'relative' }}>
              {/* Thumbnail Header */}
              {sub.thumbnailUrl ? (
                <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden', background: '#000' }}>
                  <img src={sub.thumbnailUrl} alt="Video Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <a
                    href={sub.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '14px', fontWeight: 600, textDecoration: 'none'
                    }}
                  >
                    ▶ Open Video Link ↗
                  </a>
                </div>
              ) : (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
                  <a href={sub.originalUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>
                    🔗 Open Submitted Clip Link ↗
                  </a>
                </div>
              )}

              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    {sub.platform.replace('_', ' ')} • {sub.campaignName}
                  </span>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
                    {sub.creatorTag} <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>({sub.creatorHandle || 'no handle'})</span>
                  </div>
                </div>
                {getStatusBadge(sub.status)}
              </div>

              {/* View Count Controls */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Views Generated</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>
                    👁 {formatNumber(sub.viewsCount)}
                  </div>
                </div>

                {editingViewsId === sub.id ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      value={viewsInput}
                      onChange={(e) => setViewsInput(e.target.value)}
                      style={{ width: '90px', padding: '4px 8px', fontSize: '13px' }}
                    />
                    <button onClick={() => handleSaveViews(sub.id)} style={{ padding: '4px 10px', fontSize: '12px', background: '#10B981', color: 'white' }}>Save</button>
                    <button onClick={() => setEditingViewsId(null)} style={{ padding: '4px 8px', fontSize: '12px' }}>Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingViewsId(sub.id); setViewsInput(String(sub.viewsCount || 0)); }}
                    style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(255,255,255,0.08)' }}
                  >
                    ✏ Edit Views
                  </button>
                )}
              </div>

              {sub.notes && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                  💬 Note: {sub.notes}
                </p>
              )}

              {/* Review Info if reviewed */}
              {sub.status !== 'PENDING' && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Reviewed by <b>{sub.reviewedBy || 'Admin'}</b> {sub.reviewedAt ? `on ${new Date(sub.reviewedAt).toLocaleDateString()}` : ''}
                </div>
              )}

              {/* Action Buttons for Pending */}
              {sub.status === 'PENDING' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleApprove(sub.id, sub.viewsCount)}
                    style={{ background: '#10B981', color: 'white', fontWeight: 600, padding: '10px' }}
                  >
                    ✓ Approve Clip
                  </button>
                  <button
                    onClick={() => openRejectModal(sub.id)}
                    style={{ background: '#EF4444', color: 'white', fontWeight: 600, padding: '10px' }}
                  >
                    ✕ Reject Clip
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Reject Submission</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>Please specify a reason for rejecting this submission.</p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Invalid link, duplicate clip, or hashtags missing"
              style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setRejectModalOpen(false)}>Cancel</button>
              <button onClick={handleReject} style={{ background: '#EF4444', color: 'white', padding: '8px 20px' }}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
