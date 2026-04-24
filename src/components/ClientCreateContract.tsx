import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Check, X } from 'lucide-react';

interface Props {
  product: any;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ClientCreateContract({ product, onCancel, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [pricingTier, setPricingTier] = useState('base'); 
  const [customPrice, setCustomPrice] = useState('');
  
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setSubmitting(true);
    try {
      let finalPrice = 0;
      let finalCost = 0;

      if (pricingTier === 'base') {
        finalPrice = product.price || 0;
        finalCost = product.cost || 0;
      } else if (pricingTier === 'shipping') {
        finalPrice = product.priceShipping || product.price || 0;
        finalCost = product.costShipping || product.cost || 0;
      } else if (pricingTier === 'installed') {
        finalPrice = product.priceInstalled || product.priceShipping || product.price || 0;
        finalCost = product.costInstalled || product.costShipping || product.cost || 0;
      } else if (pricingTier === 'custom') {
        finalPrice = parseFloat(customPrice.replace(',', '.')) || 0;
        // Cost will be assumed from base or similar
        finalCost = product.cost || 0; 
      }

      const contractRef = doc(collection(db, 'contracts'));
      
      await setDoc(contractRef, {
        clientId: auth.currentUser.uid,
        clientName: auth.currentUser.displayName || auth.currentUser.email || 'Cliente',
        productId: product.id,
        productName: product.title,
        status: 'active',
        price: finalPrice,
        cost: finalCost,
        pricingTier,
        isNegotiationPending: pricingTier === 'custom', // Mark as pending negotiation if custom
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Fetch default workflow
      let stepsToCreate: any[] = ['Compra', 'Documentação', 'Frete e Escavação', 'Instalação e Conclusão'];
      const wfDoc = await getDoc(doc(db, 'settings', 'default_workflow'));
      if (wfDoc.exists() && wfDoc.data().steps) {
        stepsToCreate = wfDoc.data().steps;
      }

      // Create steps
      for (let i = 0; i < stepsToCreate.length; i++) {
        const stepData = stepsToCreate[i];
        const title = typeof stepData === 'string' ? stepData : (stepData as any).title;
        const description = typeof stepData === 'string' ? '' : (stepData as any).description || '';

        await setDoc(doc(db, `contracts/${contractRef.id}/steps`, (i+1).toString()), {
          contractId: contractRef.id,
          order: i + 1,
          title: title,
          description: description,
          status: i === 0 ? 'in_progress' : 'locked',
        });
      }

      toast.success("Contrato iniciado com sucesso!");
      onSuccess();
    } catch (e) {
      toast.error("Erro ao iniciar contrato.");
      console.error(e);
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="glass-card p-6 md:p-8 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Solicitar Contrato</h3>
        <p className="text-gray-600 mb-6 font-medium">Produto: {product.title}</p>
        
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-4">Escolha a Opção Desejada</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${pricingTier === 'base' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                <input type="radio" className="sr-only" checked={pricingTier === 'base'} onChange={() => setPricingTier('base')} />
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Só Produto</div>
                <div className="font-bold text-gray-900 text-lg">{formatCurrency(product.price || 0)}</div>
                <div className="text-xs text-gray-500 mt-1">S/ frete ou instalação</div>
              </label>

              <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${pricingTier === 'shipping' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                <input type="radio" className="sr-only" checked={pricingTier === 'shipping'} onChange={() => setPricingTier('shipping')} />
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Com Frete</div>
                <div className="font-bold text-gray-900 text-lg">{formatCurrency(product.priceShipping || product.price || 0)}</div>
                <div className="text-xs text-gray-500 mt-1">Entrega no local</div>
              </label>

              <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${pricingTier === 'installed' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                <input type="radio" className="sr-only" checked={pricingTier === 'installed'} onChange={() => setPricingTier('installed')} />
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Instalado</div>
                <div className="font-bold text-gray-900 text-lg">{formatCurrency(product.priceInstalled || product.priceShipping || product.price || 0)}</div>
                <div className="text-xs text-gray-500 mt-1">Frete e Instalação inclusos</div>
              </label>

              <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col justify-center items-center text-center ${pricingTier === 'custom' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                 <input type="radio" className="sr-only" checked={pricingTier === 'custom'} onChange={() => setPricingTier('custom')} />
                 <div className="font-bold text-gray-700">Propor Desconto</div>
                 <div className="text-xs text-gray-500 mt-1">Sujeito a aprovação</div>
              </label>
            </div>

            {pricingTier === 'custom' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Proposto (R$)</label>
                <input type="number" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white" placeholder={`Ex: ${product.price * 0.9}`} required />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2">
               <Check size={20} /> {submitting ? 'Aguarde...' : 'Confirmar Solicitação'}
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
