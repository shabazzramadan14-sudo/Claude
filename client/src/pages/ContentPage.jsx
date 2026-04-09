import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contentAPI } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';
import FollowButton from '../components/FollowButton';
import PurchaseModal from '../components/PurchaseModal';

export default function ContentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPurchase, setShowPurchase] = useState(false);

  useEffect(() => {
    contentAPI.get(id)
      .then(({ data }) => setContent(data.content))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!content) return null;

  const hasAccess = content.hasAccess;
  const provider = content.provider;
  const videoSrc = hasAccess ? content.video?.url : content.video?.previewUrl;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60, maxWidth: 900 }}>
      {/* Player */}
      {videoSrc ? (
        <VideoPlayer src={videoSrc} poster={content.video?.thumbnailUrl} controls autoPlay={false} />
      ) : (
        <div style={{
          paddingBottom: '56.25%', position: 'relative',
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius)'
        }}>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16
          }}>
            <span style={{ fontSize: 64 }}>🔒</span>
            <div style={{ fontWeight: 700, fontSize: 20 }}>Unlock this POV Experience</div>
            <div style={{ color: 'var(--text-secondary)' }}>
              One-time purchase for ${content.pricing?.price?.toFixed(2)}
            </div>
            <button className="btn btn-primary" onClick={() => setShowPurchase(true)} style={{ fontSize: 16, padding: '12px 32px' }}>
              Purchase — ${content.pricing?.price?.toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {!hasAccess && videoSrc && (
        <div style={{
          marginTop: 12, padding: '12px 16px', background: 'rgba(108,99,255,0.1)',
          border: '1px solid rgba(108,99,255,0.2)', borderRadius: 'var(--radius-sm)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Watching 30-second preview</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Purchase to watch the full {formatDuration(content.video?.duration || 0)} experience
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowPurchase(true)}>
            Unlock ${content.pricing?.price?.toFixed(2)}
          </button>
        </div>
      )}

      {/* Metadata */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {content.pricing?.isFree
            ? <span className="badge badge-free">FREE</span>
            : <span className="badge badge-premium">PREMIUM</span>
          }
          <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {content.category}
          </span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>{content.title}</h1>

        {content.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            {content.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
          <span>👁 {(content.stats?.viewCount || 0).toLocaleString()} views</span>
          <span>🛒 {(content.stats?.purchaseCount || 0).toLocaleString()} purchases</span>
          {content.video?.duration && <span>⏱ {formatDuration(content.video.duration)}</span>}
        </div>

        {/* Provider */}
        {provider && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 16, background: 'var(--bg-card)', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 22, color: '#fff'
              }}>
                {provider.stageName?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {provider.stageName}
                  {provider.isVerified && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>✓</span>}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {provider.bio?.slice(0, 80) || 'POV content creator'}
                </div>
              </div>
            </div>
            <FollowButton providerId={provider._id} />
          </div>
        )}
      </div>

      {showPurchase && (
        <PurchaseModal
          item={content}
          itemType="content"
          onSuccess={() => window.location.reload()}
          onClose={() => setShowPurchase(false)}
        />
      )}
    </div>
  );
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
