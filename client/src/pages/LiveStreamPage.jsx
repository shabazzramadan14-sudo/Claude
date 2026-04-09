import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { streamsAPI } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';
import LiveBadge from '../components/LiveBadge';
import FollowButton from '../components/FollowButton';
import PurchaseModal from '../components/PurchaseModal';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function LiveStreamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinStream, leaveStream, sendChat, on, off } = useSocket();
  const [stream, setStream] = useState(null);
  const [viewers, setViewers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPurchase, setShowPurchase] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await streamsAPI.get(id);
        setStream(data.stream);
        setViewers(data.stream.stats?.currentViewers || 0);
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  useEffect(() => {
    if (!stream) return;
    joinStream(id);

    const viewerHandler = ({ count }) => setViewers(count);
    const chatHandler = (msg) => setChatMessages(prev => [...prev.slice(-99), msg]);
    const endedHandler = () => setStream(prev => prev ? { ...prev, status: 'ended' } : prev);

    on('viewerCountUpdate', viewerHandler);
    on('chatMessage', chatHandler);
    on('streamEnded', endedHandler);

    return () => {
      leaveStream(id);
      off('viewerCountUpdate', viewerHandler);
      off('chatMessage', chatHandler);
      off('streamEnded', endedHandler);
    };
  }, [stream, id, joinStream, leaveStream, on, off]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;
    sendChat(id, chatInput.trim());
    setChatInput('');
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!stream) return null;

  const isLive = stream.status === 'live';
  const provider = stream.provider;
  const hasAccess = stream.hasAccess;
  const hlsUrl = stream.argoLive?.hlsPlaybackUrl;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Main column */}
        <div>
          {/* Player */}
          {hasAccess ? (
            <VideoPlayer src={hlsUrl} poster={stream.thumbnail} autoPlay controls />
          ) : (
            <div style={{
              paddingBottom: '56.25%', position: 'relative',
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 20, backdropFilter: 'blur(4px)'
              }}>
                <div style={{ fontSize: 64 }}>🔒</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Unlock POV Stream</div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                    Get access for ${stream.pricing?.price?.toFixed(2)}
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowPurchase(true)} style={{ fontSize: 16, padding: '12px 32px' }}>
                    Purchase Access
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stream info */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {isLive && <LiveBadge viewers={viewers} />}
                  {stream.status === 'ended' && (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Stream ended</span>
                  )}
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{stream.title}</h1>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{stream.description}</div>
              </div>
              {!hasAccess && (
                <button className="btn btn-primary" onClick={() => setShowPurchase(true)}>
                  ${stream.pricing?.price?.toFixed(2)} Unlock
                </button>
              )}
            </div>

            {/* Provider info */}
            {provider && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 20, padding: 16, background: 'var(--bg-card)',
                borderRadius: 'var(--radius)', border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, fontSize: 20, color: '#fff'
                  }}>
                    {provider.stageName?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {provider.stageName}
                      {provider.isVerified && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>✓</span>}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      🕶️ Streaming POV from shades
                    </div>
                  </div>
                </div>
                <FollowButton providerId={provider._id} />
              </div>
            )}
          </div>
        </div>

        {/* Live chat */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column',
          height: 560
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>
            💬 Live Chat
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatMessages.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
                No messages yet. Say hi!
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0
                  }}>
                    {msg.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent)' }}>
                      {msg.username}
                    </span>{' '}
                    <span style={{ fontSize: 13 }}>{msg.message}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChat} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={user ? 'Send a message…' : 'Sign in to chat'}
              disabled={!user}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button type="submit" className="btn btn-primary" disabled={!user || !chatInput.trim()} style={{ padding: '8px 14px', fontSize: 13 }}>
              Send
            </button>
          </form>
        </div>
      </div>

      {showPurchase && (
        <PurchaseModal
          item={stream}
          itemType="stream"
          onSuccess={() => window.location.reload()}
          onClose={() => setShowPurchase(false)}
        />
      )}
    </div>
  );
}
