import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Logs() {
  const [activeTab, setActiveTab] = useState('audit');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const tabs = [
    { id: 'audit', label: 'Audit Logs' },
    { id: 'submissions', label: 'Submissions' },
    { id: 'verifications', label: 'Verifications' },
  ];

  useEffect(() => {
    setLoading(true);
    api.getLogs(activeTab, page)
      .then(data => {
        setLogs(Array.isArray(data) ? data : (data.data || []));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab, page]);

  const renderLogRows = () => {
    if (logs.length === 0) {
      return (
        <tr>
          <td colSpan={3} style={{ textAlign: 'center', padding: '24px' }}>No logs found.</td>
        </tr>
      );
    }

    return logs.map((log, i) => {
      let actionUser = '';
      let details = '';

      if (activeTab === 'audit') {
        actionUser = `${log.action.replace(/_/g, ' ')}`;
        details = `Actor: ${log.actor?.username || log.actorId || 'System'} | Target: ${log.targetId || 'N/A'} ${log.reason ? `| Reason: ${log.reason}` : ''}`;
      } else if (activeTab === 'submissions') {
        actionUser = `${log.user?.username || log.userId} (Clip Submission)`;
        details = `Campaign: ${log.campaign?.name || 'N/A'} | ID: ${log.shortId} | URL: ${log.originalUrl} | Status: ${log.status}`;
      } else if (activeTab === 'verifications') {
        actionUser = `${log.user?.username || log.userId} (Verified)`;
        details = `User verified. Account age at verification: ${log.user?.createdAt ? 'Valid' : 'N/A'}`;
      }

      return (
        <tr key={i}>
          <td style={{ whiteSpace: 'nowrap' }}>
            {new Date(log.createdAt || log.updatedAt).toLocaleString()}
          </td>
          <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{actionUser}</td>
          <td style={{ color: 'var(--text-secondary)' }}>{details}</td>
        </tr>
      );
    });
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Logs</h1>
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? '' : 'secondary'}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading logs...</div>
        ) : (
          <table style={{ width: '100%', minWidth: '600px' }}>
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Timestamp</th>
                <th style={{ width: '25%' }}>Action / User</th>
                <th style={{ width: '55%' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {renderLogRows()}
            </tbody>
          </table>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
        <button className="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          Previous
        </button>
        <button className="secondary" disabled={logs.length < 50} onClick={() => setPage(p => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
