import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Plus, Trash2, GripVertical, Loader2, Edit3 } from 'lucide-react';

export default function AdminWorkflowConfig() {
  const [steps, setSteps] = useState<{ title: string; description: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStep, setNewStep] = useState('');

  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const docRef = doc(db, 'settings', 'default_workflow');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const rawSteps = snap.data().steps || [];
          // Backward compatibility: convert strings to objects
          const normalized = rawSteps.map((s: any) => 
            typeof s === 'string' ? { title: s, description: '' } : s
          );
          setSteps(normalized);
        } else {
          setSteps([
            { title: 'Compra', description: 'Assinatura do contrato e pagamento inicial.' },
            { title: 'Documentação', description: 'Envio de documentos pessoais e comprovante de residência.' },
            { title: 'Frete e Escavação', description: 'Logística de entrega e início da obra no local.' },
            { title: 'Instalação e Conclusão', description: 'Instalação da piscina, hidráulica e entrega técnica.' }
          ]);
        }
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar workflow padrão.");
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflow();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'default_workflow'), { steps });
      toast.success("Workflow padrão salvo com sucesso!");
    } catch (e) {
      toast.error("Erro ao salvar opções.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStep.trim()) return;
    setSteps([...steps, { title: newStep.trim(), description: '' }]);
    setNewStep('');
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= steps.length) return;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + direction];
    newSteps[index + direction] = temp;
    setSteps(newSteps);
  };

  if (loading) return <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="glass-card rounded-3xl p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Procedimento Padrão (Workflow)</h2>
        <p className="text-sm text-gray-500">
          Defina as etapas padrão que serão criadas quando um novo contrato for gerado. Você pode alterar para clientes específicos depois.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-3 bg-white/60 p-4 rounded-2xl border border-white/50 hover:shadow-md transition-all group">
            <div className="flex flex-col gap-1 text-gray-400 pt-1">
              <button onClick={() => moveStep(index, -1)} disabled={index === 0} className="hover:text-blue-600 disabled:opacity-30 transition-colors">▲</button>
              <button onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1} className="hover:text-blue-600 disabled:opacity-30 transition-colors">▼</button>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0 mt-1">
              {index + 1}
            </div>

            <div className="flex-grow space-y-2">
              <div className="relative group/input">
                <input 
                  type="text" 
                  value={step.title} 
                  onChange={e => {
                    const newSteps = [...steps];
                    newSteps[index].title = e.target.value;
                    setSteps(newSteps);
                  }}
                  className="w-full bg-transparent px-0 py-1 rounded-lg border-b border-transparent focus:border-blue-300 focus:bg-white/40 focus:px-3 focus:ring-0 font-bold text-gray-800 transition-all outline-none pr-10"
                  placeholder="Título da etapa"
                />
                <Edit3 size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 group-hover/input:text-blue-400 pointer-events-none" />
              </div>
              
              <textarea
                value={step.description}
                onChange={e => {
                  const newSteps = [...steps];
                  newSteps[index].description = e.target.value;
                  setSteps(newSteps);
                }}
                className="w-full bg-transparent text-sm text-gray-500 border-none focus:ring-0 focus:bg-white/40 focus:p-3 rounded-xl transition-all outline-none resize-none overflow-hidden"
                placeholder="Descrição opcional desta etapa..."
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
            </div>

            <button onClick={() => handleRemoveStep(index)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1 opacity-0 group-hover:opacity-100">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {steps.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-4">Nenhuma etapa definida.</p>
        )}
      </div>

      <form onSubmit={handleAddStep} className="flex flex-col sm:flex-row gap-2 mb-8">
        <input 
          type="text" 
          value={newStep} 
          onChange={e => setNewStep(e.target.value)} 
          placeholder="Nome da nova etapa..."
          className="flex-grow p-3 rounded-xl border border-white/50 bg-white/60 focus:ring-2 focus:ring-blue-500 outline-none w-full"
        />
        <button type="submit" className="bg-blue-100 text-blue-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-200 transition-colors w-full sm:w-auto min-h-[44px]">
          <Plus size={18} /> Adicionar
        </button>
      </form>

      <div className="flex justify-end border-t border-white/40 pt-4">
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : null}
          Salvar Workflow Padrão
        </button>
      </div>
    </div>
  );
}
