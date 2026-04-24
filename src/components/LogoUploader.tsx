import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { toast } from 'react-toastify';
import { Upload } from 'lucide-react';

export default function LogoUploader() {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    try {
      setLoading(true);
      const storageRef = ref(storage, 'logo.png');
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await setDoc(doc(db, 'settings', 'logo'), { url: downloadURL });
      
      toast.success("Logo atualizada com sucesso!");
      window.location.reload(); // Refresh to apply new logo
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar logo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Configurações de Identidade</h3>
      <label className="flex items-center gap-3 px-6 py-4 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border border-dashed border-gray-300">
        <Upload size={20} className="text-gray-500" />
        <span className="font-semibold text-gray-700">
          {loading ? 'Enviando...' : 'Alterar logo do App'}
        </span>
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={loading} />
      </label>
    </div>
  );
}
