import { useState, useEffect } from 'react';
import { api } from '../api';

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  rank: number;
  // Invites fields
  totalInvites?: number;
  bonusInvites?: number;
  leftInvites?: number;
  fakeInvites?: number;
  validInvites?: number;
  // XP fields
  totalXp?: number;
  level?: number;
  // Submissions fields
  totalSubmissions?: number;
  approvedSubmissions?: number;
}

interface InviteDetail {
  inviteeId: string;
  username: string;
  avatarUrl?: string | null;
  status: 'VALID' | 'LEFT' | 'FAKE';
  accountAgeDays?: number | null;
  isFake: boolean;
  fakeReason?: string | null;
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'invites' | 'xp' | 'submissions'>('invites');
  const [leaderboards, setLeaderboards] = useState<{
    xpLeaderboard: LeaderboardEntry[];
    submissionLeaderboard: LeaderboardEntry[];
    inviteLeaderboard: LeaderboardEntry[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedUserForInvites, setSelectedUserForInvites] = useState<string | null>(null);
  const [invitesData, setInvitesData] = useState<InviteDetail[] | null>(null);
  const [invitesLoading, setInvitesLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getLeaderboards()
      .then(data => {
        setLeaderboards(data);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load leaderboards.');
      })
      .finally(() => setLoading(false));
  }, []);

  const openInvitesModal = (userId: string) => {
    setSelectedUserForInvites(userId);
    setInvitesData(null);
    setInvitesLoading(true);
    api.getUserInvites(userId)
      .then(data => setInvitesData(data))
      .catch(err => console.error('Failed to fetch invites:', err))
      .finally(() => setInvitesLoading(false));
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading leaderboards...</div>;
  }

