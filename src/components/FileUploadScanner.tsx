import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Loader2, Plus, Trash2, FileText, CheckCircle2, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { addDoc, collection, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { toast } from 'react-toastify';
import imageCompression from 'browser-image-compression';

interface Props {
  contractId: string;
  stepId: string;
  user: { uid: string; name: string; displayName?: string | null; email?: string | null };
}

type ScanItem = {
  id: string;
  previewUrl: string;
  file: File;
};

export default function FileUploadScanner({ contractId, stepId, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [capturedPages, setCapturedPages] = useState<ScanItem[]>([]);
  const [docType, setDocType] = useState('Contrato Assinado');
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) return;

    // IMPORTANT: Copy files to an array immediately before async operations
    const files = Array.from(inputFiles);

    setLoading(true);
    try {
      const newPages: ScanItem[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileToProcess = file;

        if (file.type.startsWith('image/')) {
          const options = { 
            maxSizeMB: 0.8, // Good resolution
            maxWidthOrHeight: 1600,
            useWebWorker: false,
          };
          fileToProcess = await imageCompression(file, options);
          
          const previewUrl = URL.createObjectURL(fileToProcess);
          objectUrlsRef.current.push(previewUrl);
          newPages.push({
            id: Math.random().toString(36).substr(2, 9),
            previewUrl: previewUrl,
            file: fileToProcess
          });
        } else if (file.type === 'application/pdf') {
          newPages.push({
            id: Math.random().toString(36).substr(2, 9),
            previewUrl: 'https://cdn-icons-png.flaticon.com/512/337/337946.png', // Generic PDF icon
            file: file
          });
        }
      }

      setCapturedPages(prev => [...prev, ...newPages]);
      toast.success(`${newPages.length} arquivo(s) adicionado(s)`);
    } catch (error: any) {
      console.error("Erro ao processar ficheiro:", error);
      toast.error("Erro ao processar imagem.");
    } finally {
      setLoading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const removePage = (id: string) => {
    setCapturedPages(prev => {
      const item = prev.find(p => p.id === id);
      if (item && item.file.type.startsWith('image/')) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const uploadFiles = async () => {
    if (capturedPages.length === 0) return;
    setLoading(true);
    
    try {
      const uploadPromises = capturedPages.map(async (item, index) => {
        const extension = item.file.type === 'application/pdf' ? 'pdf' : 'jpg';
        const storagePath = `contracts/${contractId}/steps/${stepId}/${Date.now()}_page_${index + 1}.${extension}`;
        
        // Ensure you have a 'documents' bucket created in your Supabase project and it is set to "Public"
        const bucketName = import.meta.env.SUPABASE_STORAGE_BUCKET || import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'documents';
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, item.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          throw error;
        }

        const { data: publicURLData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(storagePath);
          
        return publicURLData.publicUrl;
      });

      const downloadURLs = await Promise.all(uploadPromises);

      // Audit Log
      await addDoc(collection(db, "audit_logs"), {
        action: "FILES_UPLOADED_BATCH",
        contractId,
        stepId,
        userId: user.uid,
        fileUrls: downloadURLs,
        docType,
        timestamp: serverTimestamp(),
      });

      // Update the step with array of URLs
      const stepRef = doc(db, "contracts", contractId, "steps", stepId);
      await updateDoc(stepRef, {
        documentos: arrayUnion(...downloadURLs), // Array of URLs appended safely
        documentoSignatario: downloadURLs[0], // Keep for backwards compatibility
        documentoTipo: docType,
        digitalizadoPor: user.displayName || user.name || 'Usuário',
        dataDigitalizacao: serverTimestamp(),
        status: 'pending_admin_approval'
      });

      capturedPages.forEach(p => {
        if (p.file.type.startsWith('image/')) URL.revokeObjectURL(p.previewUrl);
      });
      setCapturedPages([]);
      toast.success("Documento(s) enviado(s) com sucesso!");
    } catch (error: any) {
      console.error("Erro fatal no upload:", error);
      toast.error(`Falha ao registrar: ${error.message || 'Erro interno'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 glass-card rounded-[2rem] border border-white/20 shadow-2xl relative overflow-hidden">
      <div className={`absolute inset-0 z-[100] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-300 ${loading ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="font-bold text-blue-900 animate-pulse">Enviando Arquivos...</p>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-blue-600" size={24} />
          Anexar Documentos
        </h3>
        {capturedPages.length > 0 && (
          <div className="flex gap-2">
             <button 
              onClick={() => { setCapturedPages([]); toast.info("Limpo"); }}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={20} />
            </button>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full flex items-center">
              {capturedPages.length} Itens
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Tipo do Documento</label>
        <select 
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="w-full p-4 bg-white/50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        >
          <option>Contrato Assinado</option>
          <option>Documento de Identidade (RG/CNH)</option>
          <option>Comprovante de Residência</option>
          <option>Documentação Técnica</option>
          <option>Outros Documentos</option>
        </select>
      </div>
      
      {capturedPages.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4 pt-2 no-scrollbar">
          {capturedPages.map((page, index) => (
            <div key={page.id} className="relative flex-shrink-0 group">
              <img 
                src={page.previewUrl} 
                alt={`Página ${index + 1}`} 
                className="w-24 h-32 object-cover rounded-xl border-2 border-slate-100 shadow-md"
              />
              <button 
                onClick={() => removePage(page.id)}
                type="button"
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg"
              >
                <X size={12} strokeWidth={3} />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/40 text-white text-[10px] px-1.5 rounded-md backdrop-blur-sm">
                #{index + 1}
              </div>
            </div>
          ))}
          <button 
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="w-24 h-32 flex-shrink-0 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center text-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      <div className="w-full">
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={loading}
          className="w-full flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-blue-200 text-blue-600 rounded-3xl hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
        >
          <ImageIcon className="w-10 h-10 mb-2 text-blue-500" />
          <span className="text-xs font-black uppercase">Selecionar Arquivos</span>
          <span className="text-[10px] text-gray-400 mt-1">Imagens ou PDFs</span>
        </button>
      </div>

      {capturedPages.length > 0 && (
        <button
          type="button"
          onClick={uploadFiles}
          disabled={loading}
          className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-gray-300"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-6 h-6" />
              Concluir Envio
            </>
          )}
        </button>
      )}

      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileCapture}
        accept="image/*,application/pdf"
        className="hidden"
        multiple
      />
    </div>
  );
}
