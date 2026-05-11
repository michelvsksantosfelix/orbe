import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Check, X } from 'lucide-react';

interface Props {
  onCancel: () => void;
  onSuccess: () => void;
}

export default function AdminCreateContract({ onCancel, onSuccess }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [pricingTier, setPricingTier] = useState('base'); // base, shipping, installed, custom
  const [customPrice, setCustomPrice] = useState('');
  const [customCost, setCustomCost] = useState('');

  // Payment State
  const [paymentType, setPaymentType] = useState('avista'); // 'avista' | 'parcelado'
  const [paymentMethod, setPaymentMethod] = useState(''); // 'dinheiro' | 'pix' | 'cartao' | 'boleto'
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [firstPaymentAmount, setFirstPaymentAmount] = useState<string>('');
  const [paymentDay, setPaymentDay] = useState<string>('10');

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'products'))
    ]).then(([usersSnap, productsSnap]) => {
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // For creating a contract, we only show 'client' role users
      setClients(allUsers.filter((u: any) => u.role === 'client'));
      setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setLoading(false);
    }).catch(e => {
      console.error(e);
      toast.error('Erro ao carregar dados.');
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedProductId) {
      toast.error('Selecione cliente e produto.');
      return;
    }

    setSubmitting(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const product = products.find(p => p.id === selectedProductId);

      if (!paymentMethod) {
        toast.error('Selecione uma forma de pagamento.');
        return;
      }
      
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
        finalCost = parseFloat(customCost.replace(',', '.')) || 0;
      }

      // Generate Installments
      const installments = [];
      const today = new Date();
      
      if (paymentType === 'avista') {
        installments.push({
          id: `inst-1`,
          number: 1,
          amount: finalPrice,
          dueDate: today.toISOString(),
          status: 'paid', // À vista assumes paid or pending? Let's make it paid if it's the exact day, or wait, admin might want to confirm. Let's make it 'paid' for 'avista' or 'pending'. Typically 'pending' is safer, but "dá quitação" implies they have to mark it. Let's make it 'pending'.
          paidAt: null
        });
      } else {
        const firstAmt = parseFloat(firstPaymentAmount.replace(',','.')) || 0;
        const remainder = Math.max(0, finalPrice - firstAmt);
        const subInstallmentAmt = (installmentsCount > 1) ? (remainder / (installmentsCount - 1)) : remainder;
        
        // 1st Installment (Upfront)
        installments.push({
          id: `inst-1`,
          number: 1,
          amount: firstAmt,
          dueDate: today.toISOString(),
          status: 'pending',
          paidAt: null
        });

        // the rest
        let currentMonth = today.getMonth();
        let currentYear = today.getFullYear();
        
        for (let i = 2; i <= installmentsCount; i++) {
          currentMonth++;
          if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
          }
          const d = new Date(currentYear, currentMonth, parseInt(paymentDay) || 10, 12, 0, 0);
          installments.push({
            id: `inst-${i}`,
            number: i,
            amount: subInstallmentAmt,
            dueDate: d.toISOString(),
            status: 'pending',
            paidAt: null
          });
        }
      }

      const contractRef = doc(collection(db, 'contracts'));
      
      await setDoc(contractRef, {
        clientId: client.id,
        clientName: client.name || client.email || 'Cliente',
        productId: product.id,
        productName: product.title,
        status: 'active',
        price: finalPrice,
        cost: finalCost,
        pricingTier,
        paymentType,
        paymentMethod,
        installments,
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

      toast.success("Contrato gerado com sucesso!");
      onSuccess();
    } catch (e) {
      toast.error("Erro ao gerar contrato. Você tem permissão de Admin?");
      console.error(e);
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando dados...</div>;

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const productsByLine = products.reduce((acc, p) => {
    const line = p.linha || 'Outros';
    if (!acc[line]) acc[line] = [];
    acc[line].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="glass-card p-6 rounded-3xl mb-8 border border-white/50">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Novo Contrato</h3>
      <form onSubmit={handleCreate} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
            <select 
              value={selectedClientId} 
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">Selecione um cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name || c.email} ({c.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Produto / Serviço</label>
            <select 
              value={selectedProductId} 
              onChange={e => {
                setSelectedProductId(e.target.value);
                setPricingTier('base');
              }}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">Selecione um produto...</option>
              {Object.keys(productsByLine).sort().map(line => (
                <optgroup key={line} label={line}>
                  {productsByLine[line].map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {selectedProduct && (
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-4">Negociação e Valores</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${pricingTier === 'base' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                <input type="radio" className="sr-only" checked={pricingTier === 'base'} onChange={() => setPricingTier('base')} />
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Só Produto</div>
                <div className="font-bold text-gray-900">{formatCurrency(selectedProduct.price || 0)}</div>
                <div className="text-xs text-gray-500 mt-1">Custo: {formatCurrency(selectedProduct.cost || 0)}</div>
              </label>

              <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${pricingTier === 'shipping' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                <input type="radio" className="sr-only" checked={pricingTier === 'shipping'} onChange={() => setPricingTier('shipping')} />
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Com Frete</div>
                <div className="font-bold text-gray-900">{formatCurrency(selectedProduct.priceShipping || selectedProduct.price || 0)}</div>
                <div className="text-xs text-gray-500 mt-1">Custo: {formatCurrency(selectedProduct.costShipping || selectedProduct.cost || 0)}</div>
              </label>

              <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${pricingTier === 'installed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                <input type="radio" className="sr-only" checked={pricingTier === 'installed'} onChange={() => setPricingTier('installed')} />
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Instalado</div>
                <div className="font-bold text-gray-900">{formatCurrency(selectedProduct.priceInstalled || selectedProduct.priceShipping || selectedProduct.price || 0)}</div>
                <div className="text-xs text-gray-500 mt-1">Custo: {formatCurrency(selectedProduct.costInstalled || selectedProduct.costShipping || selectedProduct.cost || 0)}</div>
              </label>

              <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col justify-center items-center text-center ${pricingTier === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                 <input type="radio" className="sr-only" checked={pricingTier === 'custom'} onChange={() => setPricingTier('custom')} />
                 <div className="font-bold text-gray-700">Personalizado</div>
                 <div className="text-xs text-gray-500 mt-1">Editar Valores</div>
              </label>
            </div>

            {pricingTier === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço Final Negociado (R$)</label>
                  <input type="number" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 52000.00" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custo Total Projetado (R$)</label>
                  <input type="number" step="0.01" value={customCost} onChange={e => setCustomCost(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 36000.00" required />
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-gray-200 pt-6">
              <h4 className="font-semibold text-gray-800 mb-4">Condições de Pagamento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pagamento</label>
                  <select 
                    value={paymentType} 
                    onChange={e => setPaymentType(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="avista">À Vista</option>
                    <option value="parcelado">Parcelado (Compra Programada)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                  <select 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão de Crédito/Débito</option>
                    <option value="boleto">Boleto (Compra Programada)</option>
                  </select>
                </div>
              </div>

              {paymentType === 'parcelado' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qtd. de Parcelas</label>
                    <input 
                      type="number" 
                      min="2" 
                      max="120"
                      value={installmentsCount} 
                      onChange={e => setInstallmentsCount(parseInt(e.target.value))}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sinal / 1ª Parcela (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={firstPaymentAmount} 
                      onChange={e => setFirstPaymentAmount(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      placeholder="Ex: 5000.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Melhor Dia de Vencimento</label>
                    <input 
                      type="number" 
                      min="1"
                      max="31"
                      value={paymentDay} 
                      onChange={e => setPaymentDay(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      placeholder="Ex: 10"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="flex-1 bg-green-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2">
             <Check size={20} /> {submitting ? 'Gerando...' : 'Gerar Contrato'}
          </button>
          <button type="button" onClick={onCancel} className="px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">
             Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
