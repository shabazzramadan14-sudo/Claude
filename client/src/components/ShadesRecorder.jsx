import React, { useState, useRef, useEffect } from 'react';
import { streamsAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

/**
 * ShadesRecorder — simulates the provider's POV shades camera interface.
 * In production this would connect to the ArgoLive RTMP SDK via the shades device.
 * Here it uses the browser's getUserMedia API to capture from the webcam (simulating shades).
 */
export default function ShadesRecorder({ provider, onStreamStarted, onStreamEnded }) {
  const { socket } = useSocket();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | preview | live | recording | processing
  const [currentStream, setCurrentStream] = useState(null);
  const [duration, setDuration] = useState(0);
  const durationRef = useRef(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other',
    isFree: false,
    price: '4.99'
  });
  const [error, setError] = useState('');

  const startPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      streamRef.current = mediaStream;
      videoRef.current.srcObject = mediaStream;
      setStatus('preview');
      setError('');
    } catch (err) {
      setError('Could not access camera. Please allow camera permissions.');
    }
  };

  const stopPreview = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
  };

  const goLive = async () => {
    if (!form.title) { setError('Stream title is required'); return; }
    try {
      const { data } = await streamsAPI.create({
        title: form.title,
        description: form.description,
        category: form.category,
        type: 'live',
        pricing: { isFree: form.isFree, price: parseFloat(form.price) }
      });

      setCurrentStream(data.stream);
      setStatus('live');
      setDuration(0);
      durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      socket?.emit('providerGoingLive', {
        providerId: provider._id,
        streamId: data.stream._id,
        title: form.title
      });

      onStreamStarted?.(data.stream);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start stream');
    }
  };

  const endLive = async () => {
    clearInterval(durationRef.current);
    if (currentStream) {
      try {
        await streamsAPI.end(currentStream._id);
        onStreamEnded?.(currentStream);
      } catch (err) {
        console.error(err);
      }
    }
    stopPreview();
    setCurrentStream(null);
    setStatus('idle');
    setDuration(0);
  };

  useEffect(() => () => {
    clearInterval(durationRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const fmtDuration = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  };

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* Preview / Live video */}
      <div style={{ position: 'relative', background: '#000', minHeight: 240 }}>
        <video
          ref={videoRef}
          autoPlay muted playsInline
          style={{ width: '100%', display: status === 'idle' ? 'none' : 'block', maxHeight: 360 }}
        />

        {status === 'idle' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 16, padding: 40, minHeight: 240
          }}>
            <span style={{ fontSize: 64 }}>🕶️</span>
            <span style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
              Connect your shades to start streaming
            </span>
          </div>
        )}

        {status === 'live' && (
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              background: 'var(--live-red)', color: '#fff', padding: '4px 10px',
              borderRadius: 20, fontSize: 12, fontWeight: 700, animation: 'livePulse 2s infinite'
            }}>● LIVE</span>
            <span style={{
              background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '4px 10px',
              borderRadius: 20, fontSize: 12, fontFamily: 'monospace'
            }}>{fmtDuration(duration)}</span>
          </div>
        )}

        {(status === 'preview' || status === 'live') && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(108,99,255,0.9)', color: '#fff',
            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700
          }}>
            POV MODE
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: 20 }}>
        {error && (
          <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid var(--live-red)', color: 'var(--live-red)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {status === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              placeholder="Stream title"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            />
            <textarea
              className="input"
              placeholder="Description (optional)"
              rows={2}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
            <select
              className="input"
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            >
              {['sports','adventure','travel','cooking','fitness','music','gaming','lifestyle','education','other'].map(c =>
                <option key={c} value={c} style={{ background: 'var(--bg-elevated)', textTransform: 'capitalize' }}>{c}</option>
              )}
            </select>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isFree} onChange={e => setForm(p => ({ ...p, isFree: e.target.checked }))} />
                Free stream
              </label>
              {!form.isFree && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>$</span>
                  <input
                    className="input"
                    type="number" min="0.99" step="0.01"
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    style={{ width: 80 }}
                  />
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={startPreview} style={{ justifyContent: 'center' }}>
              🕶️ Start Preview
            </button>
          </div>
        )}

        {status === 'preview' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-danger" onClick={goLive} style={{ flex: 1, justifyContent: 'center' }}>
              ● Go Live
            </button>
            <button className="btn btn-secondary" onClick={stopPreview} style={{ justifyContent: 'center' }}>
              Cancel
            </button>
          </div>
        )}

        {status === 'live' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{form.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  RTMP → ArgoLive CDN → HLS viewers
                </div>
              </div>
              <div style={{
                background: 'rgba(52,199,89,0.1)', color: 'var(--success)',
                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600
              }}>
                ● Broadcasting
              </div>
            </div>
            <button className="btn btn-danger" onClick={endLive} style={{ justifyContent: 'center' }}>
              ■ End Stream
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
