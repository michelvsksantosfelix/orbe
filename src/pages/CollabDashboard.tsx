import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, getDocs, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { LogOut, ClipboardList, ChevronRight, Bell } from 'lucide-react';
import AppLogo from '../components/AppLogo';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function CollabDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
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
    
    // Fetch notifications
    const qNotifications = query(collection(db, `users/${user.uid}/notifications`), orderBy('createdAt', 'desc'));
    const unsubscribeNotifications = onSnapshot(qNotifications, (snap) => {
      setNotifications(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/notifications`);
    });

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
    return () => unsubscribeNotifications();
  }, [user, userRole]);
  
  const handleLogout = () => {
    auth.signOut().then(() => navigate('/login'));
  };

  return (
    <div className="p-4 md:p-8 bg-transparent min-h-screen max-w-7xl mx-auto">
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          <AppLogo className="w-16 h-16 rounded-full" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Painel do Colaborador</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">
              Olá, {user?.displayName || user?.email?.split('@')[0]}
              {userRole && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">{userRole}</span>}
            </p>
          </div>
        </div>
        
        {/* Notifications */}
        <div className="relative">
          <button className="text-gray-500 hover:text-gray-900 relative">
            <Bell size={24} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
        </div>

        <button onClick={handleLogout} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium self-end sm:self-auto -mt-10 sm:mt-0">
          <LogOut size={20} /> Sair
        </button>
      </header>

      <div className="grid gap-4">
        {tasks.map(contract => (
          <div key={contract.id} className="glass-card rounded-3xl p-6 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate(`/contract/${contract.id}`)}>
            <div className="flex justify-between items-center">
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
            {contract.steps?.filter((s: any) => s.assignedToId === user?.uid).length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 -mx-2">
                <p className="text-sm text-blue-800 font-medium mb-3">Etapas sob sua responsabilidade:</p>
                <div className="flex flex-wrap gap-2">
                  {contract.steps
                    .filter((s: any) => s.assignedToId === user?.uid)
                    .map((step: any) => (
                      <span key={step.id} className="bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-200 shadow-sm animate-pulse">
                        {step.title}
                      </span>
                    ))
                  }
                </div>
              </div>
            )}
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
