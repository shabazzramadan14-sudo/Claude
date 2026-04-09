import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const [tab, setTab] = useState(defaultTab);
  const [role, setRole] = useState('viewer');
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '', stageName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (isLoggedIn) navigate('/'); }, [isLoggedIn, navigate]);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register({ ...form, role });
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'radial-gradient(ellipse at center top, rgba(108,99,255,0.15) 0%, var(--bg-primary) 60%)'
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🕶️</div>
          <div style={{ fontWeight: 800, fontSize: 28 }}>
            POV<span style={{ color: 'var(--accent)' }}>Live</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
            Experience the world through someone else's eyes
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '16px', background: 'transparent', border: 'none',
                fontSize: 14, fontWeight: 600,
                color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.2s', textTransform: 'capitalize'
              }}>
                {t === 'login' ? 'Sign In' : 'Get Started'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', color: 'var(--live-red)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                {error}
              </div>
            )}

            {tab === 'register' && (
              <>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>I want to…</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[
                      { val: 'viewer', label: '👀 Watch content' },
                      { val: 'provider', label: '🕶️ Stream as provider' }
                    ].map(({ val, label }) => (
                      <button type="button" key={val} onClick={() => setRole(val)} style={{
                        flex: 1, padding: '10px', borderRadius: 8, fontSize: 13,
                        background: role === val ? 'rgba(108,99,255,0.15)' : 'var(--bg-elevated)',
                        border: `1px solid ${role === val ? 'var(--accent)' : 'var(--border)'}`,
                        color: role === val ? 'var(--accent)' : 'var(--text-secondary)'
                      }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <input name="username" className="input" placeholder="Username" value={form.username} onChange={handleChange} required minLength={3} />
                <input name="displayName" className="input" placeholder="Display name (optional)" value={form.displayName} onChange={handleChange} />
                {role === 'provider' && (
                  <input name="stageName" className="input" placeholder="Stage name (for your channel)" value={form.stageName} onChange={handleChange} required />
                )}
              </>
            )}

            <input name="email" type="email" className="input" placeholder="Email address" value={form.email} onChange={handleChange} required />
            <input name="password" type="password" className="input" placeholder="Password" value={form.password} onChange={handleChange} required minLength={6} />

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center', fontSize: 15, padding: '12px' }}>
              {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
