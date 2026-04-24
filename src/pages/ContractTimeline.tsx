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
        <section className="glass-panel p-8 md:p-12 rounded-[32px] mb-12 shadow-sm border border-white/40 overflow-hidden">
          <div className="flex flex-col items-center mb-10 text-center">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-blue-500 mb-2">Progresso do Contrato</h2>
            <div className="h-1 w-12 bg-blue-500 rounded-full"></div>
          </div>
          <Timeline steps={sortedSteps} />
        </section>

        {/* Vertical Detailed Layout */}
        <div className="space-y-8">
          <div className="flex items-center gap-4 mb-4">
             <div className="h-4 w-1 bg-gray-900 rounded-full"></div>
             <h2 className="text-xl font-bold text-gray-900">Detalhamento das Etapas</h2>
          </div>
          
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
                <div key={step.id} className="glass-card border-none rounded-[32px] p-8 relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                  <div className="absolute top-6 right-8 bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 size={12} /> Etapa Concluída
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-2xl">{step.description || "Esta etapa foi finalizada com sucesso e validada pela equipe técnica."}</p>
                  
                  {step.documentoSignatario && (
                    <div className="bg-gray-50 p-5 rounded-[24px] inline-flex flex-col gap-4 transition-colors hover:bg-emerald-50 border border-gray-100 group-hover:border-emerald-100 w-full">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm mb-0.5">{step.documentoTipo || 'Arquivo de Validação'}</h4>
                          <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wide">Digitalizado por {step.digitalizadoPor}</p>
                          <a href={step.documentoSignatario} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline font-bold inline-flex items-center gap-1">
                            Ver Documento PDF
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            if (isInProgress) {
              return (
                <div key={step.id} className="glass-card border-none rounded-[32px] p-8 md:p-10 relative shadow-[0_20px_50px_rgba(37,99,235,0.12)] border border-blue-100 transform transition-all my-10">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                  <div className="absolute top-8 right-8 bg-blue-600 text-white px-5 py-2 rounded-full text-[10px] font-bold flex items-center gap-2 uppercase tracking-[0.15em] shadow-lg shadow-blue-200">
                    <Clock size={12} className="animate-spin-slow" /> Ação Necessária
                  </div>
                  
                  <div className="max-w-2xl">
                    <h3 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">{step.title}</h3>
                    {step.description && <p className="text-gray-600 mb-8 text-lg leading-relaxed">{step.description}</p>}
                    
                    <div className="bg-blue-50/50 text-blue-900 p-6 rounded-[24px] text-sm mb-8 border border-blue-100/50 backdrop-blur-sm">
                      <p className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">i</span>
                        <span className="opacity-80">Por favor, anexe a documentação comprobatória para esta etapa. O envio solicitará a aprovação da nossa equipe técnica.</span>
                      </p>
                    </div>
                    
                    {(user?.role === 'client' || user?.role === 'collab' || user?.role === 'admin') && (
                      <div className="mt-4">
                        <FileUploadScanner contractId={contractId!} stepId={step.id} user={user} />
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            if (isPendingAdmin) {
              return (
                <div key={step.id} className="glass-card border-none rounded-[32px] p-8 md:p-10 relative shadow-xl border border-amber-100 my-10">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-400"></div>
                  <div className="absolute top-8 right-8 bg-amber-400 text-white px-5 py-2 rounded-full text-[10px] font-bold flex items-center gap-2 uppercase tracking-[0.15em] shadow-lg shadow-amber-200">
                    <ShieldCheck size={12} /> Validação Pendente
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center shrink-0 border border-amber-100">
                      <ShieldCheck className="w-8 h-8 text-amber-500" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
                      <p className="text-gray-600 mb-8 max-w-xl leading-relaxed">
                        Recebemos seus documentos. Nossa equipe de engenharia está validando os dados para liberar a próxima fase do cronograma.
                      </p>
                      
                      {step.documentoSignatario && (
                        <div className="mb-8">
                          <a href={step.documentoSignatario} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-white p-4 rounded-2xl border border-blue-100 shadow-sm text-blue-600 font-bold hover:bg-blue-50 transition-all">
                             <FileText size={20} />
                             <div className="text-left">
                               <p className="text-[10px] text-gray-400 uppercase font-black mb-0.5">Documento Enviado</p>
                               <span className="text-sm">Ver {step.documentoTipo || 'Arquivo'}</span>
                             </div>
                          </a>
                        </div>
                      )}
                      
                      {user?.role === 'admin' && (
                        <div className="bg-white/60 p-6 rounded-[24px] border border-amber-100 shadow-sm">
                          <p className="text-[10px] font-black text-amber-800/40 uppercase tracking-[0.2em] mb-4">Painel de Aprovação</p>
                          <div className="flex flex-wrap gap-4 items-center">
                            {/* Admin already sees the link above if we move it, but keeping this for consistency if needed */}
                            <button onClick={() => handleAdminApproveStep(step.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0">
                               <CheckCircle2 size={18} /> Aprovar Etapa
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // isFuture
            return (
              <div key={step.id} className="glass-card border-none rounded-[32px] p-8 bg-white/30 opacity-60 rounded-2xl relative transition-all hover:opacity-100 group">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-gray-200 transition-colors">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-1">{step.title}</h3>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Aguardando passos anteriores</p>
                  </div>
                </div>
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
