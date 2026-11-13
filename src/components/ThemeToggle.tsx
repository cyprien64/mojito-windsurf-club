import { Monitor, Moon, Sun } from 'lucide-react';
import { useApp, type Theme } from '../context/AppContext';

const NEXT: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
const LABEL: Record<Theme, string> = { auto: 'Thème automatique', light: 'Thème clair', dark: 'Thème sombre' };

export function ThemeToggle() {
  const { theme, setTheme } = useApp();
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  return (
    <button
      onClick={() => setTheme(NEXT[theme])}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-mint-200 bg-cream-50 text-ink-800 hover:bg-mint-50"
      aria-label={`${LABEL[theme]} (changer)`}
      title={LABEL[theme]}
    >
      <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
    </button>
  );
}
