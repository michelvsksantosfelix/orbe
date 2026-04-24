import React, { useEffect, useState } from 'react';
// Orbe Management Application - Version 1.0.6
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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  constructor(props: any) {
    super(props);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Ops! Algo deu errado.</h1>
          <p className="text-red-700 mb-6">Ocorreu um erro inesperado no aplicativo. Por favor, tente atualizar a página.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: () => void;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeUserDoc = onSnapshot(userRef, async (userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data();
            let role = data.role;
            // Bootstrap owner to admin automatically
            if (firebaseUser.email === 'michel.advprev@gmail.com' && role !== 'admin') {
               role = 'admin';
            }
            setUser({ ...firebaseUser, role });
          } else {
            console.error("User document does not exist for:", firebaseUser.uid);
            setUser(null); // Force logout or show unauthorized
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
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} aria-label="Notifications" />
        <Routes>
          <Route path="/" element={<Navigate to={user ? `/${user.role}` : '/login'} />} />
          
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={`/${user.role}`} />} />
          
          {/* Protected Routes */}
          <Route path="/admin/*" element={<ProtectedRoute user={user} allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/colaborador/*" element={<ProtectedRoute user={user} allowedRoles={['admin', 'vendedor', 'instalador', 'tecnico_piscina', 'entregador']}><CollabDashboard /></ProtectedRoute>} />
          <Route path="/client/*" element={<ProtectedRoute user={user} allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>} />
          
          <Route path="/contract/:contractId" element={user ? <ContractTimeline user={user} /> : <Navigate to="/login" />} />
          
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function ProtectedRoute({ children, user, allowedRoles }: { children: React.ReactNode, user: any, allowedRoles: string[] }) {
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={`/${user.role === 'admin' ? 'admin' : 'colaborador'}`} />; // Redirect to their actual role dashboard
  return <>{children}</>;
}
