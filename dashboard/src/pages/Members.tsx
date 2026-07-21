import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Members() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setLoading(true);
      api.getMembers(page, search)
        .then(data => {
          setMembers(data.data || []);
          setTotalPages(Math.ceil(data.total / data.limit) || 1);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [page, search]);

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Members</h1>
      
      <div style={{ marginBottom: '24px', maxWidth: '400px' }}>
        <input 
          type="text" 
          placeholder="Search members by tag or ID..." 
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading members...</div>
        ) : (
          <table style={{ width: '100%', minWidth: '600px' }}>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Username</th>
                <th>Status</th>
                <th>XP / Level</th>
                <th>Submissions</th>
                <th>Invites (Valid)</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No members found.</td>
                </tr>
              ) : (
                members.map(member => {
                  const validInvites = (member.totalInvites || 0) + (member.bonusInvites || 0) - (member.leftInvites || 0) - (member.fakeInvites || 0);
                  return (
                    <tr key={member.id}>
                      <td style={{ fontFamily: 'monospace' }}>{member.userId}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold'
                          }}>
                            {(member.user?.username || '?')[0].toUpperCase()}
                          </div>
                          {member.user?.username || 'Unknown'}
                        </div>
                      </td>
                      <td>
                        {member.verificationStatus === 'VERIFIED' ? 
                          <span className="badge active">Verified</span> : 
                          <span className="badge error">Unverified</span>
                        }
                      </td>
                      <td>{member.totalXp || 0} XP (Lvl {member.level || 0})</td>
                      <td>{member.totalSubmissions || 0}</td>
                      <td>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                          {validInvites}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                          ({member.totalInvites || 0} total, {member.bonusInvites || 0} bonus, {member.leftInvites || 0} left, {member.fakeInvites || 0} fake)
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
        <button className="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          Previous
        </button>
        <span style={{ color: 'var(--text-secondary)' }}>Page {page} of {Math.max(1, totalPages)}</span>
        <button className="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