  if (error || !leaderboards) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--error)' }}>{error || 'No data available.'}</div>;
  }

  const getActiveData = (): LeaderboardEntry[] => {
    switch (activeTab) {
      case 'xp':
        return leaderboards.xpLeaderboard;
      case 'submissions':
        return leaderboards.submissionLeaderboard;
      case 'invites':
      default:
        return leaderboards.inviteLeaderboard;
    }
  };

  const activeData = getActiveData();
  const topThree = activeData.slice(0, 3);
  const others = activeData.slice(3);

  // Helper to render podium scores
  const renderScore = (entry: LeaderboardEntry) => {
    if (activeTab === 'invites') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>
            {entry.validInvites} Valid
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {entry.totalInvites}T / {entry.bonusInvites}B / {entry.leftInvites}L / {entry.fakeInvites}F
          </div>
        </div>
      );
    } else if (activeTab === 'xp') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'hsl(45, 93%, 58%)' }}>
            {entry.totalXp} XP
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Level {entry.level}
          </div>
        </div>
      );
    } else {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'hsl(160, 84%, 39%)' }}>
            {entry.totalSubmissions} Clips
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {entry.approvedSubmissions} Approved
          </div>
        </div>
      );
    }
  };

  // Podium gradients
  const getPodiumStyle = (rank: number) => {
    if (rank === 1) {
      return {
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.03) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        boxShadow: '0 8px 32px 0 rgba(255, 215, 0, 0.08)'
      };
    }
    if (rank === 2) {
      return {
        background: 'linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(192, 192, 192, 0.03) 100%)',
        border: '1px solid rgba(192, 192, 192, 0.3)',
        boxShadow: '0 8px 32px 0 rgba(192, 192, 192, 0.05)'
      };
    }
    return {
      background: 'linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(205, 127, 50, 0.03) 100%)',
      border: '1px solid rgba(205, 127, 50, 0.3)',
      boxShadow: '0 8px 32px 0 rgba(205, 127, 50, 0.05)'
    };
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    return '🥉';
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>🏆 Server Leaderboards</h1>
          <p style={{ marginTop: '4px' }}>See the top performers across invites, activity, and XP.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
        <button 
          className={activeTab === 'invites' ? '' : 'secondary'} 
          onClick={() => setActiveTab('invites')}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          📩 Invite Leaderboard
        </button>
        <button 
          className={activeTab === 'xp' ? '' : 'secondary'} 
          onClick={() => setActiveTab('xp')}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          ✨ XP Leaderboard
        </button>
        <button 
          className={activeTab === 'submissions' ? '' : 'secondary'} 
          onClick={() => setActiveTab('submissions')}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          🎬 Submissions Leaderboard
        </button>
      </div>

      {activeData.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No leaderboard data currently available for this section.
        </div>
      ) : (
        <>
          {/* Podium for Top 3 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '24px', 
            marginBottom: '32px',
            alignItems: 'end'
          }}>
            {/* 2nd Place */}
            {topThree[1] && (
              <div 
                className="glass-card" 
                onClick={() => activeTab === 'invites' && openInvitesModal(topThree[1].userId)}
                style={{ 
                  ...getPodiumStyle(2), 
                  padding: '24px', 
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: activeTab === 'invites' ? 'pointer' : 'default'
                }}
              >
                <div style={{ fontSize: '32px' }}>{getMedalEmoji(2)}</div>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                  border: '2px solid rgba(192, 192, 192, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', fontWeight: 'bold', color: 'rgba(192, 192, 192, 1)'
                }}>
                  {topThree[1].username[0].toUpperCase()}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '18px', textAlign: 'center' }}>
                  {topThree[1].username}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  ID: {topThree[1].userId}
                </div>
                <div style={{ marginTop: '8px', width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                  {renderScore(topThree[1])}
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div 
                className="glass-card" 
                onClick={() => activeTab === 'invites' && openInvitesModal(topThree[0].userId)}
                style={{ 
                  ...getPodiumStyle(1), 
                  padding: '32px 24px', 
                  borderRadius: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  transform: 'scale(1.03)',
                  zIndex: 2,
                  cursor: activeTab === 'invites' ? 'pointer' : 'default'
                }}
              >
                <div style={{ fontSize: '40px' }}>{getMedalEmoji(1)}</div>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                  border: '3px solid rgba(255, 215, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px', fontWeight: 'bold', color: 'rgba(255, 215, 0, 1)'
                }}>
                  {topThree[0].username[0].toUpperCase()}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '22px', textAlign: 'center', color: '#FFD700' }}>
                  {topThree[0].username}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  ID: {topThree[0].userId}
                </div>
                <div style={{ marginTop: '8px', width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                  {renderScore(topThree[0])}
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div 
                className="glass-card" 
                onClick={() => activeTab === 'invites' && openInvitesModal(topThree[2].userId)}
                style={{ 
                  ...getPodiumStyle(3), 
                  padding: '20px 24px', 
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: activeTab === 'invites' ? 'pointer' : 'default'
                }}
              >
                <div style={{ fontSize: '28px' }}>{getMedalEmoji(3)}</div>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                  border: '2px solid rgba(205, 127, 50, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', fontWeight: 'bold', color: 'rgba(205, 127, 50, 1)'
                }}>
                  {topThree[2].username[0].toUpperCase()}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', textAlign: 'center' }}>
                  {topThree[2].username}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  ID: {topThree[2].userId}
                </div>
                <div style={{ marginTop: '8px', width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                  {renderScore(topThree[2])}
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Table (Ranks 4-50) */}
          {others.length > 0 && (
            <div className="glass-card" style={{ padding: '0', overflowX: 'auto', marginTop: '40px' }}>
              <h3 style={{ padding: '20px 24px 10px', margin: 0, fontSize: '16px' }}>Runners Up</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '80px', paddingLeft: '24px' }}>Rank</th>
                    <th>User ID</th>
                    <th>Username</th>
                    {activeTab === 'invites' && (
                      <>
                        <th>Valid Invites</th>
                        <th style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Invite Breakdown (Total / Bonus / Left / Fake)</th>
                      </>
                    )}
                    {activeTab === 'xp' && (
                      <>
                        <th>XP Score</th>
                        <th>Level</th>
                      </>
                    )}
                    {activeTab === 'submissions' && (
                      <>
                        <th>Total Clips</th>
                        <th>Approved</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {others.map(entry => (
                    <tr 
                      key={entry.userId} 
                      onClick={() => activeTab === 'invites' && openInvitesModal(entry.userId)}
                      style={{ cursor: activeTab === 'invites' ? 'pointer' : 'default' }}
                      className={activeTab === 'invites' ? 'row-hover' : ''}
                    >
                      <td style={{ fontWeight: 'bold', paddingLeft: '24px', color: 'var(--text-secondary)' }}>
                        #{entry.rank}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{entry.userId}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%', background: 'var(--glass-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold'
                          }}>
                            {entry.username[0].toUpperCase()}
                          </div>
                          {entry.username}
                        </div>
                      </td>
                      {activeTab === 'invites' && (
                        <>
                          <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                            {entry.validInvites}
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {entry.totalInvites} Total, {entry.bonusInvites} Bonus, {entry.leftInvites} Left, {entry.fakeInvites} Fake
                          </td>
                        </>
                      )}
                      {activeTab === 'xp' && (
                        <>
                          <td style={{ fontWeight: 'bold', color: 'hsl(45, 93%, 58%)' }}>
                            {entry.totalXp} XP
                          </td>
                          <td>Lvl {entry.level}</td>
                        </>
                      )}
                      {activeTab === 'submissions' && (
                        <>
                          <td style={{ fontWeight: 'bold', color: 'hsl(160, 84%, 39%)' }}>
                            {entry.totalSubmissions}
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {entry.approvedSubmissions} approved
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Invites Detail Modal */}
      {selectedUserForInvites && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{
            width: '90%', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            padding: '24px', borderRadius: '16px', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Invites Detail</h2>
              <button onClick={() => setSelectedUserForInvites(null)} style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '24px'
              }}>&times;</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
              {invitesLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading invites...</div>
              ) : invitesData && invitesData.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Status</th>
                      <th>Account Age</th>
                      <th>Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitesData.map(inv => (
                      <tr key={inv.inviteeId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '50%', background: 'var(--glass-border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'
                            }}>
                              {inv.username[0].toUpperCase()}
                            </div>
                            {inv.username}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                            backgroundColor: inv.status === 'VALID' ? 'rgba(46, 204, 113, 0.2)' : 
                                           inv.status === 'LEFT' ? 'rgba(231, 76, 60, 0.2)' : 'rgba(241, 196, 15, 0.2)',
                            color: inv.status === 'VALID' ? '#2ecc71' : 
                                   inv.status === 'LEFT' ? '#e74c3c' : '#f1c40f'
                          }}>
                            {inv.isFake ? 'FAKE' : inv.status}
                          </span>
                          {inv.isFake && inv.fakeReason && (
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {inv.fakeReason}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          {inv.accountAgeDays !== null && inv.accountAgeDays !== undefined 
                            ? `${inv.accountAgeDays} days old` 
                            : 'Unknown'}
                        </td>
                        <td>
                          <a 
                            href={`https://discord.com/users/${inv.inviteeId}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '13px' }}
                          >
                            View Profile
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No invites found for this user.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
