import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type InstallPromptEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };

/**
 * Hook لإدارة تثبيت التطبيق كـ PWA
 */
export function usePwaInstall() {
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time platform detection on mount
      setIsAppInstalled(true);
    }
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as InstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((r: { outcome: string }) => {
        if (r.outcome === 'accepted') setIsAppInstalled(true);
        setInstallPrompt(null);
      });
    } else {
      navigate('/install');
    }
  };

  return { isAppInstalled, handleInstallClick };
}
