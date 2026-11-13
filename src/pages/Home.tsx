import type { CSSProperties } from 'react';
import { ArrowRight, Clock, Compass, Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SPOTS, SPOT_BY_ID } from '../config/spots';
import { useApp } from '../context/AppContext';
import { SpotCard } from '../components/SpotCard';
import { DataStamp } from '../components/DataStamp';
import { ErrorBox, WarningBanner } from '../components/States';
import { LimeSlice, MintLeaf, Waves } from '../components/Decor';
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
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-mint-500 via-mint-600 to-lagoon-600 px-5 pb-16 pt-7 text-white shadow-lift sm:px-8 sm:pt-10">
        <MintLeaf className="absolute -right-6 -top-6 h-20 w-20 animate-floaty opacity-40 sm:-right-4 sm:-top-3 sm:h-28 sm:w-28 sm:opacity-90" style={{ '--r': '25deg' } as unknown as CSSProperties} />
        <LimeSlice className="absolute right-20 top-16 hidden h-14 w-14 animate-floaty opacity-95 [animation-delay:-2s] sm:block" />
        <MintLeaf className="absolute -left-5 bottom-10 h-16 w-16 rotate-180 opacity-40" />
        <p className="relative pr-10 text-xs font-bold uppercase tracking-[.2em] text-lime-300 sm:pr-0">Windsurf & wing · Landes · Béarn · Pays basque · Leucate</p>
        <h1 className="mt-2 max-w-xl font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
          MOJITO <span className="italic text-lemon-300">WINDSURF</span> CLUB
        </h1>
        <p className="mt-3 font-display text-lg italic text-mint-50 sm:text-xl">Find your wind. Find your spot.</p>
        <Waves className="absolute inset-x-0 bottom-0 h-14 w-full text-cream-100" />
      </section>

      {/* Où naviguer aujourd'hui ? */}
      <section className="card relative -mt-14 overflow-hidden border-lime-300/60 p-0">
        <div className="bg-gradient-to-r from-lemon-300/60 via-lime-300/40 to-transparent px-5 py-3">
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-night px-3 py-1 text-xs text-lemon-300">
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
          <button
            onClick={() => setOnlyFav((v) => !v)}
            className={`chip border ${onlyFav ? 'border-lemon-500 bg-lemon-300 text-ink-900' : 'border-mint-200 bg-cream-50 text-ink-800'}`}
            aria-pressed={onlyFav}
            disabled={!favorites.length}
            title={favorites.length ? '' : 'Ajoutez des favoris avec l’étoile'}
          >
            <Star className="h-3.5 w-3.5" /> Favoris uniquement
          </button>
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
