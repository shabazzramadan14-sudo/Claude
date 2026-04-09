import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Layout
import Navbar from './components/Navbar';

// Pages
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import LiveStreamPage from './pages/LiveStreamPage';
import ContentPage from './pages/ContentPage';
import ProviderProfilePage from './pages/ProviderProfilePage';
import BrowsePage from './pages/BrowsePage';
import MyLibraryPage from './pages/MyLibraryPage';
import ProviderDashboard from './pages/ProviderDashboard';

// Protected route — requires auth
const PrivateRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner" /></div>;
  return isLoggedIn ? children : <Navigate to="/auth" replace />;
};

// Protected route — requires provider role
const ProviderRoute = ({ children }) => {
  const { isProvider, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner" /></div>;
  return isProvider ? children : <Navigate to="/" replace />;
};

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/live" element={<BrowsePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/stream/:id" element={<LiveStreamPage />} />
        <Route path="/content/:id" element={<ContentPage />} />
        <Route path="/provider/:id" element={<ProviderProfilePage />} />

        {/* Authenticated routes */}
        <Route path="/my-library" element={<PrivateRoute><MyLibraryPage /></PrivateRoute>} />

        {/* Provider-only routes */}
        <Route path="/provider/dashboard" element={<ProviderRoute><ProviderDashboard /></ProviderRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}
