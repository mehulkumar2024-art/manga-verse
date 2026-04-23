import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBookmark, FiHeart, FiInbox } from 'react-icons/fi';
import api from '../config/api';
import MangaCard from '../components/MangaCard';

export default function Library() {
  const [tab, setTab] = useState('saved');
  const [saved, setSaved] = useState([]);
  const [liked, setLiked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/users/me/library');
        setSaved(res.data.saved || []);
        setLiked(res.data.liked || []);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, []);

  const list = tab === 'saved' ? saved : liked;

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: 1, marginBottom: 4 }}>
          MY <span style={{ color: 'var(--accent)' }}>LIBRARY</span>
        </h1>
        <p style={{ color: 'var(--text-2)' }}>Your personal manga collection</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {[
          { key: 'saved', icon: <FiBookmark size={15} />, label: `Saved (${saved.length})` },
          { key: 'liked', icon: <FiHeart size={15} />, label: `Liked (${liked.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn ${tab === t.key ? 'btn-primary' : ''}`}
            style={{
              padding: '8px 20px', fontSize: '0.875rem', border: 'none',
              background: tab === t.key ? 'var(--accent)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-2)'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      ) : list.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-2)' }}
        >
          <FiInbox size={56} style={{ margin: '0 auto 20px', display: 'block', color: 'var(--text-3)' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: 8, color: 'var(--text-1)' }}>
            {tab === 'saved' ? 'No saved manga yet' : 'No liked manga yet'}
          </h3>
          <p style={{ fontSize: '0.875rem' }}>
            {tab === 'saved'
              ? 'Save manga you want to read later by clicking the bookmark icon.'
              : 'Like manga to show your appreciation for the artists.'}
          </p>
        </motion.div>
      ) : (
        <div className="manga-grid">
          {list.map((m, i) => <MangaCard key={m._id} manga={m} index={i} />)}
        </div>
      )}
    </div>
  );
}
