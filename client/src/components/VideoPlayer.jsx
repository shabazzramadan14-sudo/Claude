import React, { useRef, useEffect, useState } from 'react';

/**
 * VideoPlayer — wraps an HLS/mp4 URL.
 * For HLS streams (ArgoLive CDN), loads hls.js if available.
 * Falls back to native <video> for MP4.
 */
export default function VideoPlayer({ src, poster, autoPlay = false, controls = true, onEnded }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [hlsLoaded, setHlsLoaded] = useState(false);

  useEffect(() => {
    if (!src) return;
    const video = videoRef.current;

    const isHls = src.includes('.m3u8');

    if (isHls) {
      // Dynamically load HLS.js
      import('hls.js').then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setHlsLoaded(true);
            if (autoPlay) video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) setError('Stream unavailable');
          });
          return () => hls.destroy();
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS (Safari)
          video.src = src;
          if (autoPlay) video.play().catch(() => {});
        }
      }).catch(() => {
        // hls.js not available, try native
        video.src = src;
        if (autoPlay) video.play().catch(() => {});
      });
    } else {
      video.src = src;
      if (autoPlay) video.play().catch(() => {});
    }
  }, [src, autoPlay]);

  if (!src) {
    return (
      <div style={{
        width: '100%', paddingBottom: '56.25%', position: 'relative',
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius)'
      }}>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12, color: 'var(--text-muted)'
        }}>
          <span style={{ fontSize: 48 }}>🕶️</span>
          <span>No stream available</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: '100%', paddingBottom: '56.25%', position: 'relative',
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius)'
      }}>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8, color: 'var(--live-red)'
        }}>
          <span>⚠️ {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', position: 'relative', background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <video
        ref={videoRef}
        poster={poster}
        controls={controls}
        playsInline
        onEnded={onEnded}
        onError={() => setError('Failed to load video')}
        style={{ width: '100%', display: 'block', maxHeight: '70vh' }}
      />
    </div>
  );
}
