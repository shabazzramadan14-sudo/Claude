import React from 'react';
import { Link } from 'react-router-dom';
import LiveBadge from './LiveBadge';

const LockIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

// Accepts both Stream and Content objects
export default function ContentCard({ item, type = 'content' }) {
  const isStream = type === 'stream';
  const isLive = isStream && item.status === 'live';
  const thumbnail = item.thumbnail || item.video?.thumbnailUrl || null;
  const price = item.pricing?.price;
  const isFree = item.pricing?.isFree;
  const viewCount = item.stats?.viewCount || 0;
  const provider = item.provider;
  const to = isStream ? `/stream/${item._id}` : `/content/${item._id}`;

  return (
    <Link to={to} className="card" style={{ display: 'block', textDecoration: 'none' }}>
      {/* Thumbnail */}
      <div style={{ position: 'relative', paddingBottom: '56.25%', background: 'var(--bg-elevated)' }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={item.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            fontSize: 40
          }}>
            🕶️
          </div>
        )}

        {/* Overlays */}
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          {isLive
            ? <LiveBadge viewers={item.stats?.currentViewers} />
            : isFree
              ? <span className="badge badge-free">FREE</span>
              : <span className="badge badge-premium">PREMIUM</span>
          }
        </div>

        {!item.hasAccess && !isFree && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.8)', borderRadius: 8, padding: '8px 16px',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600
            }}>
              <LockIcon />
              ${price?.toFixed(2)}
            </div>
          </div>
        )}

        {/* Duration */}
        {!isLive && item.video?.duration && (
          <div style={{
            position: 'absolute', bottom: 6, right: 6,
            background: 'rgba(0,0,0,0.75)', borderRadius: 4,
            padding: '2px 6px', fontSize: 12, fontWeight: 600
          }}>
            {formatDuration(item.video.duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, lineHeight: 1.4 }}>
          {item.title}
        </div>

        {provider && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0
            }}>
              {provider.stageName?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {provider.stageName}
              {provider.isVerified && ' ✓'}
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12 }}>
              <EyeIcon />{formatCount(viewCount)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatCount(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
