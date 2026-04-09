import React from 'react';
import { Link } from 'react-router-dom';
import FollowButton from './FollowButton';

export default function ProviderCard({ provider }) {
  return (
    <Link
      to={`/provider/${provider._id}`}
      className="card"
      style={{ display: 'block', textDecoration: 'none' }}
    >
      {/* Cover */}
      <div style={{
        height: 80, background: provider.coverImage
          ? `url(${provider.coverImage}) center/cover`
          : 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
        position: 'relative'
      }}>
        {provider.isLive && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'var(--live-red)', color: '#fff',
            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700
          }}>
            ● LIVE
          </div>
        )}
      </div>

      <div style={{ padding: '0 14px 14px' }}>
        {/* Avatar */}
        <div style={{ marginTop: -20, marginBottom: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: provider.avatar ? `url(${provider.avatar}) center/cover` : 'var(--accent)',
            border: '3px solid var(--bg-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff'
          }}>
            {!provider.avatar && provider.stageName?.[0]?.toUpperCase()}
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{provider.stageName}</span>
            {provider.isVerified && <span style={{ color: 'var(--accent)', fontSize: 13 }}>✓</span>}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
            {formatCount(provider.stats?.totalFollowers || 0)} followers
          </div>
        </div>

        {provider.categories?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {provider.categories.slice(0, 3).map(cat => (
              <span key={cat} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20,
                background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                textTransform: 'capitalize'
              }}>
                {cat}
              </span>
            ))}
          </div>
        )}

        <div onClick={e => e.preventDefault()}>
          <FollowButton providerId={provider._id} small />
        </div>
      </div>
    </Link>
  );
}

function formatCount(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
