import { Clock, Star, Thermometer, Wind } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SpotDefinition } from '../types';
import type { SpotEvaluation } from '../lib/scoring';
import { useApp } from '../context/AppContext';
import { SpotImage } from './SpotImage';
import { RatingBadge, ScoreRing } from './RatingBadge';
import { WindArrow } from './WindArrow';
import { cardinal, toKmh } from '../lib/wind';
import { fmt, hhmm, relativeDay } from '../lib/format';
import { Skeleton } from './States';

export function SpotCard({ spot, ev, isBest, todayIso }: { spot: SpotDefinition; ev?: SpotEvaluation; isBest?: boolean; todayIso?: string }) {
  const { favorites, toggleFavorite, setSpotId } = useApp();
  const navigate = useNavigate();
  const fav = favorites.includes(spot.id);
  const open = () => {
    setSpotId(spot.id);
    navigate(`/conditions/${spot.id}`);
  };
  return (
    <article
      onClick={open}
      onKeyDown={(e) => (e.key === 'Enter' ? open() : undefined)}
      tabIndex={0}
      role="link"
      aria-label={`Ouvrir le dashboard ${spot.name}`}
      className={`card group cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 ${
        isBest ? 'ring-2 ring-lime-400' : ''
      }`}
    >
      <div className="relative">
        <SpotImage spot={spot} className="h-36 sm:h-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/10 to-transparent" />
        {isBest && (
          <span className="chip absolute left-3 top-3 bg-lemon-400 text-ink-900 shadow-card">🌴 Meilleur spot du moment</span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(spot.id);
          }}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/85 backdrop-blur transition hover:scale-105"
          aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-pressed={fav}
        >
          <Star className={`h-4.5 w-4.5 ${fav ? 'fill-lemon-400 text-lemon-500' : 'text-ink-700'}`} style={{ width: 18, height: 18 }} />
        </button>
        <div className="absolute bottom-2.5 left-3 right-3 text-white">
          <h3 className="font-display text-xl font-extrabold leading-tight drop-shadow">{spot.name}</h3>
          <p className="text-xs font-medium text-white/85">{spot.location}</p>
        </div>
      </div>
      <div className="p-4">
        {!ev ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <ScoreRing score={ev.score} level={ev.level} size={54} />
              <div className="min-w-0 flex-1">
                <RatingBadge level={ev.level} />
                <p className="mt-1 line-clamp-2 text-xs text-ink-700">{ev.summary}</p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-mint-50 px-1 py-2">
                <dt className="label !text-[9px]">Vent</dt>
                <dd className="tabular text-lg font-extrabold leading-none">{fmt(ev.speed)}</dd>
                <dd className="text-[10px] text-ink-700/70">nds · {fmt(ev.speed != null ? toKmh(ev.speed) : null)} km/h</dd>
              </div>
              <div className="rounded-xl bg-mint-50 px-1 py-2">
                <dt className="label !text-[9px]">Rafales</dt>
                <dd className="tabular text-lg font-extrabold leading-none">{fmt(ev.gust)}</dd>
                <dd className="text-[10px] text-ink-700/70">nds</dd>
              </div>
              <div className="rounded-xl bg-mint-50 px-1 py-2">
                <dt className="label !text-[9px]">Dir.</dt>
                <dd className="flex items-center justify-center gap-1 text-base font-extrabold leading-none">
                  <WindArrow deg={ev.dir} size={15} className="text-mint-700" />
                  {cardinal(ev.dir)}
                </dd>
                <dd className="text-[10px] text-ink-700/70">{ev.dir != null ? `${Math.round(ev.dir)}°` : '—'}</dd>
              </div>
              <div className="rounded-xl bg-mint-50 px-1 py-2">
                <dt className="label !text-[9px]">Temp.</dt>
                <dd className="tabular text-lg font-extrabold leading-none">{fmt(ev.temperature)}°</dd>
                <dd className="text-[10px] text-ink-700/70">
                  <Thermometer className="inline h-3 w-3" />
                </dd>
              </div>
            </dl>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-800">
              {ev.bestWindow ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-mint-600" /> Créneau conseillé : {todayIso ? relativeDay(ev.bestWindow.start, todayIso) : ''}{' '}
                  {hhmm(ev.bestWindow.start)} – {hhmm(ev.bestWindow.end)}
                </>
              ) : (
                <>
                  <Wind className="h-3.5 w-3.5 text-ink-700/60" /> Pas de bon créneau dans les 48 h
                </>
              )}
            </p>
          </>
        )}
      </div>
    </article>
  );
}
