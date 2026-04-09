import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { providersAPI, contentAPI, streamsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ShadesRecorder from '../components/ShadesRecorder';
import ContentCard from '../components/ContentCard';

export default function ProviderDashboard() {
  const { user, provider, isProvider, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [dashData, setDashData] = useState(null);
  const [tab, setTab] = useState('stream');
  const [loading, setLoading] = useState(true);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', category: 'other', isFree: false, price: '4.99', videoUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [connectForm, setConnectForm] = useState({ deviceId: '', model: '' });
  const [connecting, setConnecting] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState(false);

  useEffect(() => {
    if (!isProvider) { navigate('/'); return; }
    providersAPI.dashboard()
      .then(({ data }) => setDashData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isProvider, navigate]);

  const handleConnectArgoLive = async (e) => {
    e.preventDefault();
    setConnecting(true);
    try {
      await providersAPI.connectArgoLive(connectForm);
      setConnectSuccess(true);
      await refreshUser();
    } catch (err) {
      alert(err.response?.data?.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleUploadContent = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      await contentAPI.create({
        title: uploadForm.title,
        description: uploadForm.description,
        category: uploadForm.category,
        pricing: { isFree: uploadForm.isFree, price: parseFloat(uploadForm.price) },
        video: { url: uploadForm.videoUrl, thumbnailUrl: '' }
      });
      setUploadSuccess(true);
      setUploadForm({ title: '', description: '', category: 'other', isFree: false, price: '4.99', videoUrl: '' });
      // Refresh dashboard
      const { data } = await providersAPI.dashboard();
      setDashData(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  const stats = dashData?.stats || {};
  const argoConnected = provider?.argoLive?.isConnected;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Provider Dashboard</h1>
          <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>🕶️ {provider?.stageName}</div>
        </div>
        {provider?.isLive && (
          <div style={{
            background: 'rgba(255,59,48,0.15)', border: '1px solid var(--live-red)',
            color: 'var(--live-red)', padding: '6px 16px', borderRadius: 20,
            fontWeight: 700, fontSize: 13
          }}>
            ● CURRENTLY LIVE
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 36 }}>
        {[
          { label: 'Followers', value: fmtNum(stats.followerCount || 0), icon: '👥' },
          { label: 'Total Views', value: fmtNum(stats.totalViews || 0), icon: '👁' },
          { label: 'Total Earnings', value: `$${(stats.totalEarnings || 0).toFixed(2)}`, icon: '💰' },
          { label: 'Content Published', value: stats.contentCount || 0, icon: '🎬' },
          { label: 'Total Streams', value: stats.streamCount || 0, icon: '📡' }
        ].map(({ label, value, icon }) => (
          <div key={label} className="card" style={{ padding: '20px', cursor: 'default' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'stream', label: '📡 Go Live' },
          { key: 'upload', label: '🎬 Upload Content' },
          { key: 'content', label: '📋 My Content' },
          { key: 'settings', label: '⚙️ Settings' }
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

      {/* Go Live Tab */}
      {tab === 'stream' && (
        <div style={{ maxWidth: 560 }}>
          {!argoConnected ? (
            <div style={{
              background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)',
              borderRadius: 'var(--radius)', padding: 24, marginBottom: 24
            }}>
              <h3 style={{ marginBottom: 8 }}>🕶️ Connect Your Shades</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                Connect your smart shades to ArgoLive to start streaming POV content.
              </p>
              <form onSubmit={handleConnectArgoLive} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" placeholder="Device ID (from your shades)" value={connectForm.deviceId} onChange={e => setConnectForm(p => ({ ...p, deviceId: e.target.value }))} />
                <input className="input" placeholder="Shades model (e.g. ArgoShades Pro 2)" value={connectForm.model} onChange={e => setConnectForm(p => ({ ...p, model: e.target.value }))} />
                <button type="submit" className="btn btn-primary" disabled={connecting} style={{ justifyContent: 'center' }}>
                  {connecting ? 'Connecting…' : '🔗 Connect to ArgoLive'}
                </button>
              </form>
              {connectSuccess && <div style={{ color: 'var(--success)', marginTop: 12, fontSize: 14 }}>✅ ArgoLive connected!</div>}
            </div>
          ) : (
            <div style={{
              background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13,
              display: 'flex', gap: 8, alignItems: 'center'
            }}>
              <span>✅</span>
              <span style={{ color: 'var(--success)' }}>
                ArgoLive connected — RTMP: <code style={{ fontSize: 11 }}>{provider?.argoLive?.rtmpUrl?.slice(0, 40)}…</code>
              </span>
            </div>
          )}

          <ShadesRecorder
            provider={provider}
            onStreamStarted={(stream) => {
              console.log('Stream started:', stream._id);
            }}
            onStreamEnded={(stream) => {
              console.log('Stream ended:', stream._id);
            }}
          />
        </div>
      )}

      {/* Upload Tab */}
      {tab === 'upload' && (
        <div style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Upload Pre-recorded POV Content</h2>
          {uploadSuccess && (
            <div style={{ background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: 'var(--success)' }}>
              ✅ Content uploaded and published successfully!
            </div>
          )}
          <form onSubmit={handleUploadContent} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Video URL (ArgoLive CDN or direct)</label>
              <input className="input" placeholder="https://cdn.argolive.io/…/playlist.m3u8" value={uploadForm.videoUrl} onChange={e => setUploadForm(p => ({ ...p, videoUrl: e.target.value }))} required />
            </div>
            <input className="input" placeholder="Content title" value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))} required />
            <textarea className="input" placeholder="Description" rows={3} value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
            <select className="input" value={uploadForm.category} onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}>
              {['sports','adventure','travel','cooking','fitness','music','gaming','lifestyle','education','other'].map(c =>
                <option key={c} value={c} style={{ background: 'var(--bg-elevated)', textTransform: 'capitalize' }}>{c}</option>
              )}
            </select>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={uploadForm.isFree} onChange={e => setUploadForm(p => ({ ...p, isFree: e.target.checked }))} />
                Free content
              </label>
              {!uploadForm.isFree && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Price $</span>
                  <input className="input" type="number" min="0.99" step="0.01" value={uploadForm.price} onChange={e => setUploadForm(p => ({ ...p, price: e.target.value }))} style={{ width: 80 }} />
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={uploading} style={{ justifyContent: 'center' }}>
              {uploading ? 'Publishing…' : '🎬 Publish Content'}
            </button>
          </form>
        </div>
      )}

      {/* My Content Tab */}
      {tab === 'content' && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>My Published Content</h2>
          {dashData?.recentContent?.length > 0 ? (
            <div className="grid-cards">
              {dashData.recentContent.map(c => <ContentCard key={c._id} item={c} type="content" />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
              <div>No content published yet. Upload your first POV video!</div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Provider Settings</h2>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>ArgoLive Stream Key</h3>
            {argoConnected ? (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Configure these on your shades device:
                </div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>RTMP URL:</div>
                  <div style={{ marginBottom: 12 }}>{provider?.argoLive?.rtmpUrl}</div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Stream Key:</div>
                  <div>{'•'.repeat(32)}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                Connect your shades device from the "Go Live" tab to get your stream key.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtNum(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
