import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import ClientCreateContract from '../components/ClientCreateContract';
import { LogOut, LayoutDashboard, ShoppingBag, MessageCircle } from 'lucide-react';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    
    // Contracts
    const qC = query(collection(db, "contracts"), where("clientId", "==", user.uid));
    const unsubContracts = onSnapshot(qC, (snapshot) => {
      setContracts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("ClientDashboard contracts listener error:", error);
    });

    // Products fetch
    const fetchProducts = async () => {
      const qP = query(collection(db, "products"));
      const snapshot = await getDocs(qP);
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchProducts();

    return () => unsubContracts();
  }, [user]);

  const handleLogout = () => {
    auth.signOut().then(() => navigate('/login'));
  };

  return (
    <div className="min-h-screen bg-transparent font-sans">
      <nav className="glass-panel mx-4 mt-6 rounded-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-blue-600">Orbe</span>
              <span className="ml-2 font-medium text-gray-800">| Meu Resumo</span>
            </div>
            <div className="flex items-center">
              <button onClick={handleLogout} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium">
                <LogOut size={16} /> Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {contracts.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <LayoutDashboard className="text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Meus Contratos em Andamento</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {contracts.map(contract => (
                <div key={contract.id} className="glass-card p-6 rounded-3xl hover:shadow-lg transition-shadow">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{contract.productName}</h3>
                  <p className="text-sm text-gray-500 mb-6">Iniciado em {new Date(contract.createdAt).toLocaleDateString()}</p>
                  
                  <button onClick={() => navigate(`/contract/${contract.id}`)} className="w-full py-3 glass-panel text-blue-700 font-semibold rounded-xl hover:bg-white/50 transition-colors">
                    Acompanhar Status
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Catálogo Orbe</h2>
            </div>
            <button className="flex items-center justify-center gap-2 text-sm font-semibold glass-card text-blue-700 px-4 py-2.5 rounded-xl hover:bg-white/50 transition-colors w-full sm:w-auto min-h-[44px]">
              <MessageCircle size={16} /> Falar com Vendedor
            </button>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map(product => (
              <ProductCard key={product.id} product={product} onSelect={() => setSelectedProduct(product)} />
            ))}
            {products.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                Catálogo sendo atualizado. Entre em contato com vendas para orçamentos.
              </div>
            )}
          </div>
        </section>

        {selectedProduct && (
          <ClientCreateContract 
            product={selectedProduct} 
            onCancel={() => setSelectedProduct(null)}
            onSuccess={() => setSelectedProduct(null)}
          />
        )}
      </div>
    </div>
  );
}
