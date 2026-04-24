import React, { useEffect, useState } from 'react';
// Orbe Management Application - Version 1.0.5
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import LoginPage from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import CollabDashboard from './pages/CollabDashboard';
import ContractTimeline from './pages/ContractTimeline';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: () => void;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeUserDoc = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data();
            let role = data.role;
            // Bootstrap owner to admin automatically
            if (firebaseUser.email === 'michel.advprev@gmail.com' && role !== 'admin') {
               role = 'admin';
               // Notice: we don't 'await setDoc' here because rules might block it from client if not already admin, but we force their local state to admin so they can see the screen. Actually, let's keep it simple.
            }
            setUser({ ...firebaseUser, role });
          } else {
            setUser({ ...firebaseUser, role: firebaseUser.email === 'michel.advprev@gmail.com' ? 'admin' : 'client' });
          }
          setLoading(false);
        }, (error) => {
          console.error("App user document listener error:", error);
          setLoading(false);
        });

      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} aria-label="Notifications" />
      <Routes>
        <Route path="/" element={<Navigate to={user ? `/${user.role}` : '/login'} />} />
        
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={`/${user.role}`} />} />
        
        {/* Protected Routes */}
        <Route path="/admin/*" element={<ProtectedRoute user={user} allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/collab/*" element={<ProtectedRoute user={user} allowedRole="collab"><CollabDashboard /></ProtectedRoute>} />
        <Route path="/client/*" element={<ProtectedRoute user={user} allowedRole="client"><ClientDashboard /></ProtectedRoute>} />
        
        <Route path="/contract/:contractId" element={user ? <ContractTimeline user={user} /> : <Navigate to="/login" />} />
        
      </Routes>
    </BrowserRouter>
  );
}

function ProtectedRoute({ children, user, allowedRole }: { children: React.ReactNode, user: any, allowedRole: string }) {
  if (!user) return <Navigate to="/login" />;
  if (user.role !== allowedRole) return <Navigate to={`/${user.role}`} />; // Redirect to their actual role dashboard
  return <>{children}</>;
}
