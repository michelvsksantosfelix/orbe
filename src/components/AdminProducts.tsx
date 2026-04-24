import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Trash2, Plus, Image as ImageIcon, Loader2, Edit2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [priceShipping, setPriceShipping] = useState('');
  const [costShipping, setCostShipping] = useState('');
  const [priceInstalled, setPriceInstalled] = useState('');
  const [costInstalled, setCostInstalled] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    const q = query(collection(db, "products"));
    const snapshot = await getDocs(q);
    setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !price) {
      toast.error('Preencha os campos obrigatórios (Título, Descrição e Preço).');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        toast.info('Comprimindo imagem para salvar...');
        const options = {
          maxSizeMB: 0.1, // very small to fit in firestore
          maxWidthOrHeight: 800,
          useWebWorker: false,
        };
        const compressedFile = await imageCompression(imageFile, options);
        imageUrl = await fileToBase64(compressedFile);
      }

      const updateData: any = {
        title,
        description,
        price: parseFloat(price.toString().replace(',', '.')),
        cost: parseFloat(cost.toString().replace(',', '.')) || 0,
        priceShipping: parseFloat(priceShipping.toString().replace(',', '.')) || 0,
        costShipping: parseFloat(costShipping.toString().replace(',', '.')) || 0,
        priceInstalled: parseFloat(priceInstalled.toString().replace(',', '.')) || 0,
        costInstalled: parseFloat(costInstalled.toString().replace(',', '.')) || 0,
      };
      if (imageUrl) {
        updateData.image = imageUrl;
      }

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), updateData);
        toast.success('Produto atualizado!');
      } else {
        await addDoc(collection(db, 'products'), {
          ...updateData,
          specifications: {},
          servicesIncluded: []
        });
        toast.success('Produto adicionado ao catálogo!');
      }

      setIsAdding(false);
      setEditingId(null);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'storage/unauthorized') {
         toast.error('Erro de permissão no Storage (storage.rules). Peça ao desenvolvedor para liberar.');
      } else {
         toast.error(`Erro ao salvar produto: ${error.message || 'Desconhecido'}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este produto do catálogo?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        toast.success('Produto removido.');
        fetchProducts();
      } catch (e: any) {
        console.error('Delete error:', e);
        toast.error(`Erro ao remover produto: ${e.message}`);
      }
    }
  };

  const handleEditInit = (product: any) => {
    setEditingId(product.id);
    setTitle(product.title);
    setDescription(product.description);
    setPrice(product.price.toString());
    setCost(product.cost?.toString() || '');
    setPriceShipping(product.priceShipping?.toString() || '');
    setCostShipping(product.costShipping?.toString() || '');
    setPriceInstalled(product.priceInstalled?.toString() || '');
    setCostInstalled(product.costInstalled?.toString() || '');
    setIsAdding(true); // Re-using the form for editing
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setCost('');
    setPriceShipping('');
    setCostShipping('');
    setPriceInstalled('');
    setCostInstalled('');
    setImageFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Catálogo de Produtos e Serviços</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto min-h-[44px]">
            <Plus size={16} /> Novo Produto
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAddProduct} className="glass-card p-6 rounded-3xl space-y-4 shadow-sm relative">
          <h3 className="font-bold text-lg text-gray-800 mb-4">Adicionar Novo Produto</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título / Nome</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Piscina Orbe Infinity" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Detalhes do produto ou serviço..." rows={3} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda Base (R$)</label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 50000.00 (Obrigatório)" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo Estimado Base (R$)</label>
              <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 35000.00" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venda c/ Frete (R$)</label>
              <input type="number" step="0.01" value={priceShipping} onChange={e => setPriceShipping(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 55000.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo c/ Frete (R$)</label>
              <input type="number" step="0.01" value={costShipping} onChange={e => setCostShipping(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 38000.00" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venda c/ Frete e Instalado (R$)</label>
              <input type="number" step="0.01" value={priceInstalled} onChange={e => setPriceInstalled(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 65000.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo c/ Frete e Instalado (R$)</label>
              <input type="number" step="0.01" value={costInstalled} onChange={e => setCostInstalled(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 45000.00" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagem Principal</label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <ImageIcon size={18} /> {imageFile ? imageFile.name : 'Escolher Imagem'}
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/30 truncate">
            <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }} className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition w-full sm:w-auto text-center order-2 sm:order-1">Cancelar</button>
            <button type="submit" disabled={uploading} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center gap-2 w-full sm:w-auto order-1 sm:order-2">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} 
              {uploading ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="glass-card rounded-3xl overflow-hidden hover:shadow-lg transition-all relative">
              <img src={product.image || 'https://images.unsplash.com/photo-1576013551627-11dc5fdb6ad5?auto=format&fit=crop&q=80&w=800'} alt={product.title} className="w-full h-40 object-cover" />
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => handleEditInit(product)} className="bg-white/80 p-2 rounded-full text-blue-600 hover:bg-blue-50 transition shadow-sm">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(product.id)} className="bg-white/80 p-2 rounded-full text-red-600 hover:bg-red-50 transition shadow-sm">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-1">{product.title}</h3>
                <div className="flex gap-4 mb-2 border-b border-gray-100 pb-2">
                  <p className="text-sm font-medium text-blue-700">
                    <span className="block text-xs uppercase tracking-wider text-gray-400">Venda</span>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                  </p>
                  {product.cost ? (
                    <p className="text-sm font-medium text-gray-600">
                      <span className="block text-xs uppercase tracking-wider text-gray-400">Custo</span>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.cost)}
                    </p>
                  ) : null}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mt-2">{product.description}</p>
              </div>
            </div>
          ))}
          {products.length === 0 && !isAdding && (
            <div className="col-span-full text-center py-12 glass-card rounded-3xl border-dashed border-2 border-white/50">
              <p className="text-gray-500">Nenhum produto cadastrado no catálogo.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
