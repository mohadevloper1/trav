import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ViewProfile from './pages/ViewProfile';
import Messages from './pages/Messages';
import Support from './pages/Support';
import Admin from './pages/Admin';
import Layout from './components/Layout';
import OfflineGuard from './components/OfflineGuard';
import SecurityGuard from './components/SecurityGuard';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-xs">Loading application...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <OfflineGuard>
        <SecurityGuard>
          <Router>
            <AuthProvider>
              <Routes>
                {/* ... existing routes ... */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<Layout />}>
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <Home />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/user/:userId" 
                    element={
                      <ProtectedRoute>
                        <ViewProfile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/messages" 
                    element={
                      <ProtectedRoute>
                        <Messages />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/messages/:id" 
                    element={
                      <ProtectedRoute>
                        <Messages />
                      </ProtectedRoute>
                    } 
                  />
                   <Route 
                    path="/support" 
                    element={
                      <ProtectedRoute>
                        <Support />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute>
                        <Admin />
                      </ProtectedRoute>
                    } 
                  />
                </Route>
              </Routes>
            </AuthProvider>
          </Router>
        </SecurityGuard>
      </OfflineGuard>
    </ThemeProvider>
  );
}
