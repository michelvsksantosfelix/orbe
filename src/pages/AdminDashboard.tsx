import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, setDoc, doc, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, ChevronRight, LayoutList, Grip, Settings, Users, DollarSign, Trash2, Edit } from 'lucide-react';
import AdminProducts from '../components/AdminProducts';
import AdminWorkflowConfig from '../components/AdminWorkflowConfig';
import AdminCRM from '../components/AdminCRM';
import AdminFinance from '../components/AdminFinance';
import AdminCreateContract from '../components/AdminCreateContract';
import AdminEditContract from '../components/AdminEditContract';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'contracts' | 'catalog' | 'settings' | 'crm' | 'finance'>('contracts');

  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [editingContract, setEditingContract] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, "contracts"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setContracts(docs);
    }, (error) => {
      console.error("AdminDashboard contracts listener error:", error);
      if (error.code === 'permission-denied') {
        toast.error("Sem permissão para listar contratos. Tente recarregar.");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    auth.signOut().then(() => navigate('/login'));
  };

  const handleDeleteContract = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("CUIDADO: Isso excluirá o contrato e todo o seu histórico. Tem certeza?")) return;

    try {
      await deleteDoc(doc(db, 'contracts', id));
      toast.success("Contrato excluído!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir contrato.");
    }
  };

  return (
    <div className="p-4 md:p-8 bg-transparent min-h-screen max-w-7xl mx-auto font-sans">
      <header className="mb-8 md:mb-16 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="Orbe Piscinas" className="w-16 h-16 rounded-full" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 500 500%22><circle cx=%22250%22 cy=%22250%22 r=%22250%22 fill=%22%232563eb%22/></svg>'; }} />
          <div className="relative group">
            <div className="absolute -left-4 top-0 w-1 h-full bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-3">Orbe Gestão</h1>
            <p className="text-sm md:text-lg font-medium text-gray-500 max-w-md leading-relaxed">Infraestrutura inteligente para controle total de obras e instalações premium.</p>
          </div>
        </div>
        <button onClick={handleLogout} className="bg-white/40 hover:bg-white text-gray-700 px-6 py-3 rounded-2xl flex items-center gap-2 font-bold text-sm transition-all border border-white/60 shadow-sm hover:shadow-md backdrop-blur-md self-end sm:self-auto uppercase tracking-widest">
          <LogOut size={16} /> Sair
        </button>
      </header>

      <nav className="flex overflow-x-auto pb-4 mb-8 md:mb-12 gap-3 md:gap-6 hide-scrollbar snap-x no-scrollbar sticky top-4 z-[60]">
        {[
          { id: 'contracts', label: 'Projetos', icon: LayoutList },
          { id: 'crm', label: 'Clientes & Time', icon: Users },
          { id: 'finance', label: 'Tesouraria', icon: DollarSign },
          { id: 'catalog', label: 'Portfólio', icon: Grip },
          { id: 'settings', label: 'Estratégia', icon: Settings },
        ].map((tab, index) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`shrink-0 snap-start px-6 md:px-8 py-4 rounded-[24px] font-black text-[10px] md:text-xs uppercase tracking-[0.25em] flex items-center gap-3 transition-all border-2
              ${activeTab === tab.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white/30 border-white/40 text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm'}`}
          >
            <tab.icon size={16} strokeWidth={index === 0 ? 3 : 2} /> {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'contracts' ? (
        <div className="space-y-8 animate-in fade-in duration-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">Contratos Ativos</h2>
              <p className="text-sm text-gray-400 font-medium">Você tem {contracts.length} projetos em andamento.</p>
            </div>
            <button onClick={() => setIsCreatingContract(true)} className="bg-gray-900 text-white px-8 py-4 rounded-[24px] text-sm font-black uppercase tracking-widest hover:bg-blue-700 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-200 w-full sm:w-auto">
              <Plus size={18} strokeWidth={3} /> Nova Operação
            </button>
          </div>

          {isCreatingContract && (
            <AdminCreateContract 
              onCancel={() => setIsCreatingContract(false)} 
              onSuccess={() => setIsCreatingContract(false)} 
            />
          )}

          {editingContract && (
            <AdminEditContract 
              contract={editingContract}
              onCancel={() => setEditingContract(null)}
              onSuccess={() => setEditingContract(null)}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contracts.map(contract => (
              <div 
                key={contract.id} 
                onClick={() => navigate(`/contract/${contract.id}`)} 
                className="group glass-card p-0 rounded-[32px] overflow-hidden flex flex-col cursor-pointer border-none shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 bg-white/50 hover:-translate-y-2"
              >
                <div className="p-8 pb-4">
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] backdrop-blur-md border shadow-sm
                      ${contract.status === 'active' ? 'bg-blue-600 text-white border-blue-500' : contract.status === 'completed' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {contract.status === 'active' ? 'Em Progresso' : contract.status === 'completed' ? 'Finalizado' : 'Cancelado'}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingContract(contract); }}
                        className="p-3 bg-white text-blue-600 rounded-full shadow-sm hover:shadow-md transition-all"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteContract(e, contract.id)}
                        className="p-3 bg-white text-red-500 rounded-full shadow-sm hover:shadow-md transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <h2 className="font-black text-2xl text-gray-900 mb-1 tracking-tight group-hover:text-blue-600 transition-colors uppercase leading-tight">{contract.clientName}</h2>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-6">{contract.productName}</p>
                </div>
                
                <div className="mt-auto bg-gray-50/50 p-6 flex justify-between items-center border-t border-gray-50 group-hover:bg-blue-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-300 group-hover:text-blue-600 transition-colors border border-gray-100">
                      <LayoutList size={14} />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Painel de Controle</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>

          {contracts.length === 0 && (
            <div className="text-center py-24 glass-card rounded-[40px] border-dashed border-2 border-white/50 bg-white/10">
              <LayoutList size={48} className="mx-auto text-gray-300 mb-6 opacity-20" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum contrato ativo no sistema</p>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {activeTab === 'crm' ? <AdminCRM /> : 
           activeTab === 'finance' ? <AdminFinance /> : 
           activeTab === 'catalog' ? <AdminProducts /> : 
           <AdminWorkflowConfig />}
        </div>
      )}
    </div>
  );
}
