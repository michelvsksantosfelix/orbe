import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Loader2, Plus, Trash2, FileText, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';
import imageCompression from 'browser-image-compression';
import { jsPDF } from "jspdf";

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

type ScanItem = {
  id: string;
  base64: string;
  file: File;
};

export default function FileUploadScanner({ contractId, stepId, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [capturedPages, setCapturedPages] = useState<ScanItem[]>([]);
  const [docType, setDocType] = useState('Contrato Assinado');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const newPages: ScanItem[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileToProcess = file;

        if (file.type.startsWith('image/')) {
          const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: false };
          fileToProcess = await imageCompression(file, options);
          const base64 = await fileToBase64(fileToProcess);
          newPages.push({
            id: Math.random().toString(36).substr(2, 9),
            base64,
            file: fileToProcess
          });
        } else if (file.type === 'application/pdf') {
          // If a PDF is selected, we upload it directly as it's already a document
          if (capturedPages.length > 0) {
             toast.warn("PDFs individuais devem ser enviados sozinhos. Limpando fotos capturadas.");
             setCapturedPages([]);
          }
          await uploadSingleFile(file);
          return;
        }
      }

      setCapturedPages(prev => [...prev, ...newPages]);
      toast.success(`${newPages.length} página(s) adicionada(s)`);
    } catch (error: any) {
      console.error("Erro ao processar ficheiro:", error);
      toast.error("Erro ao processar imagem.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const removePage = (id: string) => {
    setCapturedPages(prev => prev.filter(p => p.id !== id));
  };

  const generateAndUploadPDF = async () => {
    if (capturedPages.length === 0) return;
    setLoading(true);
    console.log("Iniciando geração de PDF com", capturedPages.length, "páginas");
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      for (let i = 0; i < capturedPages.length; i++) {
        const item = capturedPages[i];
        if (!item || !item.base64) {
          console.warn("Página", i, "inválida, pulando...");
          continue;
        }

        if (i > 0) pdf.addPage();
        
        const img = item.base64;
        let imgProps;
        try {
          imgProps = pdf.getImageProperties(img);
        } catch (e) {
          console.error("Erro ao obter propriedades da imagem", i, e);
          continue;
        }

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const pdfBlob = pdf.output('blob');
      console.log("PDF gerado como Blob, tamanho:", pdfBlob.size);
      
      if (pdfBlob.size === 0) {
        throw new Error("PDF gerado está vazio.");
      }

      const pdfFile = new File([pdfBlob], `${docType.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      await uploadSingleFile(pdfFile);
      setCapturedPages([]);
    } catch (error: any) {
      console.error("Erro crítico ao gerar PDF:", error);
      toast.error(`Falha na geração do documento: ${error.message || 'Erro interno'}`);
      // Fallback: If PDF fails, try to upload the first image directly if single page
      if (capturedPages.length === 1) {
        console.log("Tentando upload da imagem única como fallback");
        await uploadSingleFile(capturedPages[0].file);
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadSingleFile = async (file: File) => {
    console.log("Iniciando upload de arquivo:", file.name, "tamanho:", file.size);
    try {
      const storagePath = `contracts/${contractId}/steps/${stepId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      // Upload to Firebase Storage
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("Download URL obtido:", downloadURL);

      // Audit Log
      await addDoc(collection(db, "audit_logs"), {
        action: "FILE_UPLOADED",
        contractId,
        stepId,
        userId: user.uid,
        fileUrl: downloadURL,
        fileName: file.name,
        docType,
        timestamp: serverTimestamp(),
      });

      // Update the step
      const stepRef = doc(db, "contracts", contractId, "steps", stepId);
      await updateDoc(stepRef, {
        documentoSignatario: downloadURL,
        documentoTipo: docType,
        digitalizadoPor: user.displayName || user.name || 'Usuário',
        dataDigitalizacao: serverTimestamp(),
        status: 'pending_admin_approval'
      });

      console.log("Documento atualizado no Firestore com sucesso");
      toast.success("Documento registrado com sucesso!");
    } catch (error: any) {
      console.error("Erro no upload para Firebase Storage/Firestore:", error);
      toast.error(`Erro ao registrar documento: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 glass-card rounded-[2rem] border border-white/20 shadow-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-blue-600" size={24} />
          Digitalizar Documentos
        </h3>
        {capturedPages.length > 0 && (
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
            {capturedPages.length} Páginas
          </span>
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
                src={page.base64} 
                alt={`Página ${index + 1}`} 
                className="w-24 h-32 object-cover rounded-xl border-2 border-white shadow-md"
              />
              <button 
                onClick={() => removePage(page.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg"
              >
                <X size={12} strokeWidth={3} />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/40 text-white text-[10px] px-1.5 rounded-md backdrop-blur-sm">
                Pág {index + 1}
              </div>
            </div>
          ))}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-32 flex-shrink-0 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center text-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Plus size={24} />
            <span className="text-[10px] font-bold uppercase mt-1">Add Pág</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
        >
          <Camera className="w-10 h-10 mb-2" />
          <span className="text-xs font-black uppercase">Câmera</span>
        </button>

        <button
          onClick={() => galleryInputRef.current?.click()}
          disabled={loading}
          className="flex flex-col items-center justify-center p-6 bg-white border border-gray-100 text-gray-600 rounded-3xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
        >
          <ImageIcon className="w-10 h-10 mb-2 text-blue-500" />
          <span className="text-xs font-black uppercase">Galeria</span>
        </button>
      </div>

      {capturedPages.length > 0 && (
        <button
          onClick={generateAndUploadPDF}
          disabled={loading}
          className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-gray-300"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-6 h-6" />
              Salvar Documento
            </>
          )}
        </button>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileCapture}
        accept="image/*"
        capture="environment"
        className="hidden"
        multiple
      />
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
