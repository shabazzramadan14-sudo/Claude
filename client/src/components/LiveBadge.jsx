import React from 'react';

export default function LiveBadge({ viewers }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="badge badge-live">
        <span style={{
          width: 6, height: 6, background: '#fff',
          borderRadius: '50%', animation: 'pulse 1.5s infinite'
        }} />
        LIVE
      </span>
      {viewers !== undefined && (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {viewers.toLocaleString()} watching
        </span>
      )}
    </div>
  );
}
