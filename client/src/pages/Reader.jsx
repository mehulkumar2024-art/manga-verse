import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiArrowLeft, FiMenu, FiX, FiList, FiMessageCircle, FiSend, FiPlay, FiPause } from 'react-icons/fi';
import { MdOutlineMenuBook } from 'react-icons/md';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Reader() {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [chapter, setChapter] = useState(null);
  const [manga, setManga] = useState(null);
  const [allChapters, setAllChapters] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [isCinematic, setIsCinematic] = useState(false);
  const [currentPanelIndex, setCurrentPanelIndex] = useState(-1);
  const [showChapterList, setShowChapterList] = useState(false);
  const [readMode, setReadMode] = useState('page'); 
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [showUI, setShowUI] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [chapterRes, commentsRes, manifestRes] = await Promise.all([
          api.get(`/chapters/${chapterId}`),
          api.get(`/manga/${mangaId}/comments`, { params: { chapterId } }),
          api.get(`/panels/chapter/${chapterId}`),
        ]);
        setChapter(chapterRes.data.chapter);
        const m = chapterRes.data.chapter.manga;
        setManga(m);
        setAllChapters(m.chapters || []);
        setComments(commentsRes.data.comments || []);
        setManifests(manifestRes.data || []);
        setCurrentPage(0);
        setCurrentPanelIndex(-1);
      } catch { navigate(`/manga/${mangaId}`); }
      setLoading(false);
    };
    fetch();
  }, [chapterId]);

  const currentIndex = allChapters.findIndex(c => c._id === chapterId);
  const prevChapter = allChapters[currentIndex - 1];
  const nextChapter = allChapters[currentIndex + 1];

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'c' || e.key === 'C') {
      setIsCinematic(v => !v);
      return;
    }

    if (isCinematic) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        advanceCinematic();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        reverseCinematic();
      }
      return;
    }

    if (readMode !== 'page') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      setCurrentPage(p => Math.min(p + 1, (chapter?.pages?.length || 1) - 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      setCurrentPage(p => Math.max(p - 1, 0));
    }
  }, [chapter, readMode, isCinematic, currentPanelIndex, manifests, currentPage]);

  const advanceCinematic = useCallback(() => {
    const currentManifest = manifests.find(m => m.pageNumber === currentPage + 1);
    const panels = currentManifest?.panels || [];

    if (currentPanelIndex < panels.length - 1) {
      setCurrentPanelIndex(prev => prev + 1);
    } else {
      // End of panels on this page
      if (currentPage < (chapter?.pages?.length || 1) - 1) {
        setCurrentPage(p => p + 1);
        setCurrentPanelIndex(-1);
      } else {
        // End of chapter
        if (nextChapter) {
          goToChapter(nextChapter._id);
        } else {
          setIsCinematic(false);
          toast('End of manga!', { icon: '📖' });
        }
      }
    }
  }, [manifests, currentPage, currentPanelIndex, chapter, nextChapter]);

  const reverseCinematic = useCallback(() => {
    if (currentPanelIndex > -1) {
      setCurrentPanelIndex(prev => prev - 1);
    } else {
      if (currentPage > 0) {
        const prevPageNum = currentPage;
        const prevManifest = manifests.find(m => m.pageNumber === prevPageNum);
        setCurrentPage(p => p - 1);
        setCurrentPanelIndex((prevManifest?.panels?.length || 1) - 1);
      }
    }
  }, [manifests, currentPage, currentPanelIndex]);

  useEffect(() => {
    let timer;
    if (isCinematic && currentPanelIndex !== -2) { // -2 would be paused
      timer = setInterval(advanceCinematic, 4000); // Auto-advance every 4s
    }
    return () => clearInterval(timer);
  }, [isCinematic, currentPanelIndex, advanceCinematic]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const goToChapter = (id) => navigate(`/manga/${mangaId}/chapter/${id}`);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!currentUser) return toast.error('Sign in to comment');
    if (!comment.trim()) return;
    try {
      const res = await api.post(`/manga/${mangaId}/comments`, {
        content: comment,
        chapterId,
      });
      setComments(prev => [res.data.comment, ...prev]);
      setComment('');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="spinner" />
    </div>
  );
  if (!chapter) return null;

  const pages = chapter.pages || [];
  const totalPages = pages.length;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', position: 'relative', margin: '-28px -24px', padding: 0 }}>
      {/* Immersive Manga BG Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(232,51,74,0.05) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      {/* Top bar */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ y: -64 }} animate={{ y: 0 }} exit={{ y: -64 }}
            transition={{ type: 'spring', damping: 30 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
              background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)',
              borderBottom: '1px solid var(--border)',
              height: 56, display: 'flex', alignItems: 'center',
              padding: '0 16px', gap: 12
            }}
          >
            <Link to={`/manga/${mangaId}`} className="btn btn-ghost" style={{ padding: '6px 10px' }}>
              <FiArrowLeft size={16} />
            </Link>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: 1, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {manga?.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 2 }}>
                Ch. {chapter.chapterNumber} {chapter.title && `— ${chapter.title}`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Read mode toggle */}
              <button
                className="btn btn-ghost"
                onClick={() => setReadMode(m => m === 'page' ? 'scroll' : 'page')}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                title={readMode === 'page' ? 'Switch to scroll mode' : 'Switch to page mode'}
              >
                <MdOutlineMenuBook size={16} />
                {readMode === 'page' ? 'Page' : 'Scroll'}
              </button>

              <button
                className={`btn ${isCinematic ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setIsCinematic(v => !v)}
                style={{ padding: '6px 12px', fontSize: '0.8rem', color: isCinematic ? '#fff' : 'var(--text-1)' }}
                title="Cinematic Mode (Auto-Play)"
              >
                <FiPlay size={16} />
                Cinematic
              </button>

              <button className="btn btn-ghost" onClick={() => setShowChapterList(v => !v)} style={{ padding: '6px 10px' }}>
                <FiList size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic HUD */}
      <AnimatePresence>
        {isCinematic && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none',
              border: '40px solid transparent',
              borderImage: 'radial-gradient(circle, transparent 70%, rgba(0,0,0,0.4) 100%) 1',
              boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: 'rgba(10,10,15,0.8)', padding: '12px 24px', borderRadius: 40, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'auto' }}>
                <button className="btn btn-ghost" onClick={() => reverseCinematic()} style={{ padding: 8, border: 'none' }}><FiChevronLeft size={24} /></button>
                <button className="btn btn-primary" onClick={() => setCurrentPanelIndex(v => v === -2 ? -1 : -2)} style={{ width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {currentPanelIndex === -2 ? <FiPlay size={24} /> : <FiPause size={24} />}
                </button>
                <button className="btn btn-ghost" onClick={() => advanceCinematic()} style={{ padding: 8, border: 'none' }}><FiChevronRight size={24} /></button>
              </div>
              <div style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', textShadow: '0 0 10px var(--accent)' }}>
                {manifests.find(m => m.pageNumber === currentPage + 1)?.panels?.[currentPanelIndex]?.label || `PAGE ${currentPage + 1}`}
              </div>
            </div>
            {/* Speed lines effect when changing panels */}
            <div className="speedlines" style={{ opacity: isCinematic ? 0.3 : 0 }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter list sidebar */}
      <AnimatePresence>
        {showChapterList && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowChapterList(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 60 }}
            />
            <motion.div
              initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }}
              transition={{ type: 'spring', damping: 30 }}
              style={{
                position: 'fixed', right: 0, top: 0, bottom: 0, width: 300,
                background: 'var(--bg-1)', borderLeft: '1px solid var(--border)',
                zIndex: 70, overflowY: 'auto', padding: 20
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: 1 }}>CHAPTERS</h3>
                <button className="btn btn-ghost" onClick={() => setShowChapterList(false)} style={{ padding: 6 }}>
                  <FiX size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...allChapters].reverse().map(ch => (
                  <button
                    key={ch._id}
                    onClick={() => { goToChapter(ch._id); setShowChapterList(false); }}
                    style={{
                      textAlign: 'left', padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)', border: 'none',
                      background: ch._id === chapterId ? 'var(--accent)' : 'var(--bg-3)',
                      color: ch._id === chapterId ? '#fff' : 'var(--text-1)',
                      cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s'
                    }}
                  >
                    Ch. {ch.chapterNumber} {ch.title && `— ${ch.title}`}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reading area */}
      <div
        style={{ paddingTop: 56, paddingBottom: 80, minHeight: '100vh', cursor: 'pointer' }}
        onClick={() => setShowUI(v => !v)}
      >
        {readMode === 'page' ? (
          /* Page mode */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
            {pages[currentPage] && (
              <div style={{ position: 'relative', maxWidth: 900, width: '100%', overflow: 'hidden' }}>
                <motion.img
                  key={currentPage}
                  initial={{ opacity: 0 }}
                  animate={(() => {
                    const manifest = manifests.find(m => m.pageNumber === currentPage + 1);
                    const panel = manifest?.panels?.[currentPanelIndex];
                    if (isCinematic && panel) {
                      const { x, y, h, w } = panel.bbox;
                      const iw = manifest.imageWidth;
                      const ih = manifest.imageHeight;
                      const scale = Math.min(900 / w, window.innerHeight / h) * 0.8;
                      const tx = (iw / 2 - (x + w / 2)) * scale;
                      const ty = (ih / 2 - (y + h / 2)) * scale;
                      return {
                        opacity: 1,
                        scale,
                        x: tx,
                        y: ty,
                        transition: { duration: 1.5, ease: "easeInOut" }
                      };
                    }
                    return { opacity: 1, scale: 1, x: 0, y: 0 };
                  })()}
                  src={pages[currentPage].url}
                  alt={`Page ${currentPage + 1}`}
                  style={{ width: '100%', display: 'block', userSelect: 'none', transformOrigin: 'center center' }}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        ) : (
          /* Scroll mode */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {pages.map((page, i) => (
              <img
                key={i}
                src={page.url}
                alt={`Page ${i + 1}`}
                style={{ maxWidth: 900, width: '100%', display: 'block' }}
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 920, margin: '0 auto', padding: '20px 20px 120px' }}>
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: 1, marginBottom: 16 }}>
            <FiMessageCircle style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--accent)' }} />
            COMMENTS <span style={{ color: 'var(--text-3)', fontSize: '0.95rem' }}>({comments.length})</span>
          </h2>

          <form onSubmit={handleComment} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={currentUser ? 'Leave a comment on this chapter...' : 'Sign in to comment'}
              disabled={!currentUser}
              style={{ flex: 1 }}
              maxLength={1000}
            />
            <button type="submit" className="btn btn-primary" disabled={!currentUser || !comment.trim()}>
              <FiSend />
            </button>
          </form>

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
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap' }}>
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

      {/* Bottom navigation */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            transition={{ type: 'spring', damping: 30 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)',
              borderTop: '1px solid var(--border)',
              padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16
            }}
          >
            {/* Prev chapter */}
            <button
              className="btn btn-ghost"
              onClick={(e) => { e.stopPropagation(); prevChapter && goToChapter(prevChapter._id); }}
              disabled={!prevChapter}
              style={{ padding: '8px 14px', opacity: prevChapter ? 1 : 0.3 }}
            >
              <FiChevronLeft /> Prev Ch
            </button>

            {readMode === 'page' && (
              <>
                {/* Prev page */}
                <button
                  className="btn btn-ghost"
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(p - 1, 0)); }}
                  disabled={currentPage === 0}
                  style={{ padding: '8px', opacity: currentPage > 0 ? 1 : 0.3 }}
                >
                  <FiChevronLeft size={18} />
                </button>

                {/* Page indicator */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-1)' }}>
                    {currentPage + 1} / {totalPages}
                  </span>
                  {/* Progress bar */}
                  <div style={{ height: 3, background: 'var(--bg-4)', borderRadius: 2, marginTop: 6 }}>
                    <div style={{
                      height: '100%', background: 'var(--accent)', borderRadius: 2,
                      width: `${((currentPage + 1) / totalPages) * 100}%`,
                      transition: 'width 0.2s'
                    }} />
                  </div>
                </div>

                {/* Next page */}
                <button
                  className="btn btn-ghost"
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(p + 1, totalPages - 1)); }}
                  disabled={currentPage === totalPages - 1}
                  style={{ padding: '8px', opacity: currentPage < totalPages - 1 ? 1 : 0.3 }}
                >
                  <FiChevronRight size={18} />
                </button>
              </>
            )}

            {readMode === 'scroll' && <div style={{ flex: 1 }} />}

            {/* Next chapter */}
            <button
              className="btn btn-ghost"
              onClick={(e) => { e.stopPropagation(); nextChapter && goToChapter(nextChapter._id); }}
              disabled={!nextChapter}
              style={{ padding: '8px 14px', opacity: nextChapter ? 1 : 0.3 }}
            >
              Next Ch <FiChevronRight />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
