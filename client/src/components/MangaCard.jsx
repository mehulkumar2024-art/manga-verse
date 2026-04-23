import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiEye, FiHeart, FiBookmark, FiUploadCloud } from 'react-icons/fi';

export default function MangaCard({ manga, index = 0, uploading = false, uploadProgress = 0 }) {
  const statusClass = {
    Ongoing: 'badge-status-ongoing',
    Completed: 'badge-status-completed',
    Hiatus: 'badge-status-hiatus',
    Cancelled: 'badge-status-cancelled',
  }[manga.status] || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
    >
      <Link to={`/manga/${manga._id}`} className="card manga-panel" style={{ display: 'block', position: 'relative' }}>
        {/* Cover */}
        <div style={{ position: 'relative', paddingBottom: '142%', background: 'var(--bg-3)' }}>
          {manga.coverImage ? (
            <img
              src={manga.coverImage}
              alt={manga.title}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', opacity: uploading ? 0.4 : 1
              }}
              loading="lazy"
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '3rem', color: 'var(--text-3)', opacity: uploading ? 0.4 : 1
            }}>📖</div>
          )}

          {/* Status badge */}
          {manga.status && !uploading && (
            <div style={{ position: 'absolute', top: 8, left: 8 }}>
              <span className={`badge ${statusClass}`} style={{ fontSize: '0.65rem' }}>
                {manga.status}
              </span>
            </div>
          )}

          {/* Uploading badge */}
          {uploading && (
            <div style={{ position: 'absolute', top: 8, left: 8 }}>
              <span className="badge" style={{ 
                fontSize: '0.65rem',
                background: 'var(--accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <FiUploadCloud size={11} /> Uploading
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '50%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
            pointerEvents: 'none'
          }} />

          {/* Uploading overlay with progress */}
          {uploading && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 10
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                border: '3px solid var(--accent)',
                borderTop: '3px solid transparent',
                animation: 'spin 1s linear infinite',
                marginBottom: 12
              }} />
              <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                {uploadProgress}%
              </div>
              <div style={{
                marginTop: 8,
                width: '80%',
                height: 4,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                <motion.div
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                  style={{
                    height: '100%',
                    background: 'var(--accent)',
                    borderRadius: 2
                  }}
                />
              </div>
            </div>
          )}

          {/* Stats overlay */}
          {!uploading && (
            <div style={{
              position: 'absolute', bottom: 8, left: 8, right: 8,
              display: 'flex', gap: 10
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>
                <FiEye size={11} /> {formatNum(manga.views)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>
                <FiHeart size={11} /> {formatNum(manga.likes)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '10px 12px 12px' }}>
          <div style={{
            fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.3,
            marginBottom: 4, color: 'var(--text-0)',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
          }}>
            {manga.title}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
            {manga.author?.displayName || manga.author?.username}
          </div>
          {manga.genres?.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {manga.genres.slice(0, 2).map(g => (
                <span key={g} className="badge badge-genre" style={{ fontSize: '0.62rem' }}>{g}</span>
              ))}
            </div>
          )}
        </div>
      </Link>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}

function formatNum(n = 0) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}
