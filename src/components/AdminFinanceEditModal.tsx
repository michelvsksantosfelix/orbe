import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Check, X, Plus, Trash2, Loader2 } from 'lucide-react';

interface Props {
  contract: any;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function AdminFinanceEditModal({ contract, onCancel, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [installments, setInstallments] = useState<any[]>(
    contract.installments || []
  );

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const contractRef = doc(db, 'contracts', contract.id);
      
      const normalizedInstallments = installments.map(inst => ({
        ...inst,
        amount: parseFloat(String(inst.amount).replace(',', '.')) || 0
      }));

      await updateDoc(contractRef, {
        installments: normalizedInstallments
      });

      toast.success("Pagamentos do contrato atualizados com sucesso!");
      onSuccess();
    } catch (e) {
      toast.error("Erro ao atualizar os pagamentos.");
      console.error(e);
      setSubmitting(false);
    }
  };

  const handleAddField = () => {
    const today = new Date();
    setInstallments([
      ...installments,
      {
        id: `inst-${Date.now()}`,
        number: installments.length + 1,
        amount: 0,
        dueDate: today.toISOString(),
        status: 'pending',
        paidAt: null
      }
    ]);
  };

  const handRemoveField = (id: string) => {
    setInstallments(installments.filter(i => i.id !== id).map((inst, idx) => ({ ...inst, number: idx + 1 })));
  };

  const handleChange = (id: string, field: string, value: any) => {
    setInstallments(installments.map(inst => {
      if (inst.id === id) {
        return { ...inst, [field]: value };
      }
      return inst;
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="glass-card p-6 md:p-8 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Editar Pagamentos: {contract.clientName}</h3>
        <p className="text-gray-600 mb-6 font-medium">Contrato: {contract.productName}</p>
        
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-4">
             {installments.map((inst, index) => (
                <div key={inst.id} className="flex flex-col md:flex-row items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <div className="w-full md:w-32">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Parcela</label>
                    <div className="font-bold text-gray-800">{inst.number}</div>
                  </div>
                  <div className="w-full md:w-48">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={inst.amount} 
                      onChange={e => handleChange(inst.id, 'amount', e.target.value)} 
                      className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 bg-white" 
                      required 
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Data de Vencimento</label>
                    <input 
                      type="date" 
                      value={inst.dueDate ? inst.dueDate.split('T')[0] : ''} 
                      onChange={e => handleChange(inst.id, 'dueDate', new Date(e.target.value).toISOString())} 
                      className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 bg-white" 
                      required 
                    />
                  </div>
                  <div className="w-full md:w-40">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                    <select 
                      value={inst.status} 
                      onChange={e => handleChange(inst.id, 'status', e.target.value)} 
                      className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                    </select>
                  </div>
                  <div className="w-full md:w-auto pt-6 flex justify-end">
                    <button type="button" onClick={() => handRemoveField(inst.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
             ))}
          </div>

          <button type="button" onClick={handleAddField} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition">
             <Plus size={16} /> Adicionar Nova Parcela
          </button>

          <div className="flex gap-3 pt-6 border-t border-gray-100">
            <button type="button" onClick={onCancel} disabled={submitting} className="px-5 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition">
               Cancelar
            </button>
            <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2">
               {submitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />} 
               Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
