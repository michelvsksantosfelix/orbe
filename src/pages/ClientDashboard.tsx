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
      <nav className="glass-panel mx-4 mt-6 rounded-[32px] shadow-sm border border-white/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200">O</div>
              <span className="text-xl font-black text-gray-900 tracking-tighter">MEU RESUMO</span>
            </div>
            <div className="flex items-center">
              <button onClick={handleLogout} className="bg-white/40 hover:bg-white text-gray-700 px-5 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all">
                <LogOut size={14} /> Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        
        {contracts.length > 0 && (
          <section className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                <LayoutDashboard size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-tight">Projetos em Execução</h2>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.15em]">Siga cada passo da sua instalação</p>
              </div>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {contracts.map(contract => (
                <div key={contract.id} className="group glass-card p-0 rounded-[40px] overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 border-none">
                  <div className="p-10 pb-8 flex-1">
                     <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 border border-emerald-100">
                       Ativo
                     </span>
                     <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight uppercase tracking-tight group-hover:text-blue-600 transition-colors">{contract.productName}</h3>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">Código: #{contract.id.slice(0, 8)}</p>
                  </div>
                  
                  <div className="p-2 pt-0">
                    <button 
                      onClick={() => navigate(`/contract/${contract.id}`)} 
                      className="w-full py-5 bg-gray-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[32px] hover:bg-blue-600 transition-all shadow-xl shadow-gray-200"
                    >
                      Painel de Acompanhamento
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-tight">Catálogo Orbe</h2>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.15em]">Explore soluções inteligentes</p>
              </div>
            </div>
            <a 
              href="https://wa.me/5521992006894?text=Olá Claudiany! Gostaria de saber mais sobre as piscinas da Orbe."
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] bg-white hover:bg-blue-600 hover:text-white text-gray-900 px-8 py-4 rounded-[24px] transition-all border border-gray-100 shadow-xl shadow-gray-100 w-full sm:w-auto"
            >
              <MessageCircle size={18} /> Falar com Vendas
            </a>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {products.map(product => (
              <ProductCard key={product.id} product={product} onSelect={() => setSelectedProduct(product)} />
            ))}
            {products.length === 0 && (
              <div className="col-span-full text-center py-24 glass-card rounded-[40px] border-dashed border-2 border-white/50 bg-white/10">
                <ShoppingBag size={48} className="mx-auto text-gray-300 mb-6 opacity-20" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Catálogo em fase de sincronização</p>
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
