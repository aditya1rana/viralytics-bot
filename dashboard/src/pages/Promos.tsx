import { useState, useEffect } from 'react';
import { api } from '../api';

interface PromoOffer {
  id: string;
  guildId: string;
  submittedById: string;
  contactName: string | null;
  contactId: string | null;
  services: string | null;
  pricing: string | null;
  rawMessage: string;
  createdAt: string;
  submittedBy: {
    username: string;
    avatarUrl: string | null;
  };
}

export default function Promos() {
  const [promos, setPromos] = useState<PromoOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPromo, setSelectedPromo] = useState<PromoOffer | null>(null);

  useEffect(() => {
    api.getPromos()
      .then(data => {
        setPromos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch promos:', err);
        setError('Failed to load promotional offers');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading promo offers...</div>;
  }

  if (error) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#f87171' }}>{error}</div>;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>dY"? Promo Teams</h1>
          <p style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>Log of promotional offers captured from DMs.</p>
        </div>
      </div>

      {promos.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No promotional offers logged yet. Use <code>/addpromo</code> in Discord to add one.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {promos.map(promo => (
            <div key={promo.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--primary)' }}>
                  {promo.contactName || 'Unknown Contact'}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {new Date(promo.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Services:</strong>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>{promo.services}</div>
              </div>
              
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pricing:</strong>
                <div style={{ fontSize: '14px', marginTop: '4px', color: '#4ade80' }}>{promo.pricing}</div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {promo.submittedBy?.avatarUrl ? (
                    <img src={promo.submittedBy.avatarUrl} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--glass-border)' }}></div>
                  )}
                  Added by {promo.submittedBy?.username}
                </div>
                
                <button 
                  className="secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => setSelectedPromo(promo)}
                >
                  View Original
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPromo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedPromo(null);
        }}>
          <div className="glass-card" style={{
            width: '90%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            padding: '24px', borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Original Message</h2>
              <button onClick={() => setSelectedPromo(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '24px' }}>&times;</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '13px' }}>
              {selectedPromo.rawMessage}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
