import React, { useState } from 'react';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function LogoManager() {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const storagePath = `system/logo`;
      const bucketName = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'documents';
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, { upsert: true });

      if (error) throw error;

      const { data: publicURLData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

      // Save URL to Firestore
      await setDoc(doc(db, "settings", "branding"), {
        logoUrl: publicURLData.publicUrl,
        updatedAt: new Date()
      }, { merge: true });

      toast.success("Logo atualizada com sucesso!");
    } catch (error: any) {
      console.error("Erro no upload da logo:", error);
      toast.error("Falha ao atualizar logo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        id="logo-upload"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      <label
        htmlFor="logo-upload"
        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg cursor-pointer hover:bg-blue-200 transition-colors text-sm font-semibold"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Alterar Logo
      </label>
    </div>
  );
}
