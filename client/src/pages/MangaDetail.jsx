import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHeart, FiBookmark, FiEye, FiUser, FiMessageCircle, FiSend } from 'react-icons/fi';
import { MdMenuBook } from 'react-icons/md';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function MangaDetail() {
  const { id } = useParams();
  const { currentUser, dbUser } = useAuth();
  const navigate = useNavigate();
  const [manga, setManga] = useState(null);
  const [interaction, setInteraction] = useState({ liked: false, saved: false });
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [mRes, cRes] = await Promise.all([
          api.get(`/manga/${id}`),
          api.get(`/manga/${id}/comments`),
        ]);
        setManga(mRes.data.manga);
        setInteraction(mRes.data.userInteraction || { liked: false, saved: false });
        setComments(cRes.data.comments || []);
      } catch { navigate('/browse'); }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleLike = async () => {
    if (!currentUser) return toast.error('Sign in to like');
    try {
      const res = await api.post(`/manga/${id}/like`);
      setInteraction(v => ({ ...v, liked: res.data.liked }));
      setManga(v => ({ ...v, likes: v.likes + (res.data.liked ? 1 : -1) }));
    } catch { toast.error('Failed'); }
  };

  const handleSave = async () => {
    if (!currentUser) return toast.error('Sign in to save');
    try {
      const res = await api.post(`/manga/${id}/save`);
      setInteraction(v => ({ ...v, saved: res.data.saved }));
      toast.success(res.data.saved ? 'Added to library' : 'Removed from library');
    } catch { toast.error('Failed'); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!currentUser) return toast.error('Sign in to comment');
    if (!comment.trim()) return;
    try {
      const res = await api.post(`/manga/${id}/comments`, { content: comment });
      setComments(v => [res.data.comment, ...v]);
      setComment('');
    } catch { toast.error('Failed to post comment'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
      <div className="spinner" />
    </div>
  );

  if (!manga) return null;

  const firstChapter = manga.chapters?.[0];
  const lastChapter = manga.chapters?.[manga.chapters.length - 1];

  return (
    <div className="fade-up">
      {/* Hero banner */}
      <div style={{
        position: 'relative', borderRadius: 'var(--radius-xl)',
        overflow: 'hidden', marginBottom: 32,
        background: 'var(--bg-2)', border: '1px solid var(--border)'
      }}>
        {manga.coverImage && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <img src={manga.coverImage} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2, filter: 'blur(4px)' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,15,0.5) 0%, rgba(10,10,15,0.95) 100%)' }} />
          </div>
        )}
        <div style={{ position: 'relative', padding: '32px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {/* Cover */}
          <div style={{
            width: 180, flexShrink: 0, borderRadius: 'var(--radius-md)',
            overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            border: '2px solid var(--border)', alignSelf: 'flex-start'
          }}>
            <img src={manga.coverImage} alt={manga.title}
              style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover' }}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 3rem)', letterSpacing: 1, marginBottom: 8 }}>
              {manga.title}
            </h1>

            <Link to={`/profile/${manga.author?.username}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, width: 'fit-content' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--accent)', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600
              }}>
                {manga.author?.avatar
                  ? <img src={manga.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : manga.author?.username?.[0]?.toUpperCase()
                }
              </div>
              <span style={{ color: 'var(--text-1)', fontSize: '0.9rem' }}>
                {manga.author?.displayName || manga.author?.username}
              </span>
              {manga.author?.isArtist && (
                <span className="badge" style={{ background: 'rgba(232,51,74,0.15)', color: 'var(--accent)', fontSize: '0.65rem' }}>ARTIST</span>
              )}
            </Link>

            {/* Genres */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {manga.genres?.map(g => <span key={g} className="badge badge-genre">{g}</span>)}
              <span className={`badge badge-status-${manga.status?.toLowerCase()}`}>{manga.status}</span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
              <Stat icon={<FiEye />} value={fmtNum(manga.views)} label="Views" />
              <Stat icon={<FiHeart />} value={fmtNum(manga.likes)} label="Likes" />
              <Stat icon={<MdMenuBook />} value={manga.chapters?.length || 0} label="Chapters" />
              <Stat icon={<FiMessageCircle />} value={comments.length} label="Comments" />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {firstChapter && (
                <Link to={`/manga/${id}/chapter/${firstChapter._id}`} className="btn btn-primary" style={{ fontSize: '0.95rem', padding: '12px 28px' }}>
                  <MdMenuBook /> Start Reading
                </Link>
              )}
              {lastChapter && lastChapter._id !== firstChapter?._id && (
                <Link to={`/manga/${id}/chapter/${lastChapter._id}`} className="btn btn-ghost" style={{ fontSize: '0.95rem' }}>
                  Latest Chapter
                </Link>
              )}
              <button
                className="btn btn-ghost"
                onClick={handleLike}
                style={{ color: interaction.liked ? 'var(--accent)' : 'var(--text-1)', borderColor: interaction.liked ? 'var(--accent)' : 'var(--border)' }}
              >
                <FiHeart fill={interaction.liked ? 'currentColor' : 'none'} /> {fmtNum(manga.likes)}
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleSave}
                style={{ color: interaction.saved ? 'var(--gold)' : 'var(--text-1)', borderColor: interaction.saved ? 'var(--gold)' : 'var(--border)' }}
              >
                <FiBookmark fill={interaction.saved ? 'currentColor' : 'none'} /> {interaction.saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Description + Chapters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 28 }}>
        {/* Description */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: 1, marginBottom: 12 }}>SYNOPSIS</h2>
          <p style={{ color: 'var(--text-1)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{manga.description}</p>
        </div>

        {/* Chapters list */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: 1, marginBottom: 16 }}>
            CHAPTERS <span style={{ color: 'var(--text-3)', fontSize: '1rem' }}>({manga.chapters?.length || 0})</span>
          </h2>
          {manga.chapters?.length === 0 ? (
            <p style={{ color: 'var(--text-2)', textAlign: 'center', padding: '32px 0' }}>No chapters yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {[...(manga.chapters || [])].reverse().map((ch, i) => (
                <Link
                  key={ch._id}
                  to={`/manga/${id}/chapter/${ch._id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-3)', border: '1px solid var(--border)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ch. {ch.chapterNumber}</span>
                    {ch.title && <span style={{ color: 'var(--text-2)', marginLeft: 8, fontSize: '0.85rem' }}>{ch.title}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-3)', fontSize: '0.78rem' }}>
                    <span><FiEye size={12} style={{ marginRight: 3 }} />{fmtNum(ch.views)}</span>
                    <span>{new Date(ch.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Comments */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: 1, marginBottom: 20 }}>
            COMMENTS <span style={{ color: 'var(--text-3)', fontSize: '1rem' }}>({comments.length})</span>
          </h2>

          {/* Comment form */}
          <form onSubmit={handleComment} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={currentUser ? 'Leave a comment...' : 'Sign in to comment'}
              disabled={!currentUser}
              style={{ flex: 1 }}
              maxLength={1000}
            />
            <button type="submit" className="btn btn-primary" disabled={!currentUser || !comment.trim()}>
              <FiSend />
            </button>
          </form>

          {/* Comment list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {comments.map(c => (
              <div key={c._id} style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--bg-4)', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 600
                }}>
                  {c.user?.avatar
                    ? <img src={c.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : c.user?.username?.[0]?.toUpperCase()
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 4 }}>
                    <Link to={`/profile/${c.user?.username}`} style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-0)' }}>
                      {c.user?.displayName || c.user?.username}
                    </Link>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-1)', fontSize: '0.875rem', lineHeight: 1.6 }}>{c.content}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '24px 0' }}>No comments yet. Be the first!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: 'var(--accent)' }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{value}</span>
      <span style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>{label}</span>
    </div>
  );
}

function fmtNum(n = 0) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}
