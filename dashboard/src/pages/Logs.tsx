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
        setLogs(Array.isArray(data) ? data : (data.logs || []));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab, page]);

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
                <th>Timestamp</th>
                <th>Action / User</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '24px' }}>No logs found.</td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt || log.timestamp).toLocaleString()}
                    </td>
                    <td>{log.action || log.userId || 'System'}</td>
                    <td>
                      <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'inherit', color: 'var(--text-secondary)' }}>
                        {JSON.stringify(log.details || log, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
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
