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
    <div className="p-4 md:p-8 bg-transparent min-h-screen max-w-7xl mx-auto">
      <header className="mb-6 md:mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Gestão de Obras e Instalações</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Visão global dos contratos Orbe.</p>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium self-end sm:self-auto -mt-10 sm:mt-0">
          <LogOut size={20} /> Sair
        </button>
      </header>

      <div className="flex overflow-x-auto pb-2 mb-6 md:mb-8 gap-2 md:gap-4 hide-scrollbar snap-x">
        <button 
          onClick={() => setActiveTab('contracts')}
          className={`shrink-0 snap-start px-4 md:px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'contracts' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:bg-white/50'}`}
        >
          <LayoutList size={18} /> Contratos Ativos
        </button>
        <button 
          onClick={() => setActiveTab('crm')}
          className={`shrink-0 snap-start px-4 md:px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'crm' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:bg-white/50'}`}
        >
          <Users size={18} /> CRM & Equipe
        </button>
        <button 
          onClick={() => setActiveTab('finance')}
          className={`shrink-0 snap-start px-4 md:px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'finance' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:bg-white/50'}`}
        >
          <DollarSign size={18} /> Financeiro
        </button>
        <button 
          onClick={() => setActiveTab('catalog')}
          className={`shrink-0 snap-start px-4 md:px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'catalog' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:bg-white/50'}`}
        >
          <Grip size={18} /> Gerenciar Catálogo
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`shrink-0 snap-start px-4 md:px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:bg-white/50'}`}
        >
          <Settings size={18} /> Configurações
        </button>
      </div>

      {activeTab === 'contracts' ? (
        <>
          <div className="mb-6 flex flex-col xs:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-xl md:text-2xl lux-title">Contratos Ativos</h2>
            <button onClick={() => setIsCreatingContract(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto min-h-[44px]">
              <Plus size={16} /> Novo Contrato
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

          <div className="grid gap-4">
            {contracts.map(contract => (
              <div key={contract.id} onClick={() => navigate(`/contract/${contract.id}`)} className="glass-card p-6 rounded-3xl flex justify-between items-center cursor-pointer hover:shadow-lg transition-all">
                <div>
                  <h2 className="font-semibold text-lg text-gray-900">{contract.clientName}</h2>
                  <p className="text-sm text-gray-500 mb-2">Produto: {contract.productName}</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${contract.status === 'active' ? 'glass-panel text-green-700 border-green-200' : contract.status === 'completed' ? 'glass-panel text-blue-700 border-blue-200' : 'glass-panel text-gray-700'}`}>
                      {contract.status === 'active' ? 'Em Progresso' : contract.status === 'completed' ? 'Finalizado' : 'Cancelado'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingContract(contract);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar contrato"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteContract(e, contract.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir contrato"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ChevronRight className="text-gray-400" />
                </div>
              </div>
            ))}
            {contracts.length === 0 && (
              <div className="text-center py-12 glass-card rounded-3xl border-dashed border-2 border-white/50">
                <p className="text-gray-500">Nenhum contrato ativo no momento.</p>
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'crm' ? (
        <AdminCRM />
      ) : activeTab === 'finance' ? (
        <AdminFinance />
      ) : activeTab === 'catalog' ? (
        <AdminProducts />
      ) : (
        <AdminWorkflowConfig />
      )}
    </div>
  );
}
