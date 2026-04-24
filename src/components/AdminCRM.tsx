import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Loader2, Plus, Edit2, Trash2, Mail, Phone, User, Check, X, Search } from 'lucide-react';

export default function AdminCRM() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('client');

  const fetchClients = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(docs);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar clientes. Verifique as permissões de admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return toast.error("Nome e E-mail são obrigatórios.");

    try {
      // Create user document (Auth needs to be created by the user logging in, but we can register their profile for the CRM)
      await addDoc(collection(db, 'users'), {
        name,
        email,
        phone: phone || '',
        role,
        createdAt: serverTimestamp(),
        manuallyAdded: true, // flag to indicate they haven't logged in with Google yet
      });
      toast.success("Usuário adicionado ao CRM.");
      setIsAdding(false);
      resetForm();
      fetchClients();
    } catch (e) {
      toast.error("Erro ao adicionar usuário.");
      console.error(e);
    }
  };

  const handleEdit = (client: any) => {
    setEditingId(client.id);
    setName(client.name || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setRole(client.role || 'client');
  };

  const handleSaveEdit = async () => {
    if (!name || !email) return toast.error("Nome e E-mail são obrigatórios.");
    
    try {
      await updateDoc(doc(db, 'users', editingId!), {
        name,
        email,
        phone,
        role
      });
      toast.success("Dados do usuário atualizados.");
      setEditingId(null);
      resetForm();
      fetchClients();
    } catch (e) {
      toast.error("Erro ao atualizar dados.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este usuário do CRM?")) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      toast.success("Usuário removido.");
      fetchClients();
    } catch (e) {
      toast.error("Erro ao remover usuário.");
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRole('client');
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-card rounded-3xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">CRM de Clientes & Equipe</h2>
          <p className="text-sm text-gray-500">Gerencie todos os clientes, colaboradores e administradores do sistema.</p>
        </div>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition w-full md:w-auto min-h-[44px]">
            <Plus size={16} /> Adicionar Contato
          </button>
        )}
      </div>

      {!isAdding && (
        <div className="mb-6 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/60 border border-white/50 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSaveAdd} className="bg-white/40 p-4 rounded-2xl border border-white/40 mb-6 space-y-4">
          <h3 className="font-bold text-gray-800">Novo Contato</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input type="text" placeholder="Nome Completo *" value={name} onChange={e => setName(e.target.value)} className="p-3 bg-white/60 rounded-xl focus:outline-none" required />
            <input type="email" placeholder="E-mail *" value={email} onChange={e => setEmail(e.target.value)} className="p-3 bg-white/60 rounded-xl focus:outline-none" required />
            <input type="text" placeholder="Telefone / WhatsApp" value={phone} onChange={e => setPhone(e.target.value)} className="p-3 bg-white/60 rounded-xl focus:outline-none" />
            <select value={role} onChange={e => setRole(e.target.value)} className="p-3 bg-white/60 rounded-xl focus:outline-none">
              <option value="client">Cliente</option>
              <option value="collab">Colaborador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setIsAdding(false); resetForm(); }} className="px-4 py-2 text-gray-600 font-bold hover:bg-white/50 rounded-xl">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Salvar Contato</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-sm border-b border-black/5">
                <th className="pb-3 font-semibold">Nome</th>
                <th className="pb-3 font-semibold">Contato</th>
                <th className="pb-3 font-semibold">Perfil</th>
                <th className="pb-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr key={client.id} className="border-b border-black/5 hover:bg-white/30 transition">
                  <td className="py-4">
                    {editingId === client.id ? (
                      <input type="text" value={name} onChange={e => setName(e.target.value)} className="p-2 w-full text-sm bg-white border border-gray-200 rounded-lg outline-none" />
                    ) : (
                      <div className="flex items-center gap-2 font-medium text-gray-800">
                        <User size={16} className="text-gray-400" /> {client.name || 'Sem Nome'}
                      </div>
                    )}
                  </td>
                  <td className="py-4">
                    {editingId === client.id ? (
                      <div className="space-y-2">
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="p-2 w-full text-sm bg-white border border-gray-200 rounded-lg outline-none" placeholder="E-mail" />
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="p-2 w-full text-sm bg-white border border-gray-200 rounded-lg outline-none" placeholder="Telefone" />
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2"><Mail size={14} /> {client.email}</div>
                        {client.phone && <div className="flex items-center gap-2"><Phone size={14} /> {client.phone}</div>}
                      </div>
                    )}
                  </td>
                  <td className="py-4">
                    {editingId === client.id ? (
                      <select value={role} onChange={e => setRole(e.target.value)} className="p-2 w-full text-sm bg-white border border-gray-200 rounded-lg outline-none">
                        <option value="client">Cliente</option>
                        <option value="collab">Colaborador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                        client.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        client.role === 'collab' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {client.role === 'admin' ? 'Admin' : client.role === 'collab' ? 'Colab' : 'Cliente'}
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    {editingId === client.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={handleSaveEdit} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><Check size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(client)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(client.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    Nenhum contato encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
