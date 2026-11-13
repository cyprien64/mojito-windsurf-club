import { AlertTriangle, CloudOff, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

export function Skeleton({ className = 'h-24' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function LoadingBlock({ label = 'Chargement des données météo…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <p className="text-sm font-semibold text-mint-700">{label}</p>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

export function ErrorBox({ title = 'Données indisponibles', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="card card-pad flex items-start gap-3 border-rate-bad/30 bg-red-50/70" role="alert">
      <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-rate-bad" />
      <div className="flex-1">
        <p className="font-bold text-ink-900">{title}</p>
        <p className="text-sm text-ink-700">{message}</p>
        {onRetry && (
          <button className="btn-ghost mt-3 !py-1.5" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" /> Réessayer
          </button>
        )}
      </div>
    </div>
  );
}

export function WarningBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-rate-mid/40 bg-orange-50 px-3.5 py-2.5 text-sm text-ink-900" role="status">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rate-mid" />
      <div>{children}</div>
    </div>
  );
}
