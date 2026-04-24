import React, { useState, useRef, useEffect } from 'react';
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
  previewUrl: string;
  file: File;
};

export default function FileUploadScanner({ contractId, stepId, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [capturedPages, setCapturedPages] = useState<ScanItem[]>([]);
  const [docType, setDocType] = useState('Contrato Assinado');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      capturedPages.forEach(p => URL.revokeObjectURL(p.previewUrl));
    };
  }, [capturedPages]);

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
          const options = { 
            maxSizeMB: 0.2, 
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            initialQuality: 0.5
          };
          fileToProcess = await imageCompression(file, options);
          
          newPages.push({
            id: Math.random().toString(36).substr(2, 9),
            previewUrl: URL.createObjectURL(fileToProcess),
            file: fileToProcess
          });
        } else if (file.type === 'application/pdf') {
          if (capturedPages.length > 0) {
             toast.warn("PDFs individuais devem ser enviados sozinhos.");
             capturedPages.forEach(p => URL.revokeObjectURL(p.previewUrl));
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
    setCapturedPages(prev => {
      const item = prev.find(p => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const generateAndUploadPDF = async () => {
    if (capturedPages.length === 0) return;
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < capturedPages.length; i++) {
        const item = capturedPages[i];
        if (!item || !item.file) continue;

        if (i > 0) pdf.addPage();
        
        try {
          // Convert file to base64 only when needed for PDF
          const base64 = await fileToBase64(item.file);
          const imgProps = pdf.getImageProperties(base64);
          
          let finalWidth = pageWidth;
          let finalHeight = (imgProps.height * pageWidth) / imgProps.width;

          if (finalHeight > pageHeight) {
            finalHeight = pageHeight;
            finalWidth = (imgProps.width * pageHeight) / imgProps.height;
          }

          const xOffset = (pageWidth - finalWidth) / 2;
          const yOffset = (pageHeight - finalHeight) / 2;
          
          pdf.addImage(base64, 'JPEG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'MEDIUM');
        } catch (imgError) {
          console.error(`Erro na página ${i}:`, imgError);
        }
        
        if (i % 2 === 0) await new Promise(resolve => setTimeout(resolve, 50));
      }

      const pdfArrayBuffer = pdf.output('arraybuffer');
      const pdfFile = new File([pdfArrayBuffer], `${docType.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      await uploadSingleFile(pdfFile);
      
      // Clean up blobs
      capturedPages.forEach(p => URL.revokeObjectURL(p.previewUrl));
      setCapturedPages([]);
      toast.success("Documento salvo com sucesso!");
    } catch (error: any) {
      console.error("Erro fatal na digitalização:", error);
      toast.error(`Falha: ${error.message || 'Erro de memória'}.`);
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
    <div className="flex flex-col gap-6 p-6 glass-card rounded-[2rem] border border-white/20 shadow-2xl relative">
      {loading && (
        <div className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-md rounded-[2rem] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="font-bold text-blue-900 animate-pulse">Processando Documento...</p>
          <p className="text-[10px] text-gray-500 mt-2 px-6 text-center">Por favor, não feche esta janela. Gerar o PDF pode levar alguns segundos dependendo do número de fotos.</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-blue-600" size={24} />
          Digitalizar Documentos
        </h3>
        {capturedPages.length > 0 && (
          <div className="flex gap-2">
            <button 
              onClick={() => { setCapturedPages([]); toast.info("Escaneamento limpo."); }}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Limpar tudo"
            >
              <Trash2 size={20} />
            </button>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full flex items-center">
              {capturedPages.length} Páginas
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
