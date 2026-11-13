import { ArrowRight, Clock, Compass, Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SPOTS, SPOT_BY_ID } from '../config/spots';
import { useApp } from '../context/AppContext';
import { SpotCard } from '../components/SpotCard';
import { DataStamp } from '../components/DataStamp';
import { ErrorBox, WarningBanner } from '../components/States';
import { Waves } from '../components/Decor';
import { ClubLogo } from '../components/Logo';
import { RatingBadge, ScoreRing } from '../components/RatingBadge';
import { WindArrow } from '../components/WindArrow';
import { SafetyNotice } from '../components/SafetyNotice';
import { cardinal } from '../lib/wind';
import { hhmm, relativeDay } from '../lib/format';

export function Home() {
  const { weather, evaluations, ranking, favorites, refresh } = useApp();
  const [onlyFav, setOnlyFav] = useState(false);
  const best = ranking.find((e) => !e.blocked && (e.level === 'excellent' || e.level === 'good' || e.level === 'average')) ?? null;
  const todayIso = weather.data ? Object.values(weather.data)[0]?.current.time ?? '' : '';

  const spots = [...SPOTS]
    .filter((s) => !onlyFav || favorites.includes(s.id))
    .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));

  return (
    <div className="space-y-6">
      {/* Hero : logo du club sur fond noir, comme l'original */}
      <section className="relative overflow-hidden rounded-3xl bg-[#050806] px-5 pb-16 pt-5 text-white shadow-lift sm:px-8 sm:pt-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_70%_40%,rgba(34,210,74,0.18),transparent_70%)]" />
        <h1 className="sr-only">Mojito Windsurf Club</h1>
        <div className="relative flex justify-center">
          <ClubLogo className="w-full max-w-[520px]" />
        </div>
        <Waves className="absolute inset-x-0 bottom-0 h-14 w-full text-cream-100" />
      </section>

      {/* Où naviguer aujourd'hui ? */}
      <section className="card relative -mt-14 overflow-hidden border-mint-300/70 p-0">
        <div className="bg-gradient-to-r from-mint-200/70 via-mint-100/50 to-transparent px-5 py-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold sm:text-2xl">🌴 OÙ NAVIGUER AUJOURD’HUI ?</h2>
        </div>
        <div className="p-5">
          {weather.error && !weather.data ? (
            <ErrorBox message={weather.error} onRetry={refresh} />
          ) : !ranking.length ? (
            <div className="space-y-2">
              <div className="skeleton h-16" />
              <p className="text-sm text-mint-700">Analyse des spots en cours…</p>
            </div>
          ) : best ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <ScoreRing score={best.score} level={best.level} size={84} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-2xl font-extrabold">{SPOT_BY_ID[best.spotId].name}</span>
                  <RatingBadge level={best.level} />
                </div>
                <p className="mt-1 text-sm text-ink-800">{best.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-bold">
                  <span className="inline-flex items-center gap-1">
                    <WindArrow deg={best.dir} size={16} className="text-mint-700" /> {Math.round(best.speed ?? 0)} nds {cardinal(best.dir)}
                  </span>
                  <span>Rafales {Math.round(best.gust ?? 0)} nds</span>
                  {best.bestWindow && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#050806] px-3 py-1 text-xs text-[#3FE06A]">
                      <Clock className="h-3.5 w-3.5" /> MEILLEUR CRÉNEAU : {relativeDay(best.bestWindow.start, todayIso)} {hhmm(best.bestWindow.start)} – {hhmm(best.bestWindow.end)}
                    </span>
                  )}
                </div>
              </div>
              <Link to="/ou-naviguer" className="btn-primary shrink-0">
                <Compass className="h-4 w-4" /> Voir le classement <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm text-ink-800">
                Aucun spot ne présente de conditions favorables en ce moment. Consultez le classement pour voir les meilleurs créneaux à venir.
              </p>
              <Link to="/ou-naviguer" className="btn-primary">
                Classement & créneaux <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
          {ranking.length > 0 && (
            <ol className="mt-4 flex flex-wrap gap-2">
              {ranking.map((e, i) => (
                <li key={e.spotId}>
                  <Link
                    to={`/conditions/${e.spotId}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-mint-200 bg-cream-50 px-2.5 py-1 text-xs font-bold hover:border-mint-400"
                  >
                    <span className="text-ink-700/60">{i + 1}.</span> {SPOT_BY_ID[e.spotId].shortName}
                    <RatingBadge level={e.level} size="sm" label={String(e.score)} />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {weather.error && weather.data && <WarningBanner>{weather.error}</WarningBanner>}

      {/* Spots */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="section-title">Nos spots</h2>
            <DataStamp fetchedAt={weather.fetchedAt} stale={weather.stale} loading={weather.loading} onRefresh={refresh} />
          </div>
          <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOnlyFav((v) => !v)}
            className={`chip border ${onlyFav ? 'border-lemon-500 bg-lemon-300 text-ink-900' : 'border-mint-200 bg-cream-50 text-ink-800'}`}
            aria-pressed={onlyFav}
            disabled={!favorites.length}
            title={favorites.length ? '' : 'Ajoutez des favoris avec l’étoile'}
          >
            <Star className="h-3.5 w-3.5" /> Favoris uniquement
          </button>
          <Link to="/trajets" className="chip border border-mint-200 bg-cream-50 text-ink-800">
            🚗 Temps de trajet
          </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map((s) => (
            <SpotCard key={s.id} spot={s} ev={evaluations[s.id]} isBest={best?.spotId === s.id} todayIso={todayIso} />
          ))}
        </div>
      </section>

      <SafetyNotice />
    </div>
  );
}
