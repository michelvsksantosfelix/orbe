import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      // Salvar o evento para ser disparado pelo botão
      setDeferredPrompt(e);
      (window as any).deferredPWAInstallPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Checar se o PWA configurou globalmente
    const checkInterval = setInterval(() => {
      if ((window as any).deferredPWAInstallPrompt && !deferredPrompt) {
        setDeferredPrompt((window as any).deferredPWAInstallPrompt);
      }
    }, 1000);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPWAInstallPrompt;
    
    if (!promptEvent) {
      // Se não tem evento, provável que falte engajamento ou não está configurado 100%, 
      // ou já está instalado. Fallback natural:
      alert('Para instalar, o navegador precisa disponibilizar a opção. Se o botão não funcionar, você pode instalar através do menu (...) do Chrome/Edge clicando em "Instalar aplicativo".');
      return;
    }

    try {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
      (window as any).deferredPWAInstallPrompt = null;
    } catch (err) {
      console.error('Erro ao abrir prompt de instalação:', err);
    }
  };

  if (isStandalone) return null;

  return (
    <button
      onClick={handleInstallClick}
      className={`fixed bottom-6 right-6 z-[9999] flex items-center justify-center gap-2 text-white font-black uppercase tracking-wider text-xs py-4 px-6 rounded-[24px] shadow-2xl transition-all bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 border-2 border-white/20`}
    >
      <Download size={18} />
      <span>Instalar App</span>
    </button>
  );
}
