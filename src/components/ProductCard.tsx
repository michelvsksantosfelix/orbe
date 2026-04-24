import React from 'react';

interface Props {
  product: any;
  onSelect: () => void;
  key?: React.Key;
}

export default function ProductCard({ product, onSelect }: Props) {
  return (
    <div className="glass-card rounded-3xl overflow-hidden hover:shadow-lg transition-all">
      <img src={product.image || 'https://images.unsplash.com/photo-1576013551627-11dc5fdb6ad5?auto=format&fit=crop&q=80&w=800'} alt={product.title} className="w-full h-48 object-cover" />
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900">{product.title}</h3>
          {(product.price) && (
            <span className="glass-panel border-white/50 text-blue-700 text-xs font-bold px-2 py-1 rounded">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>
        
        <div className="space-y-2 mb-6">
          {product.specifications && Object.entries(product.specifications).map(([key, value]) => (
            <div key={key} className="flex justify-between text-xs border-b border-white/30 pb-1">
              <span className="text-gray-400 capitalize">{key}:</span>
              <span className="font-medium text-gray-700">{value as string}</span>
            </div>
          ))}
        </div>

        <button onClick={onSelect} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
          Tenho Interesse / Ver Detalhes
        </button>
      </div>
    </div>
  );
}
