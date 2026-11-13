import { Star } from 'lucide-react';
import { SPOTS } from '../config/spots';
import { useApp } from '../context/AppContext';
import { LEVEL_META } from '../lib/scoring';

/** Sélecteur horizontal de spot (défilable sur mobile). */
export function SpotPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { evaluations, favorites } = useApp();
  const ordered = [...SPOTS].sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Choisir un spot">
      <div className="flex w-max gap-2">
        {ordered.map((s) => {
          const ev = evaluations[s.id];
          const active = s.id === value;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(s.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-bold transition ${
                active ? 'border-night bg-night text-white shadow-card' : 'border-mint-200 bg-cream-50 text-ink-800 hover:border-mint-400'
              }`}
            >
              {ev && <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_META[ev.level].color }} />}
              {s.shortName}
              {favorites.includes(s.id) && <Star className="h-3.5 w-3.5 fill-lemon-400 text-lemon-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
