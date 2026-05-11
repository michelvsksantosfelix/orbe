import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

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
    if (!deferredPrompt) {
      alert("A instalação automática ainda não está pronta ou seu navegador não a suporta. Aguarde alguns segundos ou faça a instalação pelo menu do navegador (Geralmente em 'Instalar aplicativo...' ou 'Adicionar à Tela de Início').");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone) return null;

  return (
    <button
      onClick={handleInstallClick}
      className={`fixed bottom-6 right-6 z-50 flex items-center justify-center gap-2 text-white font-black uppercase tracking-wider text-xs py-4 px-6 rounded-[24px] shadow-2xl transition-all ${deferredPrompt ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95' : 'bg-gray-400 cursor-not-allowed'}`}
      title={deferredPrompt ? "Instalar aplicativo" : "Aguardando disponibilidade do navegador..."}
    >
      <Download size={18} />
      <span>{deferredPrompt ? 'Instalar App' : 'Carregando...'}</span>
    </button>
  );
}
