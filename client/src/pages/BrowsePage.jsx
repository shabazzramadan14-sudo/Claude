import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ContentCard from '../components/ContentCard';
import ProviderCard from '../components/ProviderCard';
import { contentAPI, providersAPI } from '../services/api';

const categories = ['All', 'Sports', 'Adventure', 'Travel', 'Cooking', 'Fitness', 'Music', 'Gaming', 'Lifestyle', 'Education', 'Other'];

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'providers' ? 'providers' : 'content';
  const [tab, setTab] = useState(defaultTab);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const params = {
        limit: 24,
        ...(category !== 'All' && { category: category.toLowerCase() }),
        ...(search && { search }),
        ...(freeOnly && { free: 'true' })
      };
      try {
        const { data } = tab === 'content'
          ? await contentAPI.list(params)
          : await providersAPI.list(params);
        setItems(tab === 'content' ? data.content : data.providers);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(fetch, 300);
    return () => clearTimeout(timer);
  }, [tab, category, search, freeOnly]);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>Browse POV Content</h1>

      {/* Tab + search row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {['content', 'providers'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 20px', background: tab === t ? 'var(--accent)' : 'transparent',
              border: 'none', color: tab === t ? '#fff' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize'
            }}>
              {t}
            </button>
          ))}
        </div>

        <input
          className="input"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240 }}
        />

        {tab === 'content' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)} />
            Free only
          </label>
        )}
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 28, paddingBottom: 4 }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            background: category === cat ? 'var(--accent)' : 'var(--bg-elevated)',
            color: category === cat ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${category === cat ? 'var(--accent)' : 'var(--border)'}`,
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
          }}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div>No results found</div>
        </div>
      ) : tab === 'content' ? (
        <div className="grid-cards">
          {items.map(c => <ContentCard key={c._id} item={c} type="content" />)}
        </div>
      ) : (
        <div className="grid-providers">
          {items.map(p => <ProviderCard key={p._id} provider={p} />)}
        </div>
      )}
    </div>
  );
}
