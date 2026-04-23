import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiUsers, FiBookOpen } from 'react-icons/fi';
import { MdMenuBook } from 'react-icons/md';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import MangaCard from '../components/MangaCard';
import toast from 'react-hot-toast';

export default function Profile() {
  const { username } = useParams();
  const { currentUser, dbUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [manga, setManga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  const isOwn = dbUser?.username === username;

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/users/${username}`);
        setProfile(res.data.user);
        setManga(res.data.manga || []);
        if (dbUser && res.data.user) {
          setFollowing(res.data.user.followers?.includes(dbUser._id));
        }
      } catch {}
      setLoading(false);
    };
    fetch();
  }, [username, dbUser]);

  const handleFollow = async () => {
    if (!currentUser) return toast.error('Sign in to follow');
    try {
      const res = await api.post(`/users/${profile._id}/follow`);
      setFollowing(res.data.following);
      setProfile(p => ({
        ...p,
        followers: res.data.following
          ? [...(p.followers || []), dbUser._id]
          : (p.followers || []).filter(id => id !== dbUser._id)
      }));
      toast.success(res.data.following ? 'Following!' : 'Unfollowed');
    } catch { toast.error('Failed'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
      <div className="spinner" />
    </div>
  );

  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-2)' }}>
      <FiUser size={48} style={{ margin: '0 auto 16px', display: 'block' }} />
      <p>User not found</p>
    </div>
  );

  return (
    <div className="fade-up">
      {/* Profile banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-2), var(--bg-3))',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)',
        padding: '36px 32px', marginBottom: 36,
        display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap'
      }}>
        {/* Avatar */}
        <div style={{
          width: 96, height: 96, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.2rem', fontWeight: 700, border: '3px solid var(--border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          {profile.avatar
            ? <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : profile.username?.[0]?.toUpperCase()
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: 1 }}>
              {profile.displayName || profile.username}
            </h1>
            {profile.isArtist && (
              <span className="badge" style={{ background: 'rgba(232,51,74,0.15)', color: 'var(--accent)', border: '1px solid rgba(232,51,74,0.3)' }}>
                ✦ ARTIST
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: 14 }}>@{profile.username}</p>

          {profile.bio && (
            <p style={{ color: 'var(--text-1)', lineHeight: 1.7, maxWidth: 500, marginBottom: 16, fontSize: '0.9rem' }}>
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 16 }}>
            <ProfileStat icon={<MdMenuBook />} value={manga.length} label="Manga" />
            <ProfileStat icon={<FiUsers />} value={profile.followers?.length || 0} label="Followers" />
            <ProfileStat icon={<FiUsers />} value={profile.following?.length || 0} label="Following" />
          </div>

          {/* Action */}
          {!isOwn && (
            <button
              onClick={handleFollow}
              className={`btn ${following ? 'btn-ghost' : 'btn-primary'}`}
              style={{ padding: '9px 24px' }}
            >
              <FiUsers size={15} /> {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Manga section */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: 1, marginBottom: 20 }}>
          {isOwn ? 'YOUR' : `${profile.displayName || profile.username}'s`} <span style={{ color: 'var(--accent)' }}>WORKS</span>
          <span style={{ color: 'var(--text-3)', fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 400, marginLeft: 10 }}>
            ({manga.length})
          </span>
        </h2>

        {manga.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 0', color: 'var(--text-2)',
            background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)'
          }}>
            <FiBookOpen size={40} style={{ margin: '0 auto 14px', display: 'block', color: 'var(--text-3)' }} />
            <p>{isOwn ? "You haven't published any manga yet." : 'No published manga yet.'}</p>
          </div>
        ) : (
          <div className="manga-grid">
            {manga.map((m, i) => <MangaCard key={m._id} manga={m} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileStat({ icon, value, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: 'var(--accent)', display: 'flex' }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{value}</span>
      <span style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>{label}</span>
    </div>
  );
}
