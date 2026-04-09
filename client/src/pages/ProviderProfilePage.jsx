import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { providersAPI } from '../services/api';
import ContentCard from '../components/ContentCard';
import FollowButton from '../components/FollowButton';
import LiveBadge from '../components/LiveBadge';

export default function ProviderProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('videos');

  useEffect(() => {
    providersAPI.get(id)
      .then(({ data }) => setData(data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!data) return null;

  const { provider, recentContent, streams } = data;
  const liveStream = streams?.find(s => s.status === 'live');

  return (
    <div>
      {/* Cover */}
      <div style={{
        height: 220,
        background: provider.coverImage
          ? `url(${provider.coverImage}) center/cover`
          : 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        position: 'relative'
      }}>
        {provider.isLive && (
          <div style={{ position: 'absolute', bottom: 16, right: 16 }}>
            <LiveBadge viewers={provider.currentStreamId?.stats?.currentViewers} />
          </div>
        )}
      </div>

      <div className="container" style={{ paddingBottom: 60 }}>
        {/* Profile header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          marginTop: -32, marginBottom: 32, flexWrap: 'wrap', gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', border: '4px solid var(--bg-primary)',
              background: provider.avatar ? `url(${provider.avatar}) center/cover` : 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 800, color: '#fff', flexShrink: 0
            }}>
              {!provider.avatar && provider.stageName?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800 }}>{provider.stageName}</h1>
                {provider.isVerified && (
                  <span style={{
                    background: 'var(--accent)', color: '#fff', borderRadius: '50%',
                    width: 20, height: 20, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12
                  }}>✓</span>
                )}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                @{provider.user?.username}
              </div>
            </div>
          </div>

          <FollowButton providerId={provider._id} />
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex', gap: 32, padding: '16px 20px',
          background: 'var(--bg-card)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)', marginBottom: 32
        }}>
          {[
            { label: 'Followers', value: fmtNum(provider.stats?.totalFollowers || 0) },
            { label: 'Total Views', value: fmtNum(provider.stats?.totalViews || 0) },
            { label: 'Content', value: provider.stats?.totalContent || 0 },
            { label: 'Streams', value: provider.stats?.totalStreams || 0 }
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{value}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</div>
            </div>
          ))}
          {provider.isLive && (
            <div style={{ marginLeft: 'auto' }}>
              <LiveBadge />
            </div>
          )}
        </div>

        {/* Bio and categories */}
        {provider.bio && (
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20, maxWidth: 640 }}>
            {provider.bio}
          </p>
        )}

        {provider.categories?.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            {provider.categories.map(cat => (
              <span key={cat} style={{
                padding: '4px 12px', borderRadius: 20,
                background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                fontSize: 12, textTransform: 'capitalize', border: '1px solid var(--border)'
              }}>
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Live now banner */}
        {liveStream && (
          <div style={{
            background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)',
            borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 32,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <LiveBadge viewers={liveStream.stats?.currentViewers} />
              <span style={{ fontWeight: 600 }}>{liveStream.title}</span>
            </div>
            <a href={`/stream/${liveStream._id}`} className="btn btn-danger" style={{ fontSize: 13 }}>
              Watch Now
            </a>
          </div>
        )}

        {/* Content tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
          {['videos', 'streams'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 20px', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'videos' && (
          <div className="grid-cards">
            {recentContent?.map(c => <ContentCard key={c._id} item={c} type="content" />)}
            {!recentContent?.length && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                No videos published yet
              </div>
            )}
          </div>
        )}

        {tab === 'streams' && (
          <div className="grid-cards">
            {streams?.map(s => <ContentCard key={s._id} item={s} type="stream" />)}
            {!streams?.length && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                No streams yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtNum(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
