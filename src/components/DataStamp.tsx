import { Clock, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dateTime, timeAgo } from '../lib/format';

/** Affiche la source, l'heure des données et un bouton d'actualisation. */
export function DataStamp({
  fetchedAt,
  modelTime,
  source = 'Open-Meteo · meilleur modèle disponible',
  stale,
  loading,
  onRefresh,
}: {
  fetchedAt: number | null;
  modelTime?: string;
  source?: string;
  stale?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((x) => x + 1), 30000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-700/80">
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {fetchedAt ? (
          <>
            Récupéré {timeAgo(fetchedAt)} <span className="hidden sm:inline">({dateTime(fetchedAt)})</span>
          </>
        ) : (
          'Pas encore de données'
        )}
      </span>
      {modelTime && <span>Valeurs du modèle pour {modelTime.slice(11, 16).replace(':', ' h ')}</span>}
      <span>{source}</span>
      {stale && <span className="chip bg-orange-100 text-orange-800">Cache — actualisation échouée</span>}
      {onRefresh && (
        <button onClick={onRefresh} className="inline-flex items-center gap-1 font-semibold text-mint-700 hover:text-mint-900" disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      )}
    </div>
  );
}
