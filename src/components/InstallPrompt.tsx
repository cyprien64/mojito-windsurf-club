import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'mwc-install-dismissed';

/** Bannière « Installer l'appli » (Android/Chrome) ou mode d'emploi (iPhone). */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone) return;
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    if (isIos) setShowIos(true);
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed || (!evt && !showIos)) return null;
  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="card mb-4 flex items-center gap-3 border-lime-300 bg-lemon-300/30 p-3">
      <Download className="h-6 w-6 shrink-0 text-mint-700" />
      <div className="flex-1 text-sm">
        <p className="font-bold">Installez l’appli sur votre téléphone</p>
        {evt ? (
          <p className="text-ink-700">Accès en un geste depuis l’écran d’accueil, même au bord de l’eau.</p>
        ) : (
          <p className="text-ink-700">
            Sur iPhone : touchez <strong>Partager</strong> <span aria-hidden="true">⎋</span> puis <strong>« Sur l’écran d’accueil »</strong>.
          </p>
        )}
      </div>
      {evt && (
        <button
          className="btn-primary !py-2"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            setEvt(null);
          }}
        >
          Installer
        </button>
      )}
      <button onClick={close} className="grid h-8 w-8 place-items-center rounded-full hover:bg-mint-100" aria-label="Masquer">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
