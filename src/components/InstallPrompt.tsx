import React, { useState, useEffect } from 'react';
import { Download, Info, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const checkPrompt = () => {
      if ((window as any).deferredPWAInstallPrompt) {
        setDeferredPrompt((window as any).deferredPWAInstallPrompt);
      }
    };

    checkPrompt();
    const interval = setInterval(checkPrompt, 1000);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (window.self !== window.top) {
      alert("Para instalar, você precisa abrir o aplicativo em uma nova guia primeiro (clique no ícone de 'Nova Guia' na parte superior direita da barra de ferramentas do preview).");
      return;
    }

    const promptEvent = deferredPrompt || (window as any).deferredPWAInstallPrompt;

    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
      (window as any).deferredPWAInstallPrompt = null;
    } else {
      alert("Seu navegador ainda não disponibilizou a instalação automática. Aguarde alguns segundos ou faça a instalação pelo menu do navegador (Geralmente em 'Instalar aplicativo...' ou 'Adicionar à Tela Inicial').");
    }
  };

  if (isStandalone) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs py-4 px-6 rounded-[24px] shadow-2xl transition-all hover:scale-105 active:scale-95"
    >
      <Download size={18} />
      <span>Instalar App</span>
    </button>
  );
}
