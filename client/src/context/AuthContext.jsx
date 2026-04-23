import { createContext, useContext, useState, useEffect } from 'react';
import { account } from '../appwrite';
import { ID } from 'appwrite';
import api from '../config/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync with Appwrite Database backend
  const syncUser = async () => {
    try {
      const jwtObj = await account.createJWT();
      const token = jwtObj.jwt;
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const res = await api.post('/auth/login', { idToken: token });
      if (res.data.success) {
        setDbUser(res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, needsRegistration: res.data.needsRegistration };
    } catch (err) {
      const needsReg = err.response?.data?.needsRegistration;
      return { success: false, needsRegistration: needsReg };
    }
  };

  const register = async (email, password, username, displayName) => {
    try {
      await account.create(ID.unique(), email, password, displayName || username);
      await account.createEmailPasswordSession(email, password);
      const jwtObj = await account.createJWT();
      api.defaults.headers.common['Authorization'] = `Bearer ${jwtObj.jwt}`;
      
      const res = await api.post('/auth/register', { idToken: jwtObj.jwt, username, displayName });
      if (res.data.success) {
        setDbUser(res.data.user);
        setCurrentUser(await account.get());
      }
      return res.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      setCurrentUser(user);
      return await syncUser();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async (username) => {
    try {
      // NOTE: OAuth2 login redirects, so sync happens on auth state change
      account.createOAuth2Session('google', window.location.origin, window.location.origin + '/auth');
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setCurrentUser(null);
      setDbUser(null);
      delete api.defaults.headers.common['Authorization'];
      toast.success('Signed out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const resetPassword = async (email) => {
    return await account.createRecovery(email, window.location.origin + '/reset-password');
  };

  const refreshDbUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) setDbUser(res.data.user);
    } catch {}
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);
        await syncUser();
      } catch (error) {
        // Not logged in
        setCurrentUser(null);
        setDbUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Set up auto-refresh interceptor for JWT
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Create a fresh JWT
            const jwtObj = await account.createJWT();
            const token = jwtObj.jwt;
            
            // Update default headers for future requests
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Update the current failed request and retry
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // If refresh fails, user might actually be logged out
            return Promise.reject(error);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser, dbUser, loading,
      register, loginWithEmail, loginWithGoogle,
      logout, resetPassword, refreshDbUser,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
