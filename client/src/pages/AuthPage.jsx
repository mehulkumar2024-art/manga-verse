import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiAlertCircle, FiArrowRight, FiCheck } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { GiSamuraiHelmet } from 'react-icons/gi';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleUsername, setGoogleUsername] = useState('');
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' });
  const [error, setError] = useState('');
  const { loginWithEmail, loginWithGoogle, register, resetPassword, needsRegistration, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If we're already logged in and don't need registration, go home
    if (currentUser && !needsRegistration) {
      navigate('/');
    }
  }, [currentUser, needsRegistration, navigate]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const checkUsername = async (username) => {
    if (!username || username.length < 3) return false;
    try {
      const res = await api.get(`/auth/check-username/${username}`);
      return res.data.available;
    } catch { return false; }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await loginWithEmail(form.email, form.password);
      if (res.success) { 
        toast.success('Welcome back!'); 
        navigate('/'); 
      }
      else setError('Invalid email or password');
    } catch (err) {
      setError(appwriteError(err.code || err.message));
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.username.length < 3) return setError('Username must be at least 3 characters');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    
    setLoading(true); setError('');
    try {
      const available = await checkUsername(form.username);
      if (!available) {
        setLoading(false);
        return setError('Username already taken');
      }

      await register(form.email, form.password, form.username, form.displayName || form.username);
      toast.success('Account created! Welcome to the Verse.');
      navigate('/');
    } catch (err) {
      setError(appwriteError(err.code || err.message));
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true); setError('');
    try {
      await loginWithGoogle();
      // Redirect happens here
    } catch (err) {
      setError(appwriteError(err.code || err.message));
      setGoogleLoading(false);
    }
  };

  const handleGoogleRegister = async (e) => {
    e.preventDefault();
    if (!googleUsername || googleUsername.length < 3) return setError('Username must be at least 3 characters');
    
    setGoogleLoading(true); setError('');
    try {
      const available = await checkUsername(googleUsername);
      if (!available) {
        setGoogleLoading(false);
        return setError('Username already taken');
      }

      const res = await loginWithGoogle(googleUsername);
      if (res.success) { 
        toast.success('Account created!'); 
        navigate('/'); 
      }
    } catch (err) {
      setError(appwriteError(err.code || err.message));
    }
    setGoogleLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(form.email);
      toast.success('Reset email sent!');
      setMode('login');
    } catch (err) {
      setError(appwriteError(err.code || err.message));
    }
    setLoading(false);
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="page-wrapper" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '40px 20px',
      background: 'var(--bg-0)',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Decorative elements removed */}

      <div style={{ width: '100%', maxWidth: 420, zIndex: 1 }}>
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: 32 }}
        >
          <div style={{ 
            width: 72, height: 72, borderRadius: '20px', background: 'var(--bg-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', border: '1px solid var(--border)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
          }}>
            <GiSamuraiHelmet size={40} color="var(--accent)" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: 3, marginBottom: 4 }}>
            MANGA<span style={{ color: 'var(--accent)' }}>VERSE</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', fontWeight: 300 }}>
            {needsRegistration ? 'Final step to join the ranks' : 
             mode === 'login' ? 'Welcome back, Sensei' : 
             mode === 'register' ? 'Begin your artistic journey' : 'Recover your legacy'}
          </p>
        </motion.div>

        <motion.div
          layout
          className="card"
          style={{ 
            padding: 36, 
            background: 'rgba(20, 20, 31, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            borderRadius: 'var(--radius-xl)'
          }}
        >
          <AnimatePresence mode="wait">
            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                  background: 'rgba(232, 51, 74, 0.08)', border: '1px solid rgba(232, 51, 74, 0.2)',
                  borderRadius: 'var(--radius-md)', marginBottom: 24, fontSize: '0.85rem', color: '#ff6b6b'
                }}
              >
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} /> {error}
              </motion.div>
            )}

            {/* Content States */}
            {needsRegistration ? (
              <motion.div key="google-reg" {...pageVariants}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: 8, letterSpacing: 1 }}>
                  CHOOSE YOUR ALIAS
                </h3>
                <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: 24, lineHeight: 1.5 }}>
                  You're almost in. Pick a unique username to represent you in the Verse.
                </p>
                <form onSubmit={handleGoogleRegister}>
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Username</label>
                    <div style={{ position: 'relative' }}>
                      <FiUser style={iconStyle} />
                      <input
                        value={googleUsername}
                        onChange={e => { setGoogleUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setError(''); }}
                        placeholder="e.g. kishibe_rohan"
                        style={{ paddingLeft: 40, height: 48, background: 'rgba(0,0,0,0.2)' }}
                        required minLength={3}
                        autoFocus
                      />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiCheck size={12} /> Letters, numbers, and underscores only
                    </p>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 50, justifyContent: 'center', borderRadius: 'var(--radius-md)' }} disabled={googleLoading}>
                    {googleLoading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Complete Sign Up'}
                    {!googleLoading && <FiArrowRight />}
                  </button>
                </form>
              </motion.div>
            ) : mode === 'login' ? (
              <motion.div key="login" {...pageVariants}>
                <form onSubmit={handleLogin}>
                  <FormField label="Email Address" icon={<FiMail style={iconStyle} />}>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" style={{ paddingLeft: 40, height: 48, background: 'rgba(0,0,0,0.2)' }} required />
                  </FormField>
                  
                  <FormField label="Password" icon={<FiLock style={iconStyle} />}>
                    <input
                      type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="••••••••" style={{ paddingLeft: 40, paddingRight: 44, height: 48, background: 'rgba(0,0,0,0.2)' }} required
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-2)', padding: 4 }}>
                      {showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </FormField>

                  <div style={{ textAlign: 'right', marginBottom: 24, marginTop: -8 }}>
                    <button type="button" onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.8rem', cursor: 'pointer', transition: 'color 0.2s' }}>
                      Forgot password?
                    </button>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 50, justifyContent: 'center', borderRadius: 'var(--radius-md)', fontSize: '1rem' }} disabled={loading}>
                    {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Sign In'}
                  </button>

                  <Divider />
                  
                  <button type="button" onClick={handleGoogleLogin} disabled={googleLoading}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                      height: 50, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-0)', cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  >
                    <FcGoogle size={22} /> {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                  </button>

                  <p style={{ textAlign: 'center', marginTop: 28, fontSize: '0.9rem', color: 'var(--text-2)' }}>
                    Don't have an account?{' '}
                    <button type="button" onClick={() => setMode('register')}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, marginLeft: 4 }}>
                      Create One
                    </button>
                  </p>
                </form>
              </motion.div>
            ) : mode === 'register' ? (
              <motion.div key="register" {...pageVariants}>
                <form onSubmit={handleRegister}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <FormField label="Username" icon={<FiUser style={iconStyle} />}>
                      <input
                        value={form.username}
                        onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="user_name" style={{ paddingLeft: 40, height: 48, background: 'rgba(0,0,0,0.2)' }} required minLength={3}
                      />
                    </FormField>
                    <FormField label="Display Name" icon={<FiUser style={iconStyle} />}>
                      <input value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Full Name" style={{ paddingLeft: 40, height: 48, background: 'rgba(0,0,0,0.2)' }} />
                    </FormField>
                  </div>
                  
                  <FormField label="Email" icon={<FiMail style={iconStyle} />}>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" style={{ paddingLeft: 40, height: 48, background: 'rgba(0,0,0,0.2)' }} required />
                  </FormField>
                  
                  <FormField label="Password" icon={<FiLock style={iconStyle} />}>
                    <input
                      type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="Min 8 characters" style={{ paddingLeft: 40, paddingRight: 44, height: 48, background: 'rgba(0,0,0,0.2)' }} required minLength={8}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-2)', padding: 4 }}>
                      {showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </FormField>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 50, justifyContent: 'center', borderRadius: 'var(--radius-md)', fontSize: '1rem', marginTop: 8 }} disabled={loading}>
                    {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Create Account'}
                  </button>

                  <Divider />
                  
                  <button type="button" onClick={handleGoogleLogin} disabled={googleLoading}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                      height: 50, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-0)', cursor: 'pointer', fontSize: '0.95rem'
                    }}
                  >
                    <FcGoogle size={22} /> {googleLoading ? 'Redirecting...' : 'Sign up with Google'}
                  </button>

                  <p style={{ textAlign: 'center', marginTop: 28, fontSize: '0.9rem', color: 'var(--text-2)' }}>
                    Already a member?{' '}
                    <button type="button" onClick={() => setMode('login')}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, marginLeft: 4 }}>
                      Sign In
                    </button>
                  </p>
                </form>
              </motion.div>
            ) : (
              <motion.div key="reset" {...pageVariants}>
                <p style={{ color: 'var(--text-2)', marginBottom: 24, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Don't worry, even heroes forget things. Enter your email and we'll send you a recovery scroll.
                </p>
                <form onSubmit={handleReset}>
                  <FormField label="Email Address" icon={<FiMail style={iconStyle} />}>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" style={{ paddingLeft: 40, height: 48, background: 'rgba(0,0,0,0.2)' }} required />
                  </FormField>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 50, justifyContent: 'center', borderRadius: 'var(--radius-md)', fontSize: '1rem' }} disabled={loading}>
                    {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Send Recovery Link'}
                  </button>
                  <p style={{ textAlign: 'center', marginTop: 20 }}>
                    <button type="button" onClick={() => setMode('login')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                      Back to Sign In
                    </button>
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function FormField({ label, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        {icon}
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <span style={{ color: 'var(--text-3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>OR</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 };
const iconStyle = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none', zIndex: 2 };

function appwriteError(code) {
  const map = {
    'user_already_exists': 'This email is already in use.',
    'user_invalid_credentials': 'Invalid email or password.',
    'user_not_found': 'No account found with this email.',
    'password_too_short': 'Password must be at least 8 characters.',
    'user_password_mismatch': 'Invalid email or password.',
    'user_blocked': 'This account has been blocked.',
    'user_unauthorized': 'Please sign in to continue.',
    'user_session_already_exists': 'You are already signed in.',
  };
  
  // Handle string errors or code patterns
  const msg = typeof code === 'string' ? code.toLowerCase() : '';
  if (msg.includes('invalid credentials')) return map['user_invalid_credentials'];
  if (msg.includes('already exists')) return map['user_already_exists'];
  if (msg.includes('rate limit')) return 'Too many attempts. Please try again later.';
  
  return map[code] || 'An unexpected error occurred. Please try again.';
}

