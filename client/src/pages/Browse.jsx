import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFilter, FiSearch } from 'react-icons/fi';
import api from '../config/api';
import MangaCard from '../components/MangaCard';

const GENRES = [
  'All','Action','Adventure','Comedy','Drama','Fantasy','Horror',
  'Mystery','Romance','Sci-Fi','Slice of Life','Sports',
  'Supernatural','Thriller','Historical','Isekai','Mecha',
  'Psychological','Shounen','Shoujo','Seinen','Josei'
];

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'liked', label: 'Most Liked' },
  { value: 'updated', label: 'Recently Updated' },
];

const STATUSES = ['All', 'Ongoing', 'Completed', 'Hiatus', 'Cancelled'];

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [manga, setManga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const genre = searchParams.get('genre') || '';
  const sort = searchParams.get('sort') || 'newest';
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'All') next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setPage(1);
    setSearchParams(next);
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ sort, page, limit: 24 });
        if (genre) params.set('genre', genre);
        if (status) params.set('status', status);
        if (search) params.set('search', search);

        const res = await api.get(`/manga?${params}`);
        if (page === 1) setManga(res.data.manga);
        else setManga(prev => [...prev, ...res.data.manga]);
        setTotal(res.data.total);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, [genre, sort, status, search, page]);

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', letterSpacing: 1 }}>
            {search ? `Results for "${search}"` : genre ? genre : 'Browse Manga'}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: 4 }}>{total} titles found</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowFilters(v => !v)}>
          <FiFilter /> Filters
        </button>
      </div>

      {/* Filters panel */}
      <motion.div
        initial={false}
        animate={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
        style={{ overflow: 'hidden' }}
      >
        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 24,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20
        }}>
          {/* Sort */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Sort By</label>
            <select value={sort} onChange={e => updateParam('sort', e.target.value)}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {/* Genre */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Genre</label>
            <select value={genre || 'All'} onChange={e => updateParam('genre', e.target.value)}>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {/* Status */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Status</label>
            <select value={status || 'All'} onChange={e => updateParam('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Genre pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 28, paddingBottom: 4, scrollbarWidth: 'none' }}>
        {GENRES.map(g => (
          <button
            key={g}
            className={`btn ${(!genre && g === 'All') || genre === g ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flexShrink: 0, padding: '7px 16px', fontSize: '0.8rem' }}
            onClick={() => updateParam('genre', g === 'All' ? '' : g)}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading && page === 1 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      ) : manga.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-2)' }}>
          <FiSearch size={48} style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: '1.1rem' }}>No manga found</p>
          <p style={{ fontSize: '0.85rem', marginTop: 6 }}>Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <div className="manga-grid">
            {manga.map((m, i) => <MangaCard key={m._id} manga={m} index={i} />)}
          </div>

          {/* Load more */}
          {manga.length < total && (
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setPage(p => p + 1)}
                disabled={loading}
                style={{ padding: '12px 36px', fontSize: '0.9rem' }}
              >
                {loading ? <span className="spinner" style={{ width: 20, height: 20 }} /> : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
