import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useSpotRoute } from '../hooks/useSpotRoute';
import { SpotPicker } from '../components/SpotPicker';
import { WindArrow } from '../components/WindArrow';
import { ErrorBox } from '../components/States';
import { fetchEnsemble, type EnsembleRaw } from '../services/weather';
import { summarizeTrend, type Confidence } from '../lib/trend';
import { cardinal } from '../lib/wind';
import { isoDay } from '../hooks/useTrips';

const CONF: Record<Confidence, { label: string; cls: string }> = {
  forte: { label: 'confiance forte', cls: 'bg-mint-100 text-mint-800' },
  moyenne: { label: 'confiance moyenne', cls: 'bg-lemon-300/60 text-ink-900' },
  faible: { label: 'confiance faible', cls: 'bg-orange-100 text-orange-800' },
};

const pctColor = (p: number) => (p >= 0.6 ? '#16A038' : p >= 0.35 ? '#E5B21F' : p >= 0.15 ? '#F2994A' : '#B9C2BC');

export function Trend() {
  const spot = useSpotRoute();
  const navigate = useNavigate();
  const { settings } = useApp();
  const cfg = settings.spots[spot.id] ?? spot.defaults;
  const [raw, setRaw] = useState<EnsembleRaw | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setRaw(null);
    setError(null);
    fetchEnsemble(spot)
      .then((r) => alive && setRaw(r.data))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [spot, nonce]);

  const days = useMemo(() => (raw ? summarizeTrend(raw, cfg, isoDay(0)) : []), [raw, cfg]);
  const maxKn = Math.max(35, cfg.speed.maxRideable, ...days.map((d) => d.p90 + 2));
  const x = (kn: number) => `${Math.min(100, (kn / maxKn) * 100)}%`;
  const best = [...days].filter((d) => d.lead >= 0).sort((a, b) => b.pGood - a.pGood || b.pRideable - a.pRideable)[0];

  return (
    <div className="space-y-5">
      <SpotPicker value={spot.id} onChange={(id) => navigate(`/tendance/${id}`)} />
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Tendance 15 jours · {spot.shortName}</h1>
        <p className="max-w-2xl text-sm text-ink-700">
          Prévision d’ensemble ECMWF : 51 scénarios calculés en parallèle. Plus ils sont d’accord, plus la confiance est forte. Pour chaque jour : le vent de la
          meilleure fenêtre de 3 h (10 h – 18 h), la fourchette probable (9 scénarios sur 10 entre les deux bornes) et la probabilité de pouvoir naviguer selon
          les réglages du spot. Pour les 7 prochains jours, les{' '}
          <Link to={`/previsions/${spot.id}`} className="font-bold text-mint-700 underline">
            prévisions détaillées
          </Link>{' '}
          restent plus précises.
        </p>
      </section>

      {error ? (
        <ErrorBox message={error} onRetry={() => setNonce((n) => n + 1)} />
      ) : !raw ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-12" />
          ))}
        </div>
      ) : (
        <>
          {best && best.pRideable >= 0.3 && (
            <section className="card card-pad flex flex-wrap items-center gap-3 border-mint-300">
              <span className="text-3xl">🎯</span>
              <p className="flex-1 text-sm">
                Jour le plus prometteur :{' '}
                <strong className="capitalize">{new Date(`${best.day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong> —{' '}
                {Math.round(best.median)} nds {cardinal(best.dir)}, {Math.round(best.pRideable * 100)} % de chances de naviguer ({CONF[best.confidence].label}).
              </p>
            </section>
          )}
          <section className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-mint-100 px-4 py-2 text-[11px] text-ink-700">
              <span className="inline-block h-2.5 w-6 rounded bg-mint-200/70" /> plage idéale du spot ({cfg.speed.idealMin}–{cfg.speed.idealMax} nds)
              <span className="inline-block h-2.5 w-6 rounded bg-ink-900/25" /> fourchette probable
              <span className="inline-block h-3 w-1 rounded bg-ink-900" /> médiane
            </div>
            <ul className="divide-y divide-mint-100">
              {days.map((d) => (
                <li key={d.day} className="grid grid-cols-[76px_1fr_auto] items-center gap-3 px-4 py-2.5 sm:grid-cols-[110px_1fr_220px]">
                  <div>
                    <p className="text-sm font-bold capitalize">{new Date(`${d.day}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</p>
                    <p className="text-[11px] text-ink-700">{d.lead === 0 ? 'aujourd’hui' : `J+${d.lead}`}</p>
                  </div>
                  <div>
                    <div className="relative h-6 rounded-full bg-cream-200/70">
                      <div className="absolute inset-y-0 rounded-full bg-mint-200/70" style={{ left: x(cfg.speed.idealMin), width: `calc(${x(cfg.speed.idealMax)} - ${x(cfg.speed.idealMin)})` }} />
                      <div className="absolute inset-y-1.5 rounded-full bg-ink-900/25" style={{ left: x(d.p10), width: `calc(${x(d.p90)} - ${x(d.p10)})` }} />
                      <div className="absolute inset-y-0.5 w-1 -translate-x-1/2 rounded bg-ink-900" style={{ left: x(d.median) }} />
                    </div>
                    <p className="tabular mt-0.5 text-xs text-ink-700">
                      <strong className="text-ink-900">{Math.round(d.median)} nds</strong> ({Math.round(d.p10)}–{Math.round(d.p90)})
                      {d.gustMedian != null && ` · raf. ${Math.round(d.gustMedian)}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold">
                      <WindArrow deg={d.dir} size={14} className="text-mint-700" /> {cardinal(d.dir)}
                    </span>
                    <span className="chip text-white" style={{ background: pctColor(d.pRideable) }} title="Probabilité de pouvoir naviguer">
                      {Math.round(d.pRideable * 100)} %
                    </span>
                    <span className={`chip hidden sm:inline-flex ${CONF[d.confidence].cls}`}>{CONF[d.confidence].label}</span>
                    <span className={`h-2.5 w-2.5 rounded-full sm:hidden ${d.confidence === 'forte' ? 'bg-mint-500' : d.confidence === 'moyenne' ? 'bg-lemon-500' : 'bg-orange-400'}`} title={CONF[d.confidence].label} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="border-t border-mint-100 px-4 py-2 text-[11px] text-ink-700/70">
              Pourcentage = part des 51 scénarios où le vent est navigable sur le spot (vitesse entre {cfg.speed.minRideable} et {cfg.speed.maxRideable} nds,
              orientation idéale ou acceptable). Point de couleur (mobile) : confiance forte / moyenne / faible. Source : Open-Meteo, ensemble ECMWF IFS 0,25°.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
