import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import Timeline from '../components/Timeline';
import FileUploadScanner from '../components/FileUploadScanner';
import AdminContractManageSteps from '../components/AdminContractManageSteps';
import { toast } from 'react-toastify';
import { ArrowLeft, CheckCircle2, ShieldCheck, FileText, Lock, Clock } from 'lucide-react';

export default function ContractTimeline({ user }: { user: any }) {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractId) return;

    const fetchContract = async () => {
      const docRef = doc(db, 'contracts', contractId);
      const snap = await getDoc(docRef);
      if (snap.exists()) setContract({ id: snap.id, ...snap.data() });
      setLoading(false);
    };

    fetchContract();

    const qSteps = query(collection(db, `contracts/${contractId}/steps`), orderBy('order'));
    const unsubSteps = onSnapshot(qSteps, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSteps(docs);
    }, (error) => {
      console.error("ContractTimeline steps listener error:", error);
    });

    return () => unsubSteps();
  }, [contractId]);

  const handleAdminApproveStep = async (stepId: string) => {
    try {
      // Sort to reliably determine the next step
      const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
      const currentIndex = sortedSteps.findIndex(s => s.id === stepId);
      
      // mark this step as completed
      await updateDoc(doc(db, `contracts/${contractId}/steps`, stepId), { status: 'completed' });
      
      const nextStep = sortedSteps[currentIndex + 1];
      if (nextStep) {
        await updateDoc(doc(db, `contracts/${contractId}/steps`, nextStep.id), { status: 'in_progress' });
      } else {
        // all done
        await updateDoc(doc(db, `contracts`, contractId!), { status: 'completed', updatedAt: serverTimestamp() });
        toast.success("Todos os passos concluídos! Contrato finalizado.");
      }
    } catch (error) {
      toast.error("Erro ao aprovar etapa.");
    }
  };

  if (loading) return <div className="p-10 text-center">Carregando...</div>;
  if (!contract) return <div className="p-10 text-center">Contrato não encontrado.</div>;

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-transparent font-sans flex flex-col">
      <header className="glass-panel mx-4 mt-4 mb-2 rounded-[24px] sticky top-4 z-50 overflow-hidden shadow-sm">
        <div className="absolute inset-0 bg-white/20 backdrop-blur-2xl"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => {
              if (user?.role === 'admin') navigate('/admin');
              else if (user?.role === 'collab') navigate('/collab');
              else navigate('/client');
            }} className="p-3 bg-white/50 hover:bg-white text-gray-800 rounded-full transition-all shadow-sm transform hover:-translate-x-1">
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Acompanhamento Orbe</p>
              <h1 className="text-xl md:text-2xl lux-title text-gray-900 leading-tight">Timeline do Projeto</h1>
            </div>
          </div>
          <div className="hidden sm:block text-right">
             <p className="text-sm font-semibold text-gray-800">{contract.productName}</p>
             <p className="text-xs text-gray-500">{contract.clientName}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full">
        
        {/* Timeline Component (Visual representation) */}
        <div className="glass-panel p-6 rounded-3xl mb-8">
          <Timeline steps={sortedSteps} />
        </div>

        {/* Vertical Detailed Layout */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Detalhamento das Etapas</h2>
          
          {sortedSteps.map((step) => {
            // Compute dynamic status based on progress
            const isCompleted = step.status === 'completed';
            const isPendingAdmin = step.status === 'pending_admin_approval';
            
            // Find the lowest ordered step that is not completed
            const firstIncompleteStep = sortedSteps.find(s => s.status !== 'completed');
            
            // It is in progress if it's the first incomplete step, AND it's not pending_admin_approval
            const isInProgress = firstIncompleteStep?.id === step.id && !isPendingAdmin;
            
            // It is future/locked if it's neither completed, pending_admin, nor in_progress
            const isFuture = !isCompleted && !isPendingAdmin && !isInProgress;

            if (isCompleted) {
              return (
                <div key={step.id} className="glass-card border-l-4 border-emerald-500 rounded-2xl p-6 relative overflow-hidden transition-all hover:shadow-md">
                  <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-bl-xl text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Concluída
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{step.description || "Etapa finalizada com sucesso."}</p>
                  
                  {step.documentoSignatario && (
                    <div className="bg-emerald-50/50 p-4 rounded-xl inline-block mt-2 border border-emerald-100/50">
                      <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
                        <FileText size={16} className="text-emerald-600" /> Documento Registrado
                      </h4>
                      <p className="text-xs text-gray-500 mb-2">Responsável: {step.digitalizadoPor}</p>
                      <a href={step.documentoSignatario} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline font-medium inline-flex items-center gap-1">
                        Visualizar Arquivo
                      </a>
                    </div>
                  )}
                </div>
              );
            }

            if (isInProgress) {
              return (
                <div key={step.id} className="glass-card border-l-4 border-blue-600 rounded-2xl p-6 relative shadow-[0_8px_30px_rgb(0,0,0,0.08)] transform scale-[1.02] transition-transform my-8">
                  <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 px-4 py-1.5 rounded-bl-xl text-xs font-bold flex items-center gap-1 uppercase tracking-wider">
                    <Clock size={14} /> Em Andamento
                  </div>
                  <h3 className="text-2xl lux-title text-gray-900 mb-2">{step.title}</h3>
                  {step.description && <p className="text-gray-600 mb-4">{step.description}</p>}
                  <div className="bg-blue-50 text-blue-900 p-5 rounded-xl text-sm mb-6 border border-blue-100 shadow-sm">
                    <strong>Ação Necessária:</strong> Para avançar e concluir esta etapa, a documentação comprobatória (foto, contrato ou PDF) deve ser anexada abaixo. O resumo da etapa deve ser seguido rigorosamente.
                  </div>
                  
                  {(user?.role === 'client' || user?.role === 'collab' || user?.role === 'admin') && (
                    <FileUploadScanner contractId={contractId!} stepId={step.id} user={user} />
                  )}
                </div>
              );
            }

            if (isPendingAdmin) {
              return (
                <div key={step.id} className="glass-card border-l-4 border-amber-400 rounded-2xl p-6 relative shadow-md my-8">
                  <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 px-4 py-1.5 rounded-bl-xl text-xs font-bold flex items-center gap-1 uppercase tracking-wider">
                    <ShieldCheck size={14} /> Em Validação
                  </div>
                  <h3 className="text-2xl lux-title text-gray-900 mb-4">{step.title}</h3>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col sm:flex-row gap-5 items-start">
                    <ShieldCheck className="w-10 h-10 text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">Aguardando Avaliação</h4>
                      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                        A documentação referente a esta etapa ({step.title}) já foi enviada. Um administrador da Orbe está analisando os anexos para aprovar e liberar automaticamente a próxima fase.
                      </p>
                      
                      {user?.role === 'admin' && (
                        <div className="border-t border-amber-200 pt-5 mt-4">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Ações do Administrador</p>
                          {step.documentoSignatario && (
                            <a href={step.documentoSignatario} target="_blank" rel="noreferrer" className="text-blue-700 text-sm hover:underline mb-5 font-semibold flex items-center gap-2 bg-white/50 p-3 rounded-lg border border-amber-100 shadow-sm w-max">
                              <FileText size={18}/> Revisar Arquivo Anexado por {step.digitalizadoPor}
                            </a>
                          )}
                          <button onClick={() => handleAdminApproveStep(step.id)} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                            <CheckCircle2 size={20} /> Validar e Concluir Etapa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // isFuture
            return (
              <div key={step.id} className="glass-card border-l-4 border-gray-300 opacity-60 rounded-2xl p-6 bg-white/40 grayscale-[20%] transition-opacity hover:opacity-80">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-gray-200 p-2 rounded-full"><Lock size={16} className="text-gray-500" /></div>
                  <h3 className="text-lg font-bold text-gray-700">{step.title}</h3>
                </div>
                <p className="text-sm text-gray-500 pl-11">
                  Esta etapa está futura e bloqueada. Será disponibilizada automaticamente para envio de documentos após a conclusão da etapa anterior.
                </p>
              </div>
            );
          })}
          
          {sortedSteps.length === 0 && (
            <p className="text-center text-gray-500 py-10">Nenhuma etapa configurada para este contrato.</p>
          )}
        </div>

        {user?.role === 'admin' && (
          <AdminContractManageSteps contractId={contractId!} steps={steps} />
        )}
      </main>
    </div>
  );
}
