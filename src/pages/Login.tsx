import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Waves } from 'lucide-react';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        let role = userData.role;
        if (user.email === 'michel.advprev@gmail.com') role = 'admin';
        
        if (role === 'admin') navigate('/admin');
        else if (role === 'collab') navigate('/collab');
        else navigate('/client');
      } else {
        const newRole = user.email === 'michel.advprev@gmail.com' ? 'admin' : 'client';
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || 'Novo Cliente',
          email: user.email,
          role: newRole,
        });
        navigate(newRole === 'admin' ? '/admin' : '/client');
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast.error("Erro ao autenticar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center flex-col items-center">
          <Waves className="mx-auto h-16 w-16 text-blue-600 mb-4" />
          <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
            Orbe Piscinas
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Acompanhe o seu sonho do primeiro contato até o primeiro mergulho
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-panel py-8 px-4 rounded-3xl sm:px-10">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? 'Acessando...' : 'Entrar com o Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
