import React, { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';

const BellIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
  </svg>
);

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { on, off } = useSocket();
  const panelRef = useRef(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await notificationsAPI.list({ limit: 10 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time notifications via socket
    const handler = () => fetchNotifications();
    on('notification', handler);
    return () => off('notification', handler);
  }, [on, off]);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const notifIcon = (type) => {
    const icons = {
      'stream-started': '🔴',
      'new-content': '🎬',
      'purchase-success': '✅',
      'stream-scheduled': '📅',
      'purchase-failed': '❌'
    };
    return icons[type] || '🔔';
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 8, width: 36, height: 36, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)', position: 'relative'
        }}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--live-red)', color: '#fff',
            borderRadius: '50%', width: 18, height: 18,
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-primary)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0, width: 340,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
          zIndex: 200, maxHeight: 480, overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', borderBottom: '1px solid var(--border)'
          }}>
            <span style={{ fontWeight: 700 }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', fontSize: 12,
                color: 'var(--accent)', cursor: 'pointer'
              }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div className="loader" style={{ padding: 24 }}><div className="spinner" /></div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  style={{
                    display: 'flex', gap: 12, padding: '12px 16px',
                    background: n.isRead ? 'transparent' : 'rgba(108,99,255,0.05)',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.2s'
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{notifIcon(n.type)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: n.isRead ? 400 : 600, fontSize: 13 }}>{n.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{n.message}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                  {!n.isRead && <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
                    flexShrink: 0, marginTop: 4
                  }} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
