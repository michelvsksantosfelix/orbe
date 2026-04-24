import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Trash2, Edit2, Check, X, Plus } from 'lucide-react';

interface AdminContractManageStepsProps {
  contractId: string;
  steps: any[];
}

export default function AdminContractManageSteps({ contractId, steps }: AdminContractManageStepsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStatus, setNewStatus] = useState('locked');
  const [newDescription, setNewDescription] = useState('');

  const handleEdit = (step: any) => {
    setEditingId(step.id);
    setEditTitle(step.title);
    setEditStatus(step.status);
    setEditDescription(step.description || '');
  };

  const handleSaveEdit = async (stepId: string) => {
    try {
      await updateDoc(doc(db, `contracts/${contractId}/steps`, stepId), {
        title: editTitle,
        status: editStatus,
        description: editDescription
      });
      toast.success("Etapa atualizada.");
      setEditingId(null);
    } catch (e) {
      toast.error("Erro ao atualizar etapa.");
      console.error(e);
    }
  };

  const handleDelete = async (stepId: string) => {
    if(!confirm("Certeza que deseja remover esta etapa do contrato do cliente?")) return;
    try {
      await deleteDoc(doc(db, `contracts/${contractId}/steps`, stepId));
      toast.success("Etapa removida.");
    } catch (e) {
      toast.error("Erro ao remover.");
      console.error(e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    try {
      const highestOrder = steps.reduce((max, step) => Math.max(max, step.order), 0);
      const newStepId = `step-${Date.now()}`;
      
      await setDoc(doc(db, `contracts/${contractId}/steps`, newStepId), {
        contractId,
        order: highestOrder + 1,
        title: newTitle,
        status: newStatus,
        description: newDescription
      });
      
      toast.success("Etapa adicionada.");
      setIsAdding(false);
      setNewTitle('');
      setNewDescription('');
    } catch (e) {
      toast.error("Erro ao adicionar.");
      console.error(e);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl mt-8">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Gerenciamento de Etapas (Admin)</h3>
      <p className="text-sm text-gray-600 mb-6">Aqui você pode adicionar etapas extras, pular etapas ou corrigir informações apenas para este contrato.</p>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/50 text-gray-500">
              <th className="pb-3 px-2">Ordem</th>
              <th className="pb-3 px-2">Etapa (Título)</th>
              <th className="pb-3 px-2">Status</th>
              <th className="pb-3 px-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {[...steps].sort((a, b) => a.order - b.order).map(step => (
              <tr key={step.id} className="border-b border-light/10 hover:bg-white/30 transition-colors">
                <td className="py-3 px-2 font-mono text-gray-400 align-top">{step.order}</td>
                <td className="py-3 px-2 font-medium text-gray-800 align-top">
                  {editingId === step.id ? (
                    <div className="flex flex-col gap-2">
                       <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-2 rounded-lg bg-white/60 border border-white/50 focus:outline-none placeholder-gray-400" placeholder="Título" />
                       <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="w-full p-2 rounded-lg bg-white/60 border border-white/50 focus:outline-none placeholder-gray-400 text-sm" placeholder="Resumo e documentos necessários..." rows={3} />
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold">{step.title}</div>
                      {step.description && <div className="text-xs text-gray-500 mt-1 max-w-sm whitespace-pre-wrap">{step.description}</div>}
                    </div>
                  )}
                </td>
                <td className="py-3 px-2 align-top">
                  {editingId === step.id ? (
                    <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="p-2 rounded-lg bg-white/60 border border-white/50 focus:outline-none">
                      <option value="locked">Bloqueado</option>
                      <option value="in_progress">Em Progresso</option>
                      <option value="pending_admin_approval">Aguardando Validação</option>
                      <option value="completed">Concluído</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 text-xs rounded-lg font-semibold ${
                      step.status === 'completed' ? 'bg-green-100 text-green-700' :
                      step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      step.status === 'pending_admin_approval' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {step.status}
                    </span>
                  )}
                </td>
                <td className="py-3 px-2 text-right align-top">
                  {editingId === step.id ? (
                    <div className="flex justify-end gap-2">
                       <button onClick={() => handleSaveEdit(step.id)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><Check size={16} /></button>
                       <button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(step)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg title='Editar'"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(step.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg title='Excluir'"><Trash2 size={16} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdding ? (
        <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-2 bg-white/30 p-4 rounded-2xl border border-white/50">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título da nova etapa..." className="w-full sm:flex-grow p-2 rounded-lg bg-white/60 border border-white/50 focus:outline-none min-h-[44px]" required />
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full sm:w-auto p-2 rounded-lg bg-white/60 border border-white/50 focus:outline-none min-h-[44px]">
              <option value="locked">Bloqueado</option>
              <option value="in_progress">Em Progresso</option>
              <option value="completed">Concluído</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Resumo e documentos necessários..." className="w-full flex-grow p-2 rounded-lg bg-white/60 border border-white/50 focus:outline-none text-sm" rows={2} />
            <div className="flex gap-2 justify-end w-full sm:w-auto sm:self-end">
              <button type="submit" className="p-2 sm:p-3 bg-green-100 text-green-700 rounded-lg font-bold hover:bg-green-200 min-h-[44px] flex items-center justify-center flex-grow sm:flex-grow-0"><Check size={20} /></button>
              <button type="button" onClick={() => setIsAdding(false)} className="p-2 sm:p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 min-h-[44px] flex items-center justify-center flex-grow sm:flex-grow-0"><X size={20} /></button>
            </div>
          </div>
        </form>
      ) : (
        <button onClick={() => setIsAdding(true)} className="mt-4 bg-white shadow-sm text-blue-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition w-full sm:w-auto min-h-[44px]">
          <Plus size={16} /> Adicionar Nova Etapa Fixa
        </button>
      )}
    </div>
  );
}
