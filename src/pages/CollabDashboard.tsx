import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { LogOut, ClipboardList, ChevronRight } from 'lucide-react';

export default function CollabDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserRole(userSnap.data().role);
      }
    };
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (!user || userRole === '') return;
    
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const contractsRef = collection(db, "contracts");
        const snapshot = await getDocs(contractsRef);
        const allContracts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (userRole === 'vendedor' || userRole === 'admin') {
          setTasks(allContracts);
        } else {
          // Fetch steps for all contracts and filter by assignedToId
          const contractsWithSteps = await Promise.all(snapshot.docs.map(async (contractDoc) => {
            const stepsSnap = await getDocs(collection(contractDoc.ref, 'steps'));
            return {
              id: contractDoc.id,
              ...contractDoc.data(),
              steps: stepsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            };
          }));
          setTasks(contractsWithSteps.filter(c => c.steps.some((s: any) => s.assignedToId === user.uid)));
        }
      } catch (error) {
        console.error("CollabDashboard fetchTasks error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [user, userRole]);
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
