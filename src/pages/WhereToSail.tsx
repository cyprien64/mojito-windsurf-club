import { AlertTriangle, CheckCircle2, Clock, Info, MinusCircle, TrendingDown, TrendingUp, Minus, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { SPOT_BY_ID } from '../config/spots';
import { WEIGHT_LABELS } from '../config/scoring';
import { useApp } from '../context/AppContext';
import { AGREEMENT_META, LEVEL_META, SECTOR_RATING_META, type SpotEvaluation, type Tone } from '../lib/scoring';
import { RatingBadge, ScoreRing } from '../components/RatingBadge';
import { WindArrow } from '../components/WindArrow';
import { SafetyNotice } from '../components/SafetyNotice';
import { DataStamp } from '../components/DataStamp';
import { ErrorBox, LoadingBlock } from '../components/States';
import { cardinal, toKmh } from '../lib/wind';
import { fmt, hhmm, relativeDay } from '../lib/format';
import type { ScoringWeights } from '../types';
import { useGear } from '../hooks/useGear';
import { DisciplineChip } from '../components/Gear';
import { ShareButton } from '../components/Share';

const TONE_ICON: Record<Tone, JSX.Element> = {
  good: <CheckCircle2 className="h-4 w-4 shrink-0 text-rate-good" />,
  bad: <XCircle className="h-4 w-4 shrink-0 text-rate-bad" />,
  warn: <AlertTriangle className="h-4 w-4 shrink-0 text-rate-mid" />,
  info: <Info className="h-4 w-4 shrink-0 text-lagoon-500" />,
};

function Bar({ value }: { value: number | null }) {
  const v = value == null ? null : Math.round(value * 100);
  const color = v == null ? '#C9D9D2' : v >= 75 ? '#0F7A43' : v >= 55 ? '#3DBE6A' : v >= 35 ? '#F2994A' : '#E5484D';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-mint-100">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v ?? 50}%`, background: color, opacity: v == null ? 0.5 : 1 }} />
    </div>
  );
}

function Dimension({ title, value, children }: { title: string; value: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl bg-mint-50/70 p-3">
      <p className="label">{title}</p>
      <p className="text-sm font-extrabold text-ink-900">{value}</p>
      {children && <div className="mt-0.5 text-xs text-ink-700">{children}</div>}
    </div>
  );
}

