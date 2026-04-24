import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdminFinance() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCosts: 0,
    profit: 0,
    profitMargin: 0
  });
  
  const [contractsData, setContractsData] = useState<any[]>([]);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const contractsRef = collection(db, 'contracts');
      const q = query(contractsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const productsCache: Record<string, any> = {};
      let totalSales = 0;
      let totalCosts = 0;
      
      const loadedContracts = [];

      for (const docSnapshot of snapshot.docs) {
        const contract = { id: docSnapshot.id, ...docSnapshot.data() } as any;
        
        // Fetch product cost/price if we need
        let productDetails = contract.productDetails;
        
        if (!productDetails && contract.productId) {
          // Fallback if contract doesn't explicitly store price at the time of creation
          if (!productsCache[contract.productId]) {
            const pDoc = await getDoc(doc(db, 'products', contract.productId));
            if (pDoc.exists()) {
              productsCache[contract.productId] = pDoc.data();
            }
          }
          productDetails = productsCache[contract.productId];
        }
        
        const price = parseFloat(contract.price || productDetails?.price || 0);
        const cost = parseFloat(contract.cost || productDetails?.cost || 0);
        
        totalSales += price;
        totalCosts += cost;
        
        loadedContracts.push({
          ...contract,
          computedPrice: price,
          computedCost: cost,
          profit: price - cost
        });
      }
      
      const profit = totalSales - totalCosts;
      const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;
      
      setStats({
        totalSales,
        totalCosts,
        profit,
        profitMargin
      });
      
      setContractsData(loadedContracts);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast.error('Erro ao buscar dados financeiros.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl lux-title text-gray-900">Relatório Financeiro</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <DollarSign size={20} className="text-emerald-600" />
            <h3 className="font-semibold uppercase tracking-wider text-xs">Faturamento Total</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSales)}</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <TrendingDown size={20} className="text-red-500" />
            <h3 className="font-semibold uppercase tracking-wider text-xs">Custo Total</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCosts)}</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <TrendingUp size={20} className="text-blue-600" />
            <h3 className="font-semibold uppercase tracking-wider text-xs">Lucro Bruto</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.profit)}</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <Activity size={20} className="text-purple-600" />
            <h3 className="font-semibold uppercase tracking-wider text-xs">Margem</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="glass-card p-6 overflow-hidden">
        <h3 className="font-bold text-gray-800 mb-4">Detalhamento por Contrato</h3>
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-sm md:text-base">
                <th className="pb-3 font-semibold text-gray-500">Cliente / Contrato</th>
                <th className="pb-3 font-semibold text-gray-500">Produto</th>
                <th className="pb-3 font-semibold text-gray-500 text-right">Faturamento</th>
                <th className="pb-3 font-semibold text-gray-500 text-right">Custo</th>
                <th className="pb-3 font-semibold text-gray-500 text-right">Lucro</th>
              </tr>
            </thead>
            <tbody>
              {contractsData.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4">
                    <p className="font-bold text-gray-900 text-sm md:text-base">{c.clientName || 'Cliente sem nome'}</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">ID: {c.id.substring(0,8)}</p>
                  </td>
                  <td className="py-4 text-sm text-gray-800">{c.productName}</td>
                  <td className="py-4 text-right text-sm font-medium text-blue-700">{formatCurrency(c.computedPrice)}</td>
                  <td className="py-4 text-right text-sm font-medium text-red-600">{formatCurrency(c.computedCost)}</td>
                  <td className="py-4 text-right text-sm font-bold text-emerald-600 border-l border-gray-50 pl-4">{formatCurrency(c.profit)}</td>
                </tr>
              ))}
              
              {contractsData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">Nenhum contrato encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
