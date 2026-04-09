import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const ShadesIcon = () => (
  <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
    <rect x="0" y="4" width="13" height="10" rx="5" fill="#6c63ff"/>
    <rect x="19" y="4" width="13" height="10" rx="5" fill="#6c63ff"/>
    <rect x="13" y="7" width="6" height="4" rx="2" fill="#6c63ff"/>
  </svg>
);

export default function Navbar() {
  const { user, provider, isLoggedIn, isProvider, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const navLink = (to, label) => (
    <Link
      to={to}
      style={{
        color: location.pathname === to ? '#fff' : 'var(--text-secondary)',
        fontWeight: location.pathname === to ? '600' : '400',
        fontSize: 14,
        transition: 'color 0.2s'
      }}
      onMouseEnter={e => e.target.style.color = '#fff'}
      onMouseLeave={e => e.target.style.color = location.pathname === to ? '#fff' : 'var(--text-secondary)'}
    >
      {label}
    </Link>
  );

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px', height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShadesIcon />
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>
          POV<span style={{ color: 'var(--accent)' }}>Live</span>
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {navLink('/', 'Discover')}
        {navLink('/live', 'Live Now')}
        {navLink('/browse', 'Browse')}
        {isLoggedIn && navLink('/my-library', 'My Library')}
        {isProvider && navLink('/provider/dashboard', 'Dashboard')}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isLoggedIn ? (
          <>
            <NotificationBell />
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: '50%', width: 36, height: 36, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                }}
              >
                {user?.avatar
                  ? <img src={user.avatar} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>
                      {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
                    </span>
                }
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 44, right: 0, width: 200,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)',
                  zIndex: 200
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {user?.displayName || user?.username}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{user?.email}</div>
                  </div>
                  {[
                    { to: '/profile', label: 'Profile' },
                    { to: '/my-library', label: 'My Library' },
                    ...(isProvider ? [{ to: '/provider/dashboard', label: 'Provider Dashboard' }] : []),
                    ...(!isProvider ? [{ to: '/become-provider', label: 'Become a Provider' }] : [])
                  ].map(({ to, label }) => (
                    <Link
                      key={to} to={to}
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: 'block', padding: '10px 16px', fontSize: 14,
                        color: 'var(--text-secondary)', transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 16px',
                      background: 'transparent', border: 'none', fontSize: 14,
                      color: 'var(--live-red)', borderTop: '1px solid var(--border)'
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/auth" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
              Sign In
            </Link>
            <Link to="/auth?tab=register" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