function RankCard({ ev, rank, todayIso }: { ev: SpotEvaluation; rank: number; todayIso: string }) {
  const { settings } = useApp();
  const spot = SPOT_BY_ID[ev.spotId];
  const w = ev.bestWindow;
  const sport = [ev.components.speed, ev.components.gusts, ev.components.regularity].filter((x): x is number => x != null);
  const sportScore = sport.length ? Math.round((sport.reduce((a, b) => a + b, 0) / sport.length) * 100) : null;
  const gear = useGear(ev.spotId);
  const gearAdvice = gear.best ?? gear.now;
  const TrendIcon = ev.trend === 'hausse' ? TrendingUp : ev.trend === 'baisse' ? TrendingDown : Minus;

  return (
    <article className="card overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex w-14 shrink-0 flex-col items-center justify-center text-white sm:w-16" style={{ background: LEVEL_META[ev.level].color }}>
          <span className="text-[10px] font-bold uppercase opacity-80">rang</span>
          <span className="font-display text-3xl font-extrabold leading-none">{rank}</span>
        </div>
        <div className="flex-1 p-4">
          <div className="flex flex-wrap items-start gap-3">
            <ScoreRing score={ev.score} level={ev.level} size={58} />
            <div className="min-w-0 flex-1">
              <Link to={`/conditions/${ev.spotId}`} className="font-display text-xl font-extrabold uppercase leading-tight hover:underline">
                {spot.name}
              </Link>
              <div className="mt-1">
                <RatingBadge level={ev.level} />
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="tabular text-2xl font-extrabold leading-none">{fmt(ev.speed)}</p>
                <p className="text-[10px] font-bold text-ink-700/70">nds moy.</p>
              </div>
              <div className="text-center">
                <p className="tabular text-2xl font-extrabold leading-none">{fmt(ev.gust)}</p>
                <p className="text-[10px] font-bold text-ink-700/70">rafales</p>
              </div>
              <div className="text-center">
                <WindArrow deg={ev.dir} size={26} className="mx-auto text-mint-700" />
                <p className="text-[10px] font-bold text-ink-700/70">{cardinal(ev.dir)}</p>
              </div>
              <div className="text-center">
                <p className="tabular text-2xl font-extrabold leading-none">{fmt(ev.temperature)}°</p>
                <p className="text-[10px] font-bold text-ink-700/70">temp.</p>
              </div>
            </div>
          </div>

          <p className="mt-3 rounded-xl bg-cream-200/60 px-3 py-2 text-sm font-semibold text-ink-900">{ev.summary}</p>

          {ev.warnings.length > 0 && (
            <ul className="mt-2 space-y-1">
              {ev.warnings.map((x) => (
                <li key={x} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {x}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {gearAdvice && (
              <Link to={`/materiel/${ev.spotId}`}>
                <DisciplineChip advice={gearAdvice} />
              </Link>
            )}
            <ShareButton ev={ev} compact />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {w ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-night px-3 py-1.5 text-xs font-extrabold text-lemon-300">
                <Clock className="h-3.5 w-3.5" /> MEILLEUR CRÉNEAU : {relativeDay(w.start, todayIso)} {hhmm(w.start)} – {hhmm(w.end)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-3 py-1.5 text-xs font-bold text-ink-800">
                <MinusCircle className="h-3.5 w-3.5" /> Aucun créneau ≥ {settings.windowThreshold}/100 dans les 48 h
                {ev.bestHour && ` (meilleure heure : ${relativeDay(ev.bestHour.time, todayIso)} ${hhmm(ev.bestHour.time)}, ${Math.round(ev.bestHour.score)}/100)`}
              </span>
            )}
            {w && (
              <span className="text-xs text-ink-700">
                Début des bonnes conditions {hhmm(w.start)} · dégradation vers {hhmm(w.end)} · durée {w.hours} h · {Math.round(w.avgSpeed)} nds moy.
                {w.maxGust != null && `, rafales max ${Math.round(w.maxGust)} nds`}
              </span>
            )}
          </div>

          <details className="group mt-3">
            <summary className="cursor-pointer list-none text-sm font-bold text-mint-700 hover:text-mint-900">
              <span className="group-open:hidden">▸ Pourquoi ce classement ?</span>
              <span className="hidden group-open:inline">▾ Masquer le détail</span>
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Dimension title="Qualité sportive" value={sportScore != null ? `${sportScore}/100` : '—'}>
                {ev.speedClass} · {ev.strength} · {fmt(ev.speed != null ? toKmh(ev.speed) : null)} km/h
              </Dimension>
              <Dimension title="Orientation" value={ev.sectorRating ? SECTOR_RATING_META[ev.sectorRating].label : '—'}>
                {cardinal(ev.dir)} {ev.dir != null && `(${Math.round(ev.dir)}°)`}
              </Dimension>
              <Dimension title="Risques identifiés" value={ev.warnings.length ? `${ev.warnings.length} alerte(s)` : 'Aucun seuil dépassé'}>
                {spot.defaults && (settingsNote(ev.spotId) || 'Voir infos du spot')}
              </Dimension>
              <Dimension title="Incertitude" value={ev.agreement ? AGREEMENT_META[ev.agreement.level].label : 'Inconnue'}>
                {ev.agreement ? `${ev.agreement.modelCount} modèles comparés` : 'Modèles indisponibles'}
              </Dimension>
            </div>
            <ul className="mt-3 space-y-1.5">
              {ev.reasons.map((r) => (
                <li key={r.text} className="flex items-start gap-2 text-sm text-ink-800">
                  {TONE_ICON[r.tone]} {r.text}
                </li>
              ))}
            </ul>
            <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {(Object.keys(WEIGHT_LABELS) as (keyof ScoringWeights)[]).map((k) => (
                <div key={k}>
                  <div className="mb-0.5 flex justify-between text-xs font-semibold text-ink-700">
                    <span>
                      {WEIGHT_LABELS[k]} <span className="opacity-60">({settings.weights[k]} %)</span>
                    </span>
                    <span className="tabular">{ev.components[k] == null ? 'n/d' : Math.round((ev.components[k] ?? 0) * 100)}</span>
                  </div>
                  <Bar value={ev.components[k]} />
                </div>
              ))}
            </div>
            {ev.rawScore !== ev.score && (
              <p className="mt-2 text-xs text-ink-700">
                Note brute {ev.rawScore}/100 ramenée à {ev.score}/100 par les règles de sécurité.
              </p>
            )}
            <p className="mt-2 flex items-center gap-1 text-xs text-ink-700">
              <TrendIcon className="h-3.5 w-3.5" /> Tendance sur 3 h : {ev.trend ?? '—'}
            </p>
          </details>
        </div>
      </div>
    </article>
  );

  function settingsNote(id: string): string {
    return settings.spots[id]?.notes ?? '';
  }
}

export function WhereToSail() {
  const { ranking, weather, models, refresh } = useApp();
  const todayIso = weather.data ? Object.values(weather.data)[0]?.current.time ?? '' : '';
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">🌴 Où naviguer aujourd’hui ?</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-700">
          Classement automatique des spots du club à partir des prévisions réelles : orientation selon la configuration de chaque spot, vitesse, régularité,
          rafales, évolution sur 3 h et accord entre modèles. Une orientation dangereuse bloque toujours la recommandation.
        </p>
        <div className="mt-2">
          <DataStamp fetchedAt={weather.fetchedAt} stale={weather.stale} loading={weather.loading} onRefresh={refresh} />
          {models.error && <p className="mt-1 text-xs text-rate-mid">Modèles : {models.error}</p>}
        </div>
      </header>
      <SafetyNotice />
      {weather.error && !weather.data ? (
        <ErrorBox message={weather.error} onRetry={refresh} />
      ) : !ranking.length ? (
        <LoadingBlock label="Analyse des spots en cours…" rows={5} />
      ) : (
        <div className="space-y-4">
          {ranking.map((ev, i) => (
            <RankCard key={ev.spotId} ev={ev} rank={i + 1} todayIso={todayIso} />
          ))}
        </div>
      )}
    </div>
  );
}
