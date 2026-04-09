import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ContentCard from '../components/ContentCard';
import ProviderCard from '../components/ProviderCard';
import { streamsAPI, contentAPI, providersAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

const categories = ['All', 'Sports', 'Adventure', 'Travel', 'Cooking', 'Fitness', 'Music', 'Gaming', 'Lifestyle'];

export default function HomePage() {
  const [liveStreams, setLiveStreams] = useState([]);
  const [recentContent, setRecentContent] = useState([]);
  const [featuredProviders, setFeaturedProviders] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const { on, off } = useSocket();

  const fetchData = async (category) => {
    setLoading(true);
    const params = category && category !== 'All' ? { category: category.toLowerCase() } : {};
    try {
      const [liveRes, contentRes, providersRes] = await Promise.all([
        streamsAPI.list({ ...params, type: 'live', limit: 6 }),
        contentAPI.list({ ...params, limit: 12 }),
        providersAPI.list({ limit: 8, live: category === 'All' ? undefined : undefined })
      ]);
      setLiveStreams(liveRes.data.streams || []);
      setRecentContent(contentRes.data.content || []);
      setFeaturedProviders(providersRes.data.providers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(activeCategory); }, [activeCategory]);

  // Update live streams when a provider goes live
  useEffect(() => {
    const handler = () => fetchData(activeCategory);
    on('providerLive', handler);
    return () => off('providerLive', handler);
  }, [activeCategory, on, off]);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(240,147,251,0.1) 100%)',
        border: '1px solid rgba(108,99,255,0.2)', borderRadius: 20,
        padding: '48px 40px', marginBottom: 48, textAlign: 'center'
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🕶️</div>
        <h1 style={{ fontSize: 40, fontWeight: 900, marginBottom: 12, letterSpacing: '-1px' }}>
          See the World Through<br />
          <span style={{ color: 'var(--accent)' }}>Their Eyes</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 18, maxWidth: 540, margin: '0 auto 28px' }}>
          Follow providers who stream POV content from their shades — live adventures, cooking, travel, and more.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/live" className="btn btn-primary" style={{ fontSize: 16, padding: '12px 28px' }}>
            Watch Live Now
          </Link>
          <Link to="/browse" className="btn btn-secondary" style={{ fontSize: 16, padding: '12px 28px' }}>
            Browse Content
          </Link>
        </div>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 32, paddingBottom: 4 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 500,
              background: activeCategory === cat ? 'var(--accent)' : 'var(--bg-elevated)',
              color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${activeCategory === cat ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : (
        <>
          {/* Live streams */}
          {liveStreams.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 className="section-title">
                  <span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--live-red)', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                  Live Now
                </h2>
                <Link to="/live" style={{ fontSize: 13, color: 'var(--accent)' }}>See all →</Link>
              </div>
              <div className="grid-cards">
                {liveStreams.map(stream => (
                  <ContentCard key={stream._id} item={stream} type="stream" />
                ))}
              </div>
            </section>
          )}

          {/* Featured providers */}
          {featuredProviders.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 className="section-title">🕶️ Top Providers</h2>
                <Link to="/browse?tab=providers" style={{ fontSize: 13, color: 'var(--accent)' }}>See all →</Link>
              </div>
              <div className="grid-providers">
                {featuredProviders.map(p => <ProviderCard key={p._id} provider={p} />)}
              </div>
            </section>
          )}

          {/* Recent content */}
          {recentContent.length > 0 && (
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 className="section-title">🎬 Latest POV Content</h2>
                <Link to="/browse" style={{ fontSize: 13, color: 'var(--accent)' }}>Browse all →</Link>
              </div>
              <div className="grid-cards">
                {recentContent.map(c => <ContentCard key={c._id} item={c} type="content" />)}
              </div>
            </section>
          )}

          {!liveStreams.length && !recentContent.length && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🕶️</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No content yet</div>
              <div>Be the first to stream!</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
