import React, { useState, useEffect } from 'react';
import { Download, Info, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (window.self !== window.top) {
      // In an iframe (AI Studio preview environment)
      alert("Para instalar, você precisa abrir o aplicativo em uma nova guia primeiro (clique no ícone de 'Nova Guia' na parte superior direita da barra de ferramentas do preview).");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructions(true);
    }
  };

  if (isStandalone) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs py-4 px-6 rounded-[24px] shadow-2xl transition-all hover:scale-105 active:scale-95"
      >
        <Download size={18} />
        <span>Instalar App</span>
      </button>

      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 text-blue-600">
              <Info size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Instalação Manual</h3>
            <p className="text-gray-600 text-center mb-6 text-sm">
              Seu dispositivo ou navegador atual não suporta a instalação em 1 clique.
            </p>
            <div className="bg-gray-50 rounded-2xl p-5 mb-2">
              <p className="text-sm text-gray-700 mb-3 font-semibold">No iPhone/iPad (Safari):</p>
              <ol className="list-decimal pl-4 text-sm text-gray-600 space-y-2">
                <li>Toque no ícone de <span className="font-bold">Compartilhar</span> na barra inferior.</li>
                <li>Role para baixo e selecione <span className="font-bold">Adicionar à Tela de Início</span>.</li>
              </ol>
            </div>
            <div className="bg-gray-50 rounded-2xl p-5">
              <p className="text-sm text-gray-700 mb-3 font-semibold">No Android / Desktop (Chrome/Edge):</p>
              <ul className="list-disc pl-4 text-sm text-gray-600 space-y-2">
                <li>Procure o ícone de instalar aplicativo na barra de endereços (lado direito).</li>
                <li>Ou abra o menu (<span className="font-bold">⋮</span>) e selecione <span className="font-bold">Instalar aplicativo...</span></li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
