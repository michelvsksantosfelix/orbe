import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, getDoc, orderBy, updateDoc } from 'firebase/firestore';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Activity, CheckCircle2, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdminFinance() {
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [stats, setStats] = useState({
    expectedRevenue: 0,
    paidRevenue: 0,
    totalCosts: 0,
    profit: 0
  });
  
  const [itemsData, setItemsData] = useState<any[]>([]);

  useEffect(() => {
    fetchFinancialData();
  }, [currentDate]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    setCurrentDate(newDate);
  };

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const contractsRef = collection(db, 'contracts');
      const snapshot = await getDocs(contractsRef);
      
      const targetMonth = currentDate.getMonth();
      const targetYear = currentDate.getFullYear();
      
      let expectedRevenue = 0;
      let paidRevenue = 0;
      let totalCosts = 0;
      
      const loadedItems: any[] = [];
      const productsCache: Record<string, any> = {};

      for (const docSnapshot of snapshot.docs) {
        const contract = { id: docSnapshot.id, ...docSnapshot.data() } as any;
        
        // Ensure we handle cost attribution correctly depending on creation date.
        // We can just attribute the full cost of the contract to the month it was created.
        const createdAt = contract.createdAt?.toDate ? contract.createdAt.toDate() : new Date();
        const isContractCreatedThisMonth = createdAt.getMonth() === targetMonth && createdAt.getFullYear() === targetYear;

        if (isContractCreatedThisMonth) {
          let productDetails = contract.productDetails;
          if (!productDetails && contract.productId) {
            if (!productsCache[contract.productId]) {
              const pDoc = await getDoc(doc(db, 'products', contract.productId));
              if (pDoc.exists()) {
                productsCache[contract.productId] = pDoc.data();
              }
            }
            productDetails = productsCache[contract.productId];
          }
          const cost = parseFloat(contract.cost || productDetails?.cost || 0);
          totalCosts += cost;
        }

        // Process installments
        if (contract.installments && Array.isArray(contract.installments)) {
          contract.installments.forEach((inst: any, index: number) => {
            const dueDate = inst.dueDate ? new Date(inst.dueDate) : createdAt;
            if (dueDate.getMonth() === targetMonth && dueDate.getFullYear() === targetYear) {
              const amount = parseFloat(inst.amount || 0);
              const isPaid = inst.status === 'paid';
              
              expectedRevenue += amount;
              if (isPaid) {
                paidRevenue += amount;
              }
              
              loadedItems.push({
                ...inst,
                contractId: contract.id,
                clientName: contract.clientName,
                productName: contract.productName,
                dueDateObj: dueDate,
                contractInstallments: contract.installments,
                installmentIndex: index
              });
            }
          });
        } else {
          // Legacy contracts without installments
          if (isContractCreatedThisMonth) {
            const price = parseFloat(contract.price || 0);
            expectedRevenue += price;
            // Assume paid to keep it simple, or checking old logic? Let's assume paid.
            paidRevenue += price;
            
            loadedItems.push({
              id: `legacy-${contract.id}`,
              contractId: contract.id,
              clientName: contract.clientName,
              productName: contract.productName,
              dueDateObj: createdAt,
              amount: price,
              status: 'paid', // Legacy we assume paid
              number: 1,
              isLegacy: true
            });
          }
        }
      }
      
      // Sort by due date
      loadedItems.sort((a, b) => a.dueDateObj.getTime() - b.dueDateObj.getTime());
      
      setStats({
        expectedRevenue,
        paidRevenue,
        totalCosts,
        profit: paidRevenue - totalCosts // Using paid revenue for actual profit in the month
      });
      
      setItemsData(loadedItems);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast.error('Erro ao buscar dados financeiros.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (item: any) => {
    if (item.isLegacy) return; // Cannot edit legacy easily here
    
    try {
      setUpdatingId(item.id);
      const newInstallments = [...item.contractInstallments];
      
      // Toggle status
      const newStatus = item.status === 'paid' ? 'pending' : 'paid';
      
      newInstallments[item.installmentIndex] = {
        ...newInstallments[item.installmentIndex],
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date().toISOString() : null
      };

      await updateDoc(doc(db, 'contracts', item.contractId), {
        installments: newInstallments
      });

      toast.success(newStatus === 'paid' ? 'Parcela marcada como paga.' : 'Parcela marcada como pendente.');
      fetchFinancialData();
    } catch (error) {
      console.error('Error updating installment:', error);
      toast.error('Erro ao atualizar parcela.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && itemsData.length === 0) {
    return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl lux-title text-gray-900">Relatório Financeiro</h2>
        
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <span className="font-bold text-gray-800 min-w-[120px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <Activity size={20} className="text-blue-600" />
            <h3 className="font-semibold uppercase tracking-wider text-xs">Receita Prevista</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.expectedRevenue)}</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <DollarSign size={20} className="text-emerald-600" />
            <h3 className="font-semibold uppercase tracking-wider text-xs">Receita Recebida</h3>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.paidRevenue)}</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <TrendingDown size={20} className="text-red-500" />
            <h3 className="font-semibold uppercase tracking-wider text-xs">Custos do Mês</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCosts)}</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <TrendingUp size={20} className="text-purple-600" />
            <h3 className="font-semibold uppercase tracking-wider text-xs">Lucro Operacional</h3>
          </div>
          <p className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(stats.profit)}
          </p>
        </div>
      </div>

      {/* Installments Table */}
      <div className="glass-card p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">Entradas do Mês</h3>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
        </div>
        
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-sm md:text-base">
                <th className="pb-3 font-semibold text-gray-500">Vencimento</th>
                <th className="pb-3 font-semibold text-gray-500">Cliente / Contrato</th>
                <th className="pb-3 font-semibold text-gray-500">Produto / Parcela</th>
                <th className="pb-3 font-semibold text-gray-500 text-right">Valor</th>
                <th className="pb-3 font-semibold text-gray-500 text-center">Status</th>
                <th className="pb-3 font-semibold text-gray-500 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {itemsData.map(item => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 text-sm text-gray-600">
                    {item.dueDateObj.toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-4">
                    <p className="font-bold text-gray-900 text-sm md:text-base">{item.clientName || 'Cliente sem nome'}</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">ID: {item.contractId.substring(0,8)}</p>
                  </td>
                  <td className="py-4">
                    <p className="text-sm text-gray-800">{item.productName}</p>
                    <p className="text-xs text-gray-500 mt-1">Parcela {item.number}{item.contractInstallments ? ` de ${item.contractInstallments.length}` : ''}</p>
                  </td>
                  <td className="py-4 text-right text-sm font-medium text-blue-700">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="py-4 text-center">
                    {item.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                        <CheckCircle2 size={12} /> Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    {!item.isLegacy && (
                      <button 
                        onClick={() => handleMarkAsPaid(item)}
                        disabled={updatingId === item.id}
                        className={`p-2 rounded-xl text-sm font-medium transition-all inline-flex items-center justify-center ${
                          item.status === 'paid' 
                            ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                        }`}
                        title={item.status === 'paid' ? 'Desmarcar pagamento' : 'Dar quitação'}
                      >
                        {updatingId === item.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : item.status === 'paid' ? (
                          <X size={16} />
                        ) : (
                          <Check size={16} />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              
              {itemsData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Nenhum pagamento registrado para este mês.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
