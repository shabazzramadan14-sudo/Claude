import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchasesAPI, followsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ContentCard from '../components/ContentCard';
import ProviderCard from '../components/ProviderCard';

export default function MyLibraryPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('purchases');
  const [purchases, setPurchases] = useState([]);
  const [follows, setFollows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/auth'); return; }
    Promise.all([
      purchasesAPI.myPurchases(),
      followsAPI.myFollows()
    ]).then(([pRes, fRes]) => {
      setPurchases(pRes.data.purchases || []);
      setFollows(fRes.data.follows || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isLoggedIn, navigate]);

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 28 }}>My Library</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'purchases', label: `🛒 Purchased (${purchases.length})` },
          { key: 'following', label: `❤️ Following (${follows.length})` }
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '12px 20px', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
            color: tab === key ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
          }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'purchases' && (
        purchases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No purchases yet</div>
            <div>Browse content and purchase your first POV experience!</div>
          </div>
        ) : (
          <div className="grid-cards">
            {purchases.map(p => {
              const item = p.stream || p.content;
              if (!item) return null;
              const type = p.itemType;
              // Synthesize hasAccess for display
              return <ContentCard key={p._id} item={{ ...item, hasAccess: true }} type={type} />;
            })}
          </div>
        )
      )}

      {tab === 'following' && (
        follows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🕶️</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Not following anyone yet</div>
            <div>Follow your favorite POV providers to see them here.</div>
          </div>
        ) : (
          <div className="grid-providers">
            {follows.map(f => f.provider && <ProviderCard key={f._id} provider={f.provider} />)}
          </div>
        )
      )}
    </div>
  );
}
