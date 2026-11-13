import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brush, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../context/AppContext';
import { useSpotRoute } from '../hooks/useSpotRoute';
import { SpotPicker } from '../components/SpotPicker';
import { DataStamp } from '../components/DataStamp';
import { ErrorBox, LoadingBlock } from '../components/States';
import { WindArrow } from '../components/WindArrow';
import { MODEL_BY_ID, WEATHER_MODELS } from '../config/models';
import { AGREEMENT_META, modelAgreement } from '../lib/scoring';
import { cardinal, circularMean } from '../lib/wind';
import { dateTime, dayLabel, fmt, hourLabel } from '../lib/format';

type Metric = 'windSpeed' | 'windGusts' | 'windDirection';
const METRIC_LABEL: Record<Metric, string> = { windSpeed: 'Vent moyen', windGusts: 'Rafales', windDirection: 'Direction' };
type Horizon = 'now' | '6h' | '24h';

export function Models() {
  const spot = useSpotRoute();
  const navigate = useNavigate();
  const { models, runs, weather, refresh } = useApp();
  const [metric, setMetric] = useState<Metric>('windSpeed');
  const [hidden, setHidden] = useState<string[]>([]);
  const [horizon, setHorizon] = useState<Horizon>('6h');

  const sm = models.data?.[spot.id];
  const nowIso = weather.data?.[spot.id]?.current.time ?? new Date().toISOString();
  const nowHour = nowIso.slice(0, 13) + ':00';

  const startIdx = useMemo(() => {
    if (!sm) return 0;
    const t = sm.models[0]?.time ?? [];
    const i = t.indexOf(nowHour);
    return i >= 0 ? i : Math.max(0, t.findIndex((x) => x >= nowHour));
  }, [sm, nowHour]);

  const chartData = useMemo(() => {
    if (!sm) return [];
    const time = sm.models[0]?.time ?? [];
    return time.slice(startIdx).map((t, k) => {
      const i = startIdx + k;
      const row: Record<string, number | string | null> = { time: t };
      for (const m of sm.models) row[m.modelId] = m[metric][i];
      return row;
    });
  }, [sm, metric, startIdx]);

  const hoursFor = (h: Horizon): string[] => {
    const time = sm?.models[0]?.time ?? [];
    const n = h === 'now' ? 1 : h === '6h' ? 6 : 24;
    return time.slice(startIdx, startIdx + n);
  };
  const hours = hoursFor(horizon);
  const agreement = modelAgreement(sm, hours);

  const summary = useMemo(() => {
    if (!sm) return [];
    return sm.models.map((m) => {
      const idx = hours.map((h) => m.time.indexOf(h)).filter((i) => i >= 0);
      const sp = idx.map((i) => m.windSpeed[i]).filter((v): v is number => v != null);
      const gu = idx.map((i) => m.windGusts[i]).filter((v): v is number => v != null);
      const di = idx.map((i) => m.windDirection[i]).filter((v): v is number => v != null);
      // horizon de couverture
      let lastIdx = -1;
      m.windSpeed.forEach((v, i) => {
        if (v != null) lastIdx = i;
      });
      return {
        id: m.modelId,
        speed: sp.length ? sp.reduce((a, b) => a + b, 0) / sp.length : null,
        gust: gu.length ? gu.reduce((a, b) => a + b, 0) / gu.length : null,
        dir: circularMean(di),
        coverage: lastIdx >= 0 ? m.time[lastIdx] : null,
      };
    });
  }, [sm, hours]);

  const header = <SpotPicker value={spot.id} onChange={(id) => navigate(`/modeles/${id}`)} />;

  if (!sm) {
    return (
      <div className="space-y-4">
        {header}
        {models.error ? <ErrorBox message={models.error} onRetry={refresh} /> : <LoadingBlock label="Chargement des modèles météo…" rows={2} />}
      </div>
    );
  }

  const runById = Object.fromEntries((runs.data ?? []).map((r) => [r.modelId, r]));

  return (
    <div className="space-y-5">
      {header}
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Modèles météo · {spot.shortName}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-700">
          Chaque courbe est la prévision brute d’un modèle numérique : ce sont des <strong>estimations</strong>, pas des mesures. Comparez-les pour juger de la
          fiabilité d’une prévision.
        </p>
        <div className="mt-2">
          <DataStamp fetchedAt={models.fetchedAt} stale={models.stale} loading={models.loading} onRefresh={refresh} source="Open-Meteo · prévisions par modèle" />
        </div>
      </section>

      {/* Indicateur d'accord */}
      <section className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-extrabold">Accord entre les modèles</h2>
          <div className="flex rounded-full border border-mint-200 bg-cream-50 p-1 text-xs font-bold">
            {(['now', '6h', '24h'] as Horizon[]).map((h) => (
              <button key={h} onClick={() => setHorizon(h)} className={`rounded-full px-3 py-1 ${horizon === h ? 'bg-night text-white' : ''}`}>
                {h === 'now' ? 'Maintenant' : h === '6h' ? '6 prochaines h' : '24 prochaines h'}
              </button>
            ))}
          </div>
        </div>
        {agreement ? (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="rounded-2xl px-4 py-2 font-display text-xl font-extrabold text-white" style={{ background: AGREEMENT_META[agreement.level].color }}>
              {AGREEMENT_META[agreement.level].label}
            </span>
            <div className="text-sm text-ink-800">
              <p>{AGREEMENT_META[agreement.level].desc}</p>
              <p className="text-xs text-ink-700">
                {agreement.modelCount} modèles · écart de vitesse {fmt(agreement.speedSpread, 1)} nds · écart de direction max {Math.round(agreement.dirSpread)}°
                {agreement.maxPair &&
                  ` · plus grand écart : ${MODEL_BY_ID[agreement.maxPair.a]?.label} vs ${MODEL_BY_ID[agreement.maxPair.b]?.label} (${fmt(agreement.maxPair.diff, 1)} nds)`}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-700">Pas assez de modèles disponibles sur cette période pour évaluer leur accord.</p>
        )}
      </section>

      {/* Tableau récapitulatif */}
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-mint-50 text-left">
              <tr className="text-xs uppercase tracking-wide text-ink-700">
                <th className="px-4 py-2.5">Modèle</th>
                <th className="px-3 py-2.5">Vent moyen</th>
                <th className="px-3 py-2.5">Rafales</th>
                <th className="px-3 py-2.5">Direction</th>
                <th className="px-3 py-2.5">Dernier run</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r) => {
                const m = MODEL_BY_ID[r.id];
                const run = runById[r.id];
                return (
                  <tr key={r.id} className="border-t border-mint-100">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2 font-bold">
                        <span className="h-3 w-3 rounded-full" style={{ background: m.color }} />
                        {m.label}
                      </span>
                      <span className="text-[11px] text-ink-700/70">
                        {m.provider} · {m.resolution}
                      </span>
                    </td>
                    <td className="tabular px-3 py-2.5 font-bold">{r.speed != null ? `${fmt(r.speed)} nds` : <span className="text-ink-700/60">non couvert</span>}</td>
                    <td className="tabular px-3 py-2.5">{r.gust != null ? `${fmt(r.gust)} nds` : '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1">
                        <WindArrow deg={r.dir} size={14} className="text-mint-700" /> {cardinal(r.dir)} {r.dir != null && `${Math.round(r.dir)}°`}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-700">
                      {run?.initTime ? (
                        <>
                          Run du {dateTime(run.initTime)}
                          {run.availableTime && <span className="block opacity-70">dispo. {dateTime(run.availableTime)}</span>}
                        </>
                      ) : (
                        <span className="opacity-60">{run?.error ? 'inconnu' : '…'}</span>
                      )}
                      {r.coverage && <span className="block opacity-70">prévision jusqu’au {dayLabel(r.coverage)} {hourLabel(r.coverage)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-mint-100 px-4 py-2 text-[11px] text-ink-700/70">
          Valeurs moyennées sur la période choisie ci-dessus ({horizon === 'now' ? 'heure actuelle' : horizon === '6h' ? '6 h' : '24 h'}). « Non couvert » : le modèle
          ne prévoit pas cette échéance ou ce lieu.
        </p>
      </section>

      {/* Graphique comparatif */}
      <section className="card card-pad">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-extrabold">Comparaison horaire · {METRIC_LABEL[metric]}</h2>
          <div className="flex rounded-full border border-mint-200 bg-cream-50 p-1 text-xs font-bold">
            {(Object.keys(METRIC_LABEL) as Metric[]).map((k) => (
              <button key={k} onClick={() => setMetric(k)} className={`rounded-full px-3 py-1 ${metric === k ? 'bg-mint-600 text-white' : ''}`}>
                {METRIC_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {WEATHER_MODELS.map((m) => {
            const off = hidden.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => setHidden((h) => (off ? h.filter((x) => x !== m.id) : [...h, m.id]))}
                className={`chip border ${off ? 'border-mint-200 bg-cream-50 text-ink-700/50 line-through' : 'border-transparent text-white'}`}
                style={off ? undefined : { background: m.color }}
                aria-pressed={!off}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <div className="h-80">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="time" tickFormatter={(t: string) => (t.endsWith('T00:00') ? dayLabel(t) : hourLabel(t))} minTickGap={24} />
              <YAxis
                domain={metric === 'windDirection' ? [0, 360] : ['auto', 'auto']}
                ticks={metric === 'windDirection' ? [0, 90, 180, 270, 360] : undefined}
                tickFormatter={metric === 'windDirection' ? (v: number) => ['N', 'E', 'S', 'O', 'N'][v / 90] ?? '' : undefined}
              />
              <Tooltip
                labelFormatter={(t: any) => `${dayLabel(String(t), true)} · ${hourLabel(String(t))}`}
                formatter={(v: any, name: any) => [metric === 'windDirection' ? `${cardinal(Number(v))} ${Math.round(Number(v))}°` : `${fmt(Number(v), 1)} nds`, MODEL_BY_ID[name]?.label ?? name]}
              />
              <Legend formatter={(v: string) => MODEL_BY_ID[v]?.label ?? v} wrapperStyle={{ fontSize: 12 }} />
              {WEATHER_MODELS.filter((m) => !hidden.includes(m.id)).map((m) => (
                <Line
                  key={m.id}
                  type={metric === 'windDirection' ? 'linear' : 'monotone'}
                  dataKey={m.id}
                  stroke={m.color}
                  strokeWidth={m.id.includes('arome') ? 2.5 : 1.8}
                  dot={metric === 'windDirection' ? { r: 1.5 } : false}
                  strokeOpacity={metric === 'windDirection' ? 0 : 1}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
              <Brush dataKey="time" height={22} stroke="#17A63A" travellerWidth={10} endIndex={Math.min(47, Math.max(0, chartData.length - 1))} tickFormatter={hourLabel} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WEATHER_MODELS.map((m) => (
          <div key={m.id} className="card p-3.5 text-sm">
            <p className="flex items-center gap-2 font-bold">
              <span className="h-3 w-3 rounded-full" style={{ background: m.color }} /> {m.label}
            </p>
            <p className="text-xs text-ink-700">
              {m.provider} · résolution {m.resolution} · échéance {m.horizon}
            </p>
            <p className="mt-1 text-xs text-ink-800">{m.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
