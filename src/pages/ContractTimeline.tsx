enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Not throwing here to avoid breaking the UI flow, 
  // but we can add toast or other error reporting.
  toast.error("Erro na operação de banco de dados");
}

import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import Timeline from '../components/Timeline';
import FileUploadScanner from '../components/FileUploadScanner';
import AdminContractManageSteps from '../components/AdminContractManageSteps';
import { toast } from 'react-toastify';
import { ArrowLeft, CheckCircle2, ShieldCheck, FileText, Lock, Clock, MessageCircle, Edit2, Plus, X } from 'lucide-react';

export default function ContractTimeline({ user }: { user: any }) {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAdminMessage, setEditingAdminMessage] = useState<{ stepId: string, message: string } | null>(null);

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
      handleFirestoreError(error, OperationType.LIST, `contracts/${contractId}/steps`);
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
      handleFirestoreError(error, OperationType.UPDATE, `contracts/${contractId}/steps`);
    }
  };

  const handleSaveAdminMessage = async () => {
    if (!editingAdminMessage) return;
    try {
      await updateDoc(doc(db, `contracts/${contractId}/steps`, editingAdminMessage.stepId), {
        adminMessage: editingAdminMessage.message
      });
      toast.success("Informação salva com sucesso!");
      setEditingAdminMessage(null);
    } catch (error) {
       toast.error("Erro ao salvar informação.");
       console.error(error);
    }
  };

  const renderAdminMessage = (step: any) => {
    const hasMessage = !!step.adminMessage;
    const isAdmin = user?.role === 'admin';

    if (!hasMessage && !isAdmin) return null;

    return (
      <div className="mt-8 mb-4">
        {hasMessage ? (
          <div className="bg-amber-50/80 border border-amber-200/60 rounded-[24px] p-6 relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white shadow-sm border border-amber-100 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                <MessageCircle size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h4 className="text-amber-900 font-bold text-sm tracking-wide uppercase mb-1">Informação do Admin</h4>
                <p className="text-amber-800/90 text-sm leading-relaxed whitespace-pre-wrap">{step.adminMessage}</p>
              </div>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setEditingAdminMessage({ stepId: step.id, message: step.adminMessage })}
                className="absolute top-4 right-4 bg-white p-2.5 rounded-full text-amber-500 hover:text-amber-700 hover:bg-amber-100 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                title="Editar Informação"
              >
                <Edit2 size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        ) : (
          isAdmin && (
            <button
              onClick={() => setEditingAdminMessage({ stepId: step.id, message: '' })}
              className="group flex items-center justify-center gap-2 w-full sm:w-auto text-sm text-blue-600 font-bold hover:text-white bg-blue-50 hover:bg-blue-600 px-6 py-3 rounded-xl transition-all border border-blue-200 border-dashed hover:border-solid hover:shadow-lg hover:shadow-blue-200"
            >
              <Plus size={18} className="transition-transform group-hover:rotate-90" strokeWidth={2.5} />
              Adicionar Informação ao Usuário
            </button>
          )
        )}
      </div>
    );
  };

  const renderDocuments = (step: any, accentColor: 'blue' | 'emerald' | 'amber' = 'blue') => {
    const hasDocs = Array.isArray(step.documentos) && step.documentos.length > 0;
    const hasSingleDoc = !!step.documentoSignatario;
    
    if (!hasDocs && !hasSingleDoc) return null;

    const bgMap = {
      blue: 'bg-white border-blue-100 hover:bg-blue-50',
      emerald: 'bg-white border-emerald-100 hover:bg-emerald-50',
      amber: 'bg-white border-amber-100 hover:bg-amber-50',
    };
    
    const iconBgMap = {
      blue: 'bg-blue-600 text-white',
      emerald: 'bg-emerald-500 text-white',
      amber: 'bg-amber-50 text-amber-500 border border-amber-100',
    };

    const textColorMap = {
      blue: 'text-blue-600',
      emerald: 'text-emerald-600',
      amber: 'text-blue-600',
    };

    if (hasDocs) {
      return (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {step.documentos.map((docUrl: string, idx: number) => (
            <div key={idx} className={`p-4 rounded-2xl transition-colors border shadow-sm ${bgMap[accentColor]} w-full`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${iconBgMap[accentColor]} shrink-0`}>
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-xs mb-0.5 truncate">{step.documentoTipo || 'Arquivo de Validação'}</h4>
                  <a href={docUrl} target="_blank" rel="noreferrer" className={`${textColorMap[accentColor]} text-xs hover:underline font-bold inline-flex items-center gap-1`}>
                    Ver Arquivo {idx + 1}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className={`mb-6 p-4 rounded-2xl transition-colors border shadow-sm ${bgMap[accentColor]} w-full`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${iconBgMap[accentColor]} shrink-0`}>
            <FileText size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 text-sm mb-0.5 truncate">{step.documentoTipo || 'Arquivo de Validação'}</h4>
            {step.digitalizadoPor && <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Por {step.digitalizadoPor}</p>}
            <a href={step.documentoSignatario} target="_blank" rel="noreferrer" className={`${textColorMap[accentColor]} text-xs hover:underline font-bold inline-flex items-center gap-1`}>
              Ver Documento PDF
            </a>
          </div>
        </div>
      </div>
    );
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
              else if (user?.role === 'colaborador') navigate('/colaborador');
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
                  
                  {renderDocuments(step, 'emerald')}

                  {renderAdminMessage(step)}
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

                    {renderDocuments(step, 'blue')}

                    {renderAdminMessage(step)}
                    
                    {(user?.role === 'client' || user?.role === 'admin' || user?.uid === step.assignedToId) && (
                      <div className="mt-4">
                        <FileUploadScanner contractId={contractId!} stepId={step.id} user={user} />
                      </div>
                    )}

                    {(user?.role === 'admin') && (
                      <div className="mt-8 pt-6 border-t border-blue-100 flex justify-end">
                        <button onClick={() => handleAdminApproveStep(step.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-200 hover:-translate-y-0.5">
                          <CheckCircle2 size={18} /> Concluir Etapa
                        </button>
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
                      
                      {renderDocuments(step, 'amber')}
                      
                      {user?.role === 'admin' && (
                        <div className="bg-white/60 p-6 rounded-[24px] border border-amber-100 shadow-sm mb-6">
                          <p className="text-[10px] font-black text-amber-800/40 uppercase tracking-[0.2em] mb-4">Painel de Aprovação</p>
                          <div className="flex flex-wrap gap-4 items-center">
                            {/* Admin already sees the link above if we move it, but keeping this for consistency if needed */}
                            <button onClick={() => handleAdminApproveStep(step.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0">
                               <CheckCircle2 size={18} /> Aprovar Etapa
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {renderAdminMessage(step)}

                      {(user?.role === 'client' || user?.role === 'admin' || user?.uid === step.assignedToId) && (
                        <div className="mt-4 pt-6 border-t border-gray-100">
                          <h4 className="text-sm font-bold text-gray-700 mb-4">Deseja adicionar mais documentos?</h4>
                          <FileUploadScanner contractId={contractId!} stepId={step.id} user={user} />
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
                {renderAdminMessage(step)}
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

      {/* Admin Message Editing Modal */}
      {editingAdminMessage && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl transform transition-all">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                    <MessageCircle size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Informação ao Usuário</h3>
                </div>
                <button 
                  onClick={() => setEditingAdminMessage(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Escreva uma mensagem, solicitação ou instrução que ficará em destaque para o cliente nesta etapa.
              </p>
              
              <textarea
                value={editingAdminMessage.message}
                onChange={(e) => setEditingAdminMessage({ ...editingAdminMessage, message: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-[20px] p-5 text-gray-700 min-h-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y text-base"
                placeholder="Ex: Favor providenciar as fotos do local com urgência para avançarmos com a próxima etapa..."
              />
              
              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => setEditingAdminMessage(null)}
                  className="px-6 py-3.5 font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAdminMessage}
                  className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 order-1 sm:order-2 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Salvar Informação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
