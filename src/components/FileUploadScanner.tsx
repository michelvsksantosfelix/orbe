import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import imageCompression from 'browser-image-compression';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

interface Props {
  contractId: string;
  stepId: string;
  user: { uid: string; name: string; displayName?: string | null; email?: string | null };
}

export default function FileUploadScanner({ contractId, stepId, user }: Props) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setLoading(true);

    try {
      let fileToUpload = file;
      let downloadURL = '';
      
      if (file.type.startsWith('image/')) {
        toast.info('Comprimindo imagem para salvar...');
        const options = { maxSizeMB: 0.1, maxWidthOrHeight: 800, useWebWorker: false };
        fileToUpload = await imageCompression(file, options);
      } else if (file.size > 800 * 1024) {
        throw new Error('Arquivo muito grande. O limite atual é de 800KB para PDFs.');
      }
      
      downloadURL = await fileToBase64(fileToUpload);

      // 2. Audit Log (Audit Trail)
      await addDoc(collection(db, "audit_logs"), {
        action: "FILE_UPLOADED",
        contractId,
        stepId,
        userId: user.uid,
        fileUrl: downloadURL,
        fileName: fileToUpload.name,
        timestamp: serverTimestamp(),
      });

      // 3. Update the step with the document and metadata
      const stepRef = doc(db, "contracts", contractId, "steps", stepId);
      await updateDoc(stepRef, {
        documentoSignatario: downloadURL,
        digitalizadoPor: user.displayName || user.name || 'Usuário Desconhecido',
        dataDigitalizacao: serverTimestamp(),
        status: 'pending_admin_approval' // Vai para admin validar
      });

      toast.success("Documento registado com sucesso!");
    } catch (error: any) {
      console.error("Erro no upload:", error);
      if (error.code === 'storage/unauthorized') {
         toast.error('Erro de permissão no Storage (storage.rules). Peça ao desenvolvedor para liberar acesso.');
      } else {
         toast.error(`Erro ao registrar documento: ${error.message || 'Desconhecido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 glass-card rounded-3xl">
      <h3 className="text-lg font-semibold text-gray-800">Digitalizar Documento Assinado</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Usar Camara */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-blue-300 rounded-2xl hover:bg-white/50 transition-colors disabled:opacity-50"
        >
          <Camera className="w-8 h-8 text-blue-500 mb-2" />
          <span className="text-sm font-medium">Tirar Foto / Scan</span>
        </button>

        {/* Galeria */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/50 rounded-2xl hover:bg-white/50 transition-colors disabled:opacity-50"
        >
          <ImageIcon className="w-8 h-8 text-gray-500 mb-2" />
          <span className="text-sm font-medium">Galeria</span>
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
      />

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          A processar e a registar documento...
        </div>
      )}

      <p className="text-xs text-blue-500 mt-2 text-center">
        O sistema registrará automaticamente que você ({user.displayName || user.name}) é o responsável por esta cópia digital.
      </p>
    </div>
  );
}
