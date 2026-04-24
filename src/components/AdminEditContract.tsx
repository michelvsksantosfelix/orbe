import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Check, X } from 'lucide-react';

interface Props {
  contract: any;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function AdminEditContract({ contract, onCancel, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [productName, setProductName] = useState(contract.productName || '');
  const [pricingTier, setPricingTier] = useState(contract.pricingTier || 'custom');
  const [price, setPrice] = useState(contract.price?.toString() || '');
  const [cost, setCost] = useState(contract.cost?.toString() || '');
  const [status, setStatus] = useState(contract.status || 'active');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const contractRef = doc(db, 'contracts', contract.id);
      await updateDoc(contractRef, {
        productName,
        pricingTier,
        price: parseFloat(price.replace(',', '.')) || 0,
        cost: parseFloat(cost.replace(',', '.')) || 0,
        status,
        updatedAt: serverTimestamp()
      });

      toast.success("Contrato atualizado com sucesso!");
      onSuccess();
    } catch (e) {
      toast.error("Erro ao atualizar contrato.");
      console.error(e);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="glass-card p-6 md:p-8 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Editar Contrato</h3>
        <p className="text-gray-600 mb-6 font-medium">Cliente: {contract.clientName}</p>
        
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Produto</label>
              <input 
                type="text" 
                value={productName} 
                onChange={e => setProductName(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="active">Em Progresso</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-4">Valores Negociados</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço Final (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={price} 
                  onChange={e => setPrice(e.target.value)} 
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                  placeholder="0.00" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custo Total (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={cost} 
                  onChange={e => setCost(e.target.value)} 
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                  placeholder="0.00" 
                  required 
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2">
               <Check size={20} /> {submitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button type="button" onClick={onCancel} disabled={submitting} className="px-5 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition">
               Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
