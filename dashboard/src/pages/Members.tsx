import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Members() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'current' | 'left'>('current');
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    bonusInvites: 0,
    totalInvites: 0,
    fakeInvites: 0,
    leftInvites: 0,
    verificationStatus: 'UNVERIFIED'
  });

  useEffect(() => {
    const cleanup = fetchMembers();
    return cleanup;
  }, [page, search, statusFilter]);

  const fetchMembers = () => {
    const delayDebounce = setTimeout(() => {
      setLoading(true);
      api.getMembers(page, search, statusFilter)
        .then(data => {
          setMembers(data.data || []);
          setTotalPages(Math.ceil(data.total / data.limit) || 1);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(delayDebounce);
  };

  const handleSaveEdit = () => {
    if (!editingMember) return;
    api.updateMember(editingMember.userId, editForm)
      .then(() => {
        setEditingMember(null);
        fetchMembers();
      })
      .catch(console.error);
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Members</h1>
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <button 
          className={statusFilter === 'current' ? 'btn primary' : 'btn outline'} 
          onClick={() => { setStatusFilter('current'); setPage(1); }}
        >
          Current Members
        </button>
        <button 
          className={statusFilter === 'left' ? 'btn primary' : 'btn outline'} 
          onClick={() => { setStatusFilter('left'); setPage(1); }}
        >
          Left Members
        </button>
      </div>

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
                {statusFilter === 'left' ? (
                  <>
                    <th>Invited By</th>
                    <th>Left At</th>
                  </>
                ) : (
                  <>
                    <th>XP / Level</th>
                    <th>Submissions</th>
                    <th>Invites (Valid)</th>
                  </>
                )}
                <th>Actions</th>
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
                          {member.user?.avatarUrl ? (
                            <img 
                              src={member.user.avatarUrl} 
                              alt={member.user.username} 
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                            />
                          ) : (
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold'
                            }}>
                              {(member.user?.username || '?')[0].toUpperCase()}
                            </div>
                          )}
                          {member.user?.username || 'Unknown'}
                        </div>
                      </td>
                      <td>
                        {member.verificationStatus === 'VERIFIED' ? 
                          <span className="badge active">Verified</span> : 
                          <span className="badge error">Unverified</span>
                        }
                      </td>
                      {statusFilter === 'left' ? (
                        <>
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
                          <td>{member.leftAt ? new Date(member.leftAt).toLocaleDateString() : 'Unknown'}</td>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                      <td>
                        <button 
                          className="btn outline" 
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => {
                            setEditingMember(member);
                            setEditForm({
                              bonusInvites: member.bonusInvites || 0,
                              totalInvites: member.totalInvites || 0,
                              fakeInvites: member.fakeInvites || 0,
                              leftInvites: member.leftInvites || 0,
                              verificationStatus: member.verificationStatus || 'UNVERIFIED'
                            });
                          }}
                        >
                          Edit
                        </button>
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

      {editingMember && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-card" style={{
            width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column',
            padding: '24px', borderRadius: '16px', backgroundColor: 'var(--bg-color)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Edit {editingMember.user?.username || 'Member'}</h2>
              <button 
                onClick={() => setEditingMember(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px' }}
              >×</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Bonus Invites</label>
                <input 
                  type="number" 
                  value={editForm.bonusInvites}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bonusInvites: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Total Invites (Raw)</label>
                <input 
                  type="number" 
                  value={editForm.totalInvites}
                  onChange={(e) => setEditForm(prev => ({ ...prev, totalInvites: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Fake Invites</label>
                <input 
                  type="number" 
                  value={editForm.fakeInvites}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fakeInvites: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Left Invites</label>
                <input 
                  type="number" 
                  value={editForm.leftInvites}
                  onChange={(e) => setEditForm(prev => ({ ...prev, leftInvites: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Verification Status</label>
                <select 
                  value={editForm.verificationStatus}
                  onChange={(e) => setEditForm(prev => ({ ...prev, verificationStatus: e.target.value }))}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}
                >
                  <option value="VERIFIED">Verified</option>
                  <option value="UNVERIFIED">Unverified</option>
                </select>
              </div>

              <button 
                className="btn primary" 
                style={{ marginTop: '16px' }}
                onClick={handleSaveEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
