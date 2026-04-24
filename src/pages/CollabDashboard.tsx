import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { LogOut, ClipboardList, ChevronRight } from 'lucide-react';

export default function CollabDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    // We would need a collectionGroup query or similar to get all steps across all contracts, 
    // but without an index that might fail. 
    // For simplicity, we can fetch all active contracts first and then their steps, or assume Collab sees all active contracts they have access to.
    
    // In this MVP, we will fetch contracts (all active) and then filter.
    // NOTE: This is a hacky workaround without Collection Group indices.
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "contracts"), where("status", "==", "active"));
        const snapshot = await getDocs(q);
        setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("CollabDashboard fetchTasks error:", error);
        // If permission denied, it's likely because the user is not admin and trying to list all contracts
        // This is a known limitation in the current MVP without assigned contracts
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [user]);

  const handleLogout = () => {
    auth.signOut().then(() => navigate('/login'));
  };

  return (
    <div className="p-4 md:p-8 bg-transparent min-h-screen max-w-7xl mx-auto">
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Painel do Colaborador</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Veja os serviços sob sua responsabilidade.</p>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium self-end sm:self-auto -mt-10 sm:mt-0">
          <LogOut size={20} /> Sair
        </button>
      </header>

      <div className="grid gap-4">
        {tasks.map(contract => (
          <div key={contract.id} onClick={() => navigate(`/contract/${contract.id}`)} className="glass-card p-6 rounded-3xl flex justify-between items-center cursor-pointer hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="glass-panel p-3 rounded-full text-blue-600">
                <ClipboardList />
              </div>
              <div>
                 <h2 className="font-semibold text-lg text-gray-900">{contract.clientName}</h2>
                 <p className="text-sm text-gray-500 mb-1">Produto: {contract.productName}</p>
                 <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Acessar Cronograma</span>
              </div>
            </div>
            <ChevronRight className="text-gray-400" />
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-12 glass-card rounded-3xl border-white/50 border-dashed">
            <p className="text-gray-500">Nenhum serviço pendente no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
