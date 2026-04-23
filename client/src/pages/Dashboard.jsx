import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiEye, FiHeart, FiBookOpen, FiPlus, FiEdit2, FiTrash2, FiTrendingUp } from 'react-icons/fi';
import { MdMenuBook } from 'react-icons/md';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { dbUser } = useAuth();
  const [manga, setManga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalViews: 0, totalLikes: 0, totalManga: 0, totalChapters: 0 });
  const [uploadingStates, setUploadingStates] = useState({}); // Track uploading manga { mangaId: progress }

  useEffect(() => {
    // Listen for upload progress from Upload page
    const handleUploadProgress = (e) => {
      if (e.detail) {
        setUploadingStates(prev => ({
          ...prev,
          [e.detail.mangaId]: e.detail.progress
        }));
      }
    };
    
    window.addEventListener('manga-upload-progress', handleUploadProgress);
    return () => window.removeEventListener('manga-upload-progress', handleUploadProgress);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/users/me/uploads');
        const list = res.data.manga || [];
        setManga(list);
        setStats({
          totalManga: list.length,
          totalViews: list.reduce((s, m) => s + (m.views || 0), 0),
          totalLikes: list.reduce((s, m) => s + (m.likes || 0), 0),
          totalChapters: list.reduce((s, m) => s + (m.chapters?.length || 0), 0),
        });
      } catch {}
      setLoading(false);
    };
    fetch();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this manga and all its chapters? This cannot be undone.')) return;
    try {
      await api.delete(`/manga/${id}`);
      setManga(prev => prev.filter(m => m._id !== id));
      toast.success('Manga deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', letterSpacing: 1 }}>
            CREATOR <span style={{ color: 'var(--accent)' }}>DASHBOARD</span>
          </h1>
          <p style={{ color: 'var(--text-2)', marginTop: 4 }}>Manage your manga and track performance</p>
        </div>
        <Link to="/upload" className="btn btn-primary" style={{ padding: '11px 24px' }}>
          <FiPlus /> New Manga
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 36 }}>
        {[
          { icon: <MdMenuBook size={20} />, label: 'Total Manga', value: stats.totalManga, color: 'var(--accent)' },
          { icon: <FiBookOpen size={20} />, label: 'Chapters', value: stats.totalChapters, color: 'var(--gold)' },
          { icon: <FiEye size={20} />, label: 'Total Views', value: fmtNum(stats.totalViews), color: '#60a5fa' },
          { icon: <FiHeart size={20} />, label: 'Total Likes', value: fmtNum(stats.totalLikes), color: '#f472b6' },
        ].map(s => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '20px 24px'
            }}
          >
            <div style={{ color: s.color, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: 1, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: '0.8rem', marginTop: 4 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Manga list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : manga.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)'
        }}>
          <MdMenuBook size={48} color="var(--text-3)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-1)', marginBottom: 8 }}>No manga published yet</h3>
          <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>Share your story with the world!</p>
          <Link to="/upload" className="btn btn-primary">
            <FiPlus /> Publish Your First Manga
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: 1, color: 'var(--text-1)' }}>
            YOUR WORKS ({manga.length})
          </h2>
          {manga.map((m, i) => {
            const isUploading = uploadingStates[m._id] !== undefined;
            const progress = uploadingStates[m._id] || 0;
            
            return (
              <motion.div
                key={m._id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{
                  background: 'var(--bg-2)', border: isUploading ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: 20,
                  display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap',
                  position: 'relative',
                  opacity: isUploading ? 0.8 : 1,
                  overflow: 'hidden'
                }}
              >
                {/* Uploading progress bar */}
                {isUploading && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: 3,
                      background: 'var(--accent)',
                      transformOrigin: 'left',
                      width: `${progress}%`
                    }}
                  />
                )}

                {/* Cover */}
                <Link to={`/manga/${m._id}`} style={{ flexShrink: 0, position: 'relative' }}>
                  <div style={{ width: 72, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                    <img src={m.coverImage} alt={m.title}
                      style={{ 
                        width: '100%', aspectRatio: '2/3', objectFit: 'cover',
                        opacity: isUploading ? 0.4 : 1
                      }}
                    />
                    {isUploading && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)'
                      }}>
                        <div style={{
                          fontSize: '0.7rem', color: '#fff', fontWeight: 600,
                          textAlign: 'center'
                        }}>
                          {progress}%
                        </div>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Link to={`/manga/${m._id}`}>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-0)' }}>
                        {m.title}
                      </h3>
                    </Link>
                    {isUploading && (
                      <span style={{
                        background: 'var(--accent)', color: '#fff',
                        fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4,
                        fontWeight: 600
                      }}>
                        Uploading {progress}%
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text-2)', fontSize: '0.82rem', marginBottom: 10 }}>
                    <span><FiEye size={12} style={{ verticalAlign: 'middle' }} /> {fmtNum(m.views)} views</span>
                    <span><FiHeart size={12} style={{ verticalAlign: 'middle' }} /> {fmtNum(m.likes)} likes</span>
                    <span><FiBookOpen size={12} style={{ verticalAlign: 'middle' }} /> {m.chapters?.length || 0} chapters</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {m.genres?.slice(0, 3).map(g => (
                      <span key={g} className="badge badge-genre" style={{ fontSize: '0.65rem' }}>{g}</span>
                    ))}
                    <span className={`badge badge-status-${m.status?.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>{m.status}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Link to={`/manga/${m._id}`} className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                    <FiEye size={14} /> View
                  </Link>
                  <button
                    onClick={() => handleDelete(m._id)}
                    className="btn btn-ghost"
                    disabled={isUploading}
                    style={{ 
                      padding: '8px 14px', fontSize: '0.8rem', color: 'var(--accent)', 
                      borderColor: 'rgba(232,51,74,0.3)', opacity: isUploading ? 0.5 : 1 
                    }}
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmtNum(n = 0) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}
