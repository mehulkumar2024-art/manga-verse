import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiArrowLeft, FiMenu, FiX, FiList, FiMessageCircle, FiSend, FiPlay, FiPause } from 'react-icons/fi';
import { MdOutlineMenuBook } from 'react-icons/md';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import React from 'react';
import CroppedImage from '../components/PanelEditor/CroppedImage';
import { speakText } from '../services/ttsClient';

const VOICE_LIBRARY = [
  { id: 'v1', name: 'Kaelen', gender: 'Male', age: 'Adult', style: 'Action / Heroic', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'v2', name: 'Elora', gender: 'Female', age: 'Adult', style: 'Sweet / Friendly', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'v3', name: 'Borg', gender: 'Male', age: 'Large', style: 'Deep / Gritty', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'v4', name: 'Mira', gender: 'Female', age: 'Young', style: 'High-pitched / Energetic', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'v5', name: 'The Narrator', gender: 'Male', age: 'Old', style: 'Deep / Dramatic', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { id: 'v6', name: 'Zoe', gender: 'Female', age: 'Young', style: 'Cute / Playful', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  { id: 'v7', name: 'Commander', gender: 'Male', age: 'Adult', style: 'Authoritative', preview: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
];

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
  const [characters, setCharacters] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = React.useRef(null);

  // Typewriter effect
  useEffect(() => {
    if (!showSubtitle || !currentText) {
      setTypedText('');
      return;
    }
    let currentIndex = 0;
    const durationEstimateMs = (currentText.length / 15) * 1000;
    const intervalTime = Math.max(30, durationEstimateMs / currentText.length);
    
    const timer = setInterval(() => {
      currentIndex++;
      setTypedText(currentText.substring(0, currentIndex));
      if (currentIndex >= currentText.length) {
        clearInterval(timer);
      }
    }, intervalTime);
    
    return () => clearInterval(timer);
  }, [currentText, showSubtitle]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [chapterRes, commentsRes, manifestRes, charsRes] = await Promise.all([
          api.get(`/chapters/${chapterId}`),
          api.get(`/manga/${mangaId}/comments`, { params: { chapterId } }),
          api.get(`/panels/chapter/${chapterId}`),
          api.get(`/characters/manga/${mangaId}`)
        ]);
        setChapter(chapterRes.data.chapter);
        const m = chapterRes.data.chapter.manga;
        setManga(m);
        setAllChapters(m?.chapters || []);
        setComments(commentsRes.data.comments || []);
        setManifests(manifestRes.data.data || []);
        setCharacters(charsRes.data.data || []);
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
    // If speaking, we probably shouldn't advance unless it's been long enough.
    // For now we just advance and clear the subtitle.
    setShowSubtitle(false);
    setCurrentText('');
    
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
    setShowSubtitle(false);
    setCurrentText('');
    
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
    if (isCinematic && currentPanelIndex !== -2 && !isSpeaking) {
      // Auto-advance after speech finishes, with a short delay
      const delay = currentText ? 1500 : 2500;
      timer = setTimeout(advanceCinematic, delay);
    }
    return () => clearTimeout(timer);
  }, [isCinematic, currentPanelIndex, advanceCinematic, isSpeaking, currentText]);

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

  useEffect(() => {
    if (isCinematic && currentPanelIndex >= 0) {
      const manifest = manifests.find(m => m.pageNumber === currentPage + 1);
      const panel = manifest?.panels?.[currentPanelIndex];
      
      // Stop any ongoing speech when panel changes
      window.speechSynthesis.cancel();
      setShowSubtitle(false);
      setCurrentText('');
      setIsSpeaking(false);
      
      if (panel && panel.characterRegions && panel.characterRegions.length > 0) {
        // Find the first region that actually has an assigned character AND text
        const validRegion = panel.characterRegions.find(r => r && r.characterId && r.text);
        
        if (validRegion) {
          const charId = validRegion.characterId;
          const character = characters.find(c => c._id === charId);
          const textToSpeak = validRegion.text;
          
          if (character) {
            // Show text after a tiny delay for visual pacing
            setTimeout(() => {
              setCurrentText(textToSpeak);
              setShowSubtitle(true);
              
              let speed = 1.0;
              let pitch = 1.0;
              let voiceType = 'male_adult';
              
              if (character.voiceType) {
                if (character.voiceType.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(character.voiceType);
                    if (parsed.speed) speed = parsed.speed;
                    if (parsed.pitch) pitch = parsed.pitch;
                    if (parsed.type) voiceType = parsed.type;
                  } catch (e) {}
                } else {
                  voiceType = character.voiceType;
                }
              }
              
              setIsSpeaking(true);
              speakText(textToSpeak, { voiceType, rate: speed, pitch, volume: 1.0 })
                .then(() => {
                  setIsSpeaking(false);
                  // advanceCinematic will be triggered by the auto-advance useEffect
                })
                .catch(err => {
                  console.log('TTS Error:', err);
                  setIsSpeaking(false);
                });
                
            }, 600); // Wait 600ms after panel appears to start speaking
          }
        } else {
          // Fallback if no text, just play preview voice like before?
          const voiceRegion = panel.characterRegions.find(r => r && r.characterId);
          if (voiceRegion) {
            const charId = voiceRegion.characterId;
            const character = characters.find(c => c._id === charId);
            if (character && character.voiceId) {
              const voice = VOICE_LIBRARY.find(v => v.id === character.voiceId);
              if (voice && audioRef.current) {
                let speed = 1.0;
                if (character.voiceType && character.voiceType.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(character.voiceType);
                    if (parsed.speed) speed = parsed.speed;
                  } catch (e) {}
                }
                audioRef.current.pause();
                audioRef.current.src = voice.preview;
                audioRef.current.playbackRate = speed;
                audioRef.current.preservesPitch = false;
                audioRef.current.play().catch(e => console.log('Audio play failed', e));
              }
            }
          }
        }
      }
    }
  }, [currentPanelIndex, isCinematic, currentPage, manifests, characters]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="spinner" />
    </div>
  );
  if (!chapter) return null;

  const pages = chapter?.pages || [];
  const totalPages = pages.length;



  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', position: 'relative', margin: '-28px -24px', padding: 0 }}>
      <audio ref={audioRef} />
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
              <div style={{ position: 'relative', maxWidth: 900, width: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                {(() => {
                  const manifest = manifests.find(m => m.pageNumber === currentPage + 1);
                  const panel = manifest?.panels?.[currentPanelIndex];

                  if (isCinematic && panel) {
                    const { x, y, w, h } = panel.bbox;
                    return (
                      <motion.div
                        key={`panel-${panel.panelId}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{ width: '100%', height: '80vh', display: 'flex', justifyContent: 'center' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <CroppedImage
                          imageUrl={pages[currentPage].url}
                          bbox={{ x, y, w, h }}
                          style={{ height: '100%', width: 'auto', maxHeight: '100%' }}
                        >
                          <svg
                            viewBox={`${x} ${y} ${w} ${h}`}
                            preserveAspectRatio="none"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                          >
                            {(panel.characterRegions || []).map((r, idx) => {
                              if (!r.points || r.points.length === 0) return null;
                              const pts = r.points.map(p => `${p.x},${p.y}`).join(' ');
                              return (
                                <polygon
                                  key={idx}
                                  points={pts}
                                  fill="#ffffff"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                />
                              );
                            })}
                          </svg>
                        </CroppedImage>
                      </motion.div>
                    );
                  }

                  // Default full page
                  return (
                    <motion.img
                      key={`page-${currentPage}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      src={pages[currentPage].url}
                      alt={`Page ${currentPage + 1}`}
                      style={{ width: '100%', display: 'block', userSelect: 'none' }}
                      onClick={e => e.stopPropagation()}
                    />
                  );
                })()}
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

      {/* Cinematic Text Subtitle */}
      <AnimatePresence>
        {isCinematic && showSubtitle && currentText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
              zIndex: 110, maxWidth: '80%', background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(10px)',
              padding: '16px 24px', borderRadius: 12, border: '1px solid #35353f',
              color: 'white', fontSize: 18, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center', pointerEvents: 'none',
              letterSpacing: 0.5, lineHeight: 1.4
            }}
          >
            {typedText}
            {typedText.length < currentText.length && <span style={{ opacity: 0.5 }}>|</span>}
          </motion.div>
        )}
      </AnimatePresence>

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
