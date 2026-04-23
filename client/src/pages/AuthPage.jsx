import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
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
  const [needUsername, setNeedUsername] = useState(false);
  const [googleUsername, setGoogleUsername] = useState('');
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' });
  const [error, setError] = useState('');
  const { loginWithEmail, loginWithGoogle, register, resetPassword } = useAuth();
  const navigate = useNavigate();

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
      if (res.success) { toast.success('Welcome back!'); navigate('/'); }
      else setError('Invalid credentials');
    } catch (err) {
      setError(firebaseError(err.code));
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.username.length < 3) return setError('Username must be at least 3 characters');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    const available = await checkUsername(form.username);
    if (!available) return setError('Username already taken');

    setLoading(true); setError('');
    try {
      await register(form.email, form.password, form.username, form.displayName || form.username);
      toast.success('Account created! Please verify your email.');
      navigate('/');
    } catch (err) {
      setError(firebaseError(err.code));
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true); setError('');
    try {
      const res = await loginWithGoogle();
      if (res.success) { toast.success('Welcome!'); navigate('/'); }
      else if (res.needsRegistration) { setNeedUsername(true); }
    } catch (err) {
      setError(firebaseError(err.code));
    }
    setGoogleLoading(false);
  };

  const handleGoogleRegister = async (e) => {
    e.preventDefault();
    if (!googleUsername || googleUsername.length < 3) return setError('Username must be at least 3 characters');
    const available = await checkUsername(googleUsername);
    if (!available) return setError('Username already taken');

    setGoogleLoading(true); setError('');
    try {
      const res = await loginWithGoogle(googleUsername);
      if (res.success) { toast.success('Account created!'); navigate('/'); }
    } catch (err) {
      setError(firebaseError(err.code));
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
      setError(firebaseError(err.code));
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '80vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '40px 0'
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <GiSamuraiHelmet size={48} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', letterSpacing: 2 }}>
            MANGA<span style={{ color: 'var(--accent)' }}>VERSE</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginTop: 6 }}>
            {mode === 'login' && 'Welcome back, artist'}
            {mode === 'register' && 'Join the community'}
            {mode === 'reset' && 'Reset your password'}
          </p>
        </div>

        <motion.div
          key={mode + String(needUsername)}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ padding: 32 }}
        >
          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              background: 'rgba(232,51,74,0.1)', border: '1px solid rgba(232,51,74,0.3)',
              borderRadius: 'var(--radius-sm)', marginBottom: 20, fontSize: '0.875rem', color: 'var(--accent)'
            }}>
              <FiAlertCircle /> {error}
            </div>
          )}

          {/* Google username prompt */}
          {needUsername ? (
            <form onSubmit={handleGoogleRegister}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: 8, letterSpacing: 1 }}>
                CHOOSE A USERNAME
              </h3>
              <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: 20 }}>
                One last step — pick your username to continue with Google.
              </p>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Username</label>
                <div style={{ position: 'relative' }}>
                  <FiUser style={iconStyle} />
                  <input
                    value={googleUsername}
                    onChange={e => { setGoogleUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setError(''); }}
                    placeholder="your_username"
                    style={{ paddingLeft: 36 }}
                    required minLength={3}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>Letters, numbers, and underscores only</p>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} disabled={googleLoading}>
                {googleLoading ? 'Creating account...' : 'Complete Sign Up'}
              </button>
            </form>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin}>
              <FormField label="Email" icon={<FiMail style={iconStyle} />}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="artist@example.com" style={{ paddingLeft: 36 }} required />
              </FormField>
              <FormField label="Password" icon={<FiLock style={iconStyle} />}>
                <input
                  type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="••••••••" style={{ paddingLeft: 36, paddingRight: 40 }} required
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-2)' }}>
                  {showPass ? <FiEyeOff /> : <FiEye />}
                </button>
              </FormField>
              <div style={{ textAlign: 'right', marginBottom: 20, marginTop: -8 }}>
                <button type="button" onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <Divider />
              <button type="button" onClick={handleGoogleLogin} disabled={googleLoading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: 12, background: 'var(--bg-3)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-0)', cursor: 'pointer', fontSize: '0.9rem'
                }}>
                <FcGoogle size={20} /> {googleLoading ? 'Loading...' : 'Continue with Google'}
              </button>

              <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--text-2)' }}>
                No account?{' '}
                <button type="button" onClick={() => setMode('register')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                  Sign Up
                </button>
              </p>
            </form>
          ) : mode === 'register' ? (
            <form onSubmit={handleRegister}>
              <FormField label="Username" icon={<FiUser style={iconStyle} />}>
                <input
                  value={form.username}
                  onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_username" style={{ paddingLeft: 36 }} required minLength={3}
                />
              </FormField>
              <FormField label="Display Name" icon={<FiUser style={iconStyle} />}>
                <input value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Your Name" style={{ paddingLeft: 36 }} />
              </FormField>
              <FormField label="Email" icon={<FiMail style={iconStyle} />}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="artist@example.com" style={{ paddingLeft: 36 }} required />
              </FormField>
              <FormField label="Password" icon={<FiLock style={iconStyle} />}>
                <input
                  type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="At least 6 characters" style={{ paddingLeft: 36 }} required minLength={6}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-2)' }}>
                  {showPass ? <FiEyeOff /> : <FiEye />}
                </button>
              </FormField>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 4 }} disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <Divider />
              <button type="button" onClick={handleGoogleLogin} disabled={googleLoading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: 12, background: 'var(--bg-3)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-0)', cursor: 'pointer', fontSize: '0.9rem'
                }}>
                <FcGoogle size={20} /> {googleLoading ? 'Loading...' : 'Sign up with Google'}
              </button>

              <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--text-2)' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                  Sign In
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleReset}>
              <p style={{ color: 'var(--text-1)', marginBottom: 20, fontSize: '0.9rem', lineHeight: 1.6 }}>
                Enter your email address and we'll send you a reset link.
              </p>
              <FormField label="Email" icon={<FiMail style={iconStyle} />}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="artist@example.com" style={{ paddingLeft: 36 }} required />
              </FormField>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
              <p style={{ textAlign: 'center', marginTop: 16 }}>
                <button type="button" onClick={() => setMode('login')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.875rem' }}>
                  Back to Sign In
                </button>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function FormField({ label, icon, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>or</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 6, fontWeight: 500 };
const iconStyle = { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)', pointerEvents: 'none' };

function firebaseError(code) {
  const map = {
    'auth/email-already-in-use': 'Email already in use',
    'auth/invalid-email': 'Invalid email',
    'auth/user-not-found': 'No account with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/weak-password': 'Password too weak (min 6 chars)',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/popup-closed-by-user': 'Google sign-in cancelled',
    'auth/invalid-credential': 'Invalid email or password',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
