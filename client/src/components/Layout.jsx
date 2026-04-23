import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome, FiCompass, FiBookmark, FiUpload, FiUser,
  FiMenu, FiX, FiSearch, FiLogOut, FiGrid, FiChevronDown
} from 'react-icons/fi';
import { GiSamuraiHelmet } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const GENRES = [
  'Action','Adventure','Comedy','Drama','Fantasy','Horror',
  'Mystery','Romance','Sci-Fi','Slice of Life','Sports',
  'Supernatural','Thriller','Historical','Isekai','Mecha',
  'Psychological','Shounen','Shoujo','Seinen','Josei'
];

const navItems = [
  { to: '/', icon: FiHome, label: 'Home' },
  { to: '/browse', icon: FiCompass, label: 'Browse' },
  { to: '/library', icon: FiBookmark, label: 'Library' },
  { to: '/upload', icon: FiUpload, label: 'Upload' },
  { to: '/dashboard', icon: FiGrid, label: 'Dashboard' },
];

export default function Layout() {
  const { currentUser, dbUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreOpen, setGenreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      setSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Sidebar overlay (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              zIndex: 40, backdropFilter: 'blur(4px)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen) && (
          <motion.aside
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: 'var(--sidebar-width)', background: 'var(--bg-1)',
              borderRight: '1px solid var(--border)', zIndex: 50,
              display: 'flex', flexDirection: 'column', overflowY: 'auto'
            }}
          >
            <SidebarContent
              onClose={() => setSidebarOpen(false)}
              isActive={isActive}
              genreOpen={genreOpen}
              setGenreOpen={setGenreOpen}
              navigate={navigate}
              setSidebarOpen={setSidebarOpen}
              currentUser={currentUser}
              handleLogout={handleLogout}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar - always visible */}
      <aside style={{
        width: 'var(--sidebar-width)', flexShrink: 0,
        background: 'var(--bg-1)', borderRight: '1px solid var(--border)',
        display: 'none', flexDirection: 'column', overflowY: 'auto',
        position: 'sticky', top: 0, height: '100vh'
      }} className="desktop-sidebar">
        <SidebarContent
          isActive={isActive}
          genreOpen={genreOpen}
          setGenreOpen={setGenreOpen}
          navigate={navigate}
          setSidebarOpen={setSidebarOpen}
          currentUser={currentUser}
          handleLogout={handleLogout}
        />
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top nav */}
        <header style={{
          height: 'var(--nav-height)', background: 'var(--bg-1)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '0 20px', position: 'sticky', top: 0, zIndex: 30,
          backdropFilter: 'blur(12px)'
        }}>
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn btn-ghost"
            style={{ padding: '8px', display: 'flex' }}
          >
            <FiMenu size={20} />
          </button>

          {/* Logo (mobile) */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
            <GiSamuraiHelmet size={28} color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: 2 }}>
              MANGA<span style={{ color: 'var(--accent)' }}>VERSE</span>
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 460, display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <FiSearch style={{
                position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-2)'
              }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search manga, artists, genres..."
                style={{ paddingLeft: 36, height: 40 }}
              />
            </div>
          </form>

          {/* User area */}
          <div style={{ position: 'relative' }}>
            {currentUser ? (
              <>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--bg-3)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '6px 12px',
                    cursor: 'pointer', color: 'var(--text-0)'
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--accent)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 600
                  }}>
                    {dbUser?.avatar
                      ? <img src={dbUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (dbUser?.username?.[0] || '?').toUpperCase()
                    }
                  </div>
                  <span style={{ fontSize: '0.85rem', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dbUser?.username}
                  </span>
                  <FiChevronDown size={14} color="var(--text-2)" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                        background: 'var(--bg-2)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', padding: 8, minWidth: 180,
                        zIndex: 100, boxShadow: 'var(--shadow-card)'
                      }}
                    >
                      {[
                        { label: 'Profile', to: `/profile/${dbUser?.username}` },
                        { label: 'Library', to: '/library' },
                        { label: 'Dashboard', to: '/dashboard' },
                        { label: 'Upload Manga', to: '/upload' },
                      ].map(item => (
                        <Link key={item.to} to={item.to}
                          onClick={() => setUserMenuOpen(false)}
                          style={{
                            display: 'block', padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)', color: 'var(--text-1)',
                            fontSize: '0.875rem', transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {item.label}
                        </Link>
                      ))}
                      <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                      <button
                        onClick={handleLogout}
                        style={{
                          width: '100%', textAlign: 'left', padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)', color: 'var(--accent)',
                          fontSize: '0.875rem', background: 'none', border: 'none',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                        }}
                      >
                        <FiLogOut size={14} /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link to="/auth" className="btn btn-primary">Sign In</Link>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '28px 24px', position: 'relative' }}>
          <Outlet />
          
          {/* AI Mascot (MangaBot) */}
          <motion.div
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: 'fixed', bottom: 30, right: 30, zIndex: 200,
              cursor: 'grab'
            }}
          >
            <div style={{ position: 'relative' }}>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'var(--accent)', border: '2px solid white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 32px var(--accent-glow)',
                  fontSize: '1.5rem'
                }}
                onClick={() => toast.success('MangaBot: "I am ready for the ML update!"')}
              >
                🤖
              </motion.div>
              <div style={{
                position: 'absolute', top: -10, right: -10,
                background: 'var(--gold)', color: '#000', fontSize: '0.6rem',
                padding: '2px 6px', borderRadius: 10, fontWeight: 900,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                ML-READY
              </div>
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid var(--border)', padding: '24px',
          textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem'
        }}>
          <span style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)', letterSpacing: 2 }}>MANGAVERSE</span>
          {' '} — Supporting original manga artists worldwide © 2025
        </footer>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .desktop-sidebar { display: flex !important; }
          header button:first-child { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function SidebarContent({ onClose, isActive, genreOpen, setGenreOpen, navigate, setSidebarOpen, currentUser, handleLogout }) {
  return (
    <>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 0', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between'
      }}>
        <Link to="/" onClick={() => setSidebarOpen?.(false)} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GiSamuraiHelmet size={32} color="var(--accent)" />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: 2, lineHeight: 1 }}>
              MANGA<span style={{ color: 'var(--accent)' }}>VERSE</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', letterSpacing: 1 }}>ORIGINAL WORKS</div>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
            <FiX size={18} />
          </button>
        )}
      </div>

      <nav style={{ padding: '28px 12px', flex: 1 }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to} to={to}
            onClick={() => setSidebarOpen?.(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 'var(--radius-sm)',
              marginBottom: 4, fontSize: '0.9rem', fontWeight: 500,
              color: isActive(to) ? 'var(--text-0)' : 'var(--text-2)',
              background: isActive(to) ? 'var(--bg-3)' : 'transparent',
              borderLeft: isActive(to) ? '3px solid var(--accent)' : '3px solid transparent',
              transition: 'all 0.15s'
            }}
          >
            <Icon size={18} /> {label}
            {isActive(to) && (
              <span style={{
                marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent)'
              }} />
            )}
          </Link>
        ))}

        {/* Genres Dropdown */}
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => setGenreOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-3)',
              background: 'none', border: 'none', cursor: 'pointer',
              letterSpacing: 1, textTransform: 'uppercase'
            }}
          >
            <FiCompass size={14} />
            Genres
            <motion.span
              animate={{ rotate: genreOpen ? 180 : 0 }}
              style={{ marginLeft: 'auto', display: 'flex' }}
            >
              <FiChevronDown size={14} />
            </motion.span>
          </button>

          <AnimatePresence>
            {genreOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ paddingLeft: 8 }}>
                  {GENRES.map(genre => (
                    <Link
                      key={genre}
                      to={`/browse?genre=${genre}`}
                      onClick={() => setSidebarOpen?.(false)}
                      style={{
                        display: 'block', padding: '7px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.83rem', color: 'var(--text-2)',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-0)'; e.currentTarget.style.background = 'var(--bg-3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      {genre}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {currentUser && (
        <div style={{ padding: '0 20px 18px' }}>
          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              color: 'var(--accent)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <FiLogOut size={16} /> Sign Out
          </button>
        </div>
      )}

      {!currentUser && (
        <div style={{ padding: '0 20px 18px' }}>
          <Link
            to="/auth"
            onClick={() => setSidebarOpen?.(false)}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Sign In / Create Account
          </Link>
        </div>
      )}

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-3)' }}>
        For original manga artists ✦ Read & Share
      </div>
    </>
  );
}
