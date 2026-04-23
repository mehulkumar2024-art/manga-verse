import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiTrendingUp, FiStar, FiClock } from 'react-icons/fi';
import { GiSamuraiHelmet } from 'react-icons/gi';
import api from '../config/api';
import MangaCard from '../components/MangaCard';

const GENRES = [
  'Action','Adventure','Fantasy','Romance','Horror',
  'Sci-Fi','Mystery','Comedy','Slice of Life','Psychological'
];

import { useMotionValue, useTransform, useSpring } from 'framer-motion';

export default function Home() {
  const [trending, setTrending] = useState([]);
  const [newest, setNewest] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  // Parallax values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [15, -15]), { damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-15, 15]), { damping: 20 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [trendRes, newRes, featRes] = await Promise.all([
          api.get('/manga/trending'),
          api.get('/manga?sort=newest&limit=12'),
          api.get('/manga/featured'),
        ]);
        setTrending(trendRes.data.manga || []);
        setNewest(newRes.data.manga || []);
        setFeatured(featRes.data.manga || []);
      } catch {}
      setLoading(false);
    };
    fetchAll();
  }, []);

  const hero = featured[0] || trending[0];

  return (
    <div className="fade-up">
      {/* Hero */}
      <section 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative', borderRadius: 'var(--radius-xl)',
          overflow: 'hidden', marginBottom: 48, minHeight: 450,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          perspective: 1000
        }}
      >
        {hero?.coverImage && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <img src={hero.coverImage} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3, filter: 'blur(2px)' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(10,10,15,0.97) 0%, rgba(10,10,15,0.6) 100%)'
            }} />
            <div className="speedlines" />
          </div>
        )}

        <div style={{ position: 'relative', padding: '60px 40px', display: 'flex', alignItems: 'center', minHeight: 450 }}>
          <div style={{ flex: 1, maxWidth: 560 }}>
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <GiSamuraiHelmet size={24} color="var(--accent)" />
                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: 2, textTransform: 'uppercase' }}>
                  Original Works Only
                </span>
              </div>
              <h1 className="glitch-effect" style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                lineHeight: 1, letterSpacing: 2, marginBottom: 16
              }}>
                WHERE MANGA<br />
                <span style={{ color: 'var(--accent)' }}>ARTISTS</span> SHINE
              </h1>
              <p style={{ color: 'var(--text-1)', fontSize: '1rem', marginBottom: 28, maxWidth: 440, lineHeight: 1.7 }}>
                Discover, read, and support original manga from independent artists worldwide.
                Share your own story with the world.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/browse" className="btn btn-primary" style={{ fontSize: '1rem', padding: '12px 28px', background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))' }}>
                    Explore Manga <FiArrowRight />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/upload" className="btn btn-ghost" style={{ fontSize: '1rem', padding: '12px 28px' }}>
                    Upload Your Work
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Featured manga cover with 3D Parallax */}
          {hero && (
            <motion.div
              style={{ 
                flex: '0 0 auto', marginLeft: 'auto', display: 'none',
                rotateX, rotateY, transformStyle: 'preserve-3d'
              }}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, type: "spring" }}
              className="hero-cover"
            >
              <Link to={`/manga/${hero._id}`} style={{
                display: 'block', width: 240, borderRadius: 'var(--radius-md)',
                overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                border: '4px solid var(--accent)', position: 'relative'
              }} className="manga-panel">
                 <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 40px rgba(232,51,74,0.5)', pointerEvents: 'none', zIndex: 1 }} />
                <motion.img 
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                  src={hero.coverImage} alt={hero.title}
                  style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover' }}
                />
              </Link>
            </motion.div>
          )}
        </div>
      </section>


      {/* Genre pills */}
      <section style={{ marginBottom: 44 }}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          <Link to="/browse" className="btn btn-primary" style={{ flexShrink: 0, padding: '8px 18px', fontSize: '0.83rem' }}>
            All
          </Link>
          {GENRES.map(g => (
            <Link key={g} to={`/browse?genre=${g}`} className="btn btn-ghost"
              style={{ flexShrink: 0, padding: '8px 18px', fontSize: '0.83rem' }}>
              {g}
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section style={{ marginBottom: 52 }}>
        <div className="section-header">
          <h2 className="section-title">
            <FiTrendingUp style={{ verticalAlign: 'middle', marginRight: 10, color: 'var(--accent)' }} />
            <span>Trending</span>
          </h2>
          <Link to="/browse?sort=popular" className="btn btn-ghost" style={{ fontSize: '0.83rem' }}>
            View All <FiArrowRight />
          </Link>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="manga-grid">
            {trending.slice(0, 10).map((m, i) => <MangaCard key={m._id} manga={m} index={i} />)}
          </div>
        )}
      </section>

      {/* New Releases */}
      <section style={{ marginBottom: 52 }}>
        <div className="section-header">
          <h2 className="section-title">
            <FiClock style={{ verticalAlign: 'middle', marginRight: 10, color: 'var(--gold)' }} />
            New <span>Releases</span>
          </h2>
          <Link to="/browse?sort=newest" className="btn btn-ghost" style={{ fontSize: '0.83rem' }}>
            View All <FiArrowRight />
          </Link>
        </div>
        {!loading && (
          <div className="manga-grid">
            {newest.slice(0, 10).map((m, i) => <MangaCard key={m._id} manga={m} index={i} />)}
          </div>
        )}
      </section>

      {/* CTA for artists */}
      <section style={{
        background: 'linear-gradient(135deg, var(--bg-2), var(--bg-3))',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)',
        padding: '48px 40px', textAlign: 'center'
      }}>
        <FiStar size={36} color="var(--gold)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: 12, letterSpacing: 1 }}>
          ARE YOU A MANGA <span style={{ color: 'var(--accent)' }}>ARTIST?</span>
        </h2>
        <p style={{ color: 'var(--text-1)', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
          Share your original work with thousands of readers. Build your audience and get the recognition you deserve.
        </p>
        <Link to="/upload" className="btn btn-gold" style={{ fontSize: '1rem', padding: '14px 36px' }}>
          Start Publishing Today
        </Link>
      </section>

      <style>{`
        @media (min-width: 700px) {
          .hero-cover { display: block !important; }
        }
      `}</style>
    </div>
  );
}
