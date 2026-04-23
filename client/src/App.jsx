import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Layout from './components/Layout';

const Home = lazy(() => import('./pages/Home'));
const Browse = lazy(() => import('./pages/Browse'));
const MangaDetail = lazy(() => import('./pages/MangaDetail'));
const Reader = lazy(() => import('./pages/Reader'));
const Upload = lazy(() => import('./pages/Upload'));
const Library = lazy(() => import('./pages/Library'));
const Profile = lazy(() => import('./pages/Profile'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PanelEditorPage = lazy(() => import('./components/PanelEditor/PanelEditorPage'));

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/auth" replace />;
};

function PageWrapper({ children }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      className="page-wrapper"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="browse" element={<PageWrapper><Browse /></PageWrapper>} />
            <Route path="manga/:id" element={<PageWrapper><MangaDetail /></PageWrapper>} />
            <Route path="manga/:mangaId/chapter/:chapterId" element={<Reader />} />
            <Route path="profile/:username" element={<PageWrapper><Profile /></PageWrapper>} />
            <Route path="auth" element={<PageWrapper><AuthPage /></PageWrapper>} />

            {/* Protected */}
            <Route path="upload" element={<ProtectedRoute><PageWrapper><Upload /></PageWrapper></ProtectedRoute>} />
            <Route path="upload/studio/:mangaId/:chapterId" element={<ProtectedRoute><PageWrapper><PanelEditorPage /></PageWrapper></ProtectedRoute>} />
            <Route path="library" element={<ProtectedRoute><PageWrapper><Library /></PageWrapper></ProtectedRoute>} />
            <Route path="dashboard" element={<ProtectedRoute><PageWrapper><Dashboard /></PageWrapper></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-3)',
              color: 'var(--text-0)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
            },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

function RouteFallback() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );
}


