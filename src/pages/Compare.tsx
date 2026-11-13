import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SPOTS, SPOT_BY_ID } from '../config/spots';
import { useApp } from '../context/AppContext';
import { RatingBadge } from '../components/RatingBadge';
import { WindArrow } from '../components/WindArrow';
import { DataStamp } from '../components/DataStamp';
import { ErrorBox, LoadingBlock } from '../components/States';
import { AGREEMENT_META } from '../lib/scoring';
import { cardinal } from '../lib/wind';
import { dayLabel, fmt, hhmm, hourLabel, relativeDay } from '../lib/format';

const PALETTE = ['#1E8F60', '#2F6FDE', '#E58A1F', '#8E44AD', '#E5484D', '#178F86'];

export function Compare() {
  const { weather, evaluations, favorites, refresh } = useApp();
  const [selected, setSelected] = useState<string[]>(() => (favorites.length >= 2 ? favorites : SPOTS.map((s) => s.id)));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const todayIso = weather.data ? Object.values(weather.data)[0]?.current.time ?? '' : '';

  const chart = useMemo(() => {
    if (!weather.data) return [];
    const first = weather.data[SPOTS[0].id];
    if (!first) return [];
    const rows = [];
    for (let i = first.nowIndex; i < Math.min(first.hourly.time.length, first.nowIndex + 48); i++) {
      const row: Record<string, string | number | null> = { time: first.hourly.time[i] };
      for (const s of SPOTS) row[s.id] = weather.data[s.id]?.hourly.windSpeed[i] ?? null;
      rows.push(row);
    }
    return rows;
  }, [weather.data]);

  const rows = SPOTS.filter((s) => selected.includes(s.id))
    .map((s) => ({ spot: s, ev: evaluations[s.id] }))
    .sort((a, b) => Number(!!a.ev?.blocked) - Number(!!b.ev?.blocked) || (b.ev?.score ?? 0) - (a.ev?.score ?? 0));

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Comparateur de spots</h1>
        <p className="text-sm text-ink-700">Choisissez les spots à comparer côte à côte.</p>
        <DataStamp fetchedAt={weather.fetchedAt} stale={weather.stale} loading={weather.loading} onRefresh={refresh} />
      </section>
      <div className="flex flex-wrap gap-2">
        {SPOTS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => toggle(s.id)}
            aria-pressed={selected.includes(s.id)}
            className={`chip border px-3 py-1.5 text-sm ${selected.includes(s.id) ? 'border-transparent text-white' : 'border-mint-200 bg-cream-50 text-ink-700'}`}
            style={selected.includes(s.id) ? { background: PALETTE[i % PALETTE.length] } : undefined}
          >
            {s.shortName}
          </button>
        ))}
      </div>

      {weather.error && !weather.data ? (
        <ErrorBox message={weather.error} onRetry={refresh} />
      ) : !weather.data ? (
        <LoadingBlock rows={2} />
      ) : (
        <>
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-mint-50 text-left text-xs uppercase tracking-wide text-ink-700">
                  <tr>
                    <th className="px-4 py-2.5">Spot</th>
                    <th className="px-3 py-2.5">Note</th>
                    <th className="px-3 py-2.5">Vent</th>
                    <th className="px-3 py-2.5">Rafales</th>
                    <th className="px-3 py-2.5">Direction</th>
                    <th className="px-3 py-2.5">Temp.</th>
                    <th className="px-3 py-2.5">Meilleur créneau</th>
                    <th className="px-3 py-2.5">Modèles</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ spot, ev }) => (
                    <tr key={spot.id} className="border-t border-mint-100">
                      <td className="px-4 py-2.5 font-bold">
                        <Link to={`/conditions/${spot.id}`} className="hover:underline">
                          {spot.shortName}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">{ev ? <RatingBadge level={ev.level} size="sm" label={`${ev.score}/100`} /> : '—'}</td>
                      <td className="tabular px-3 py-2.5 font-bold">{fmt(ev?.speed)} nds</td>
                      <td className="tabular px-3 py-2.5">{fmt(ev?.gust)} nds</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1">
                          <WindArrow deg={ev?.dir ?? null} size={14} className="text-mint-700" /> {cardinal(ev?.dir)}
                        </span>
                      </td>
                      <td className="tabular px-3 py-2.5">{fmt(ev?.temperature)}°</td>
                      <td className="px-3 py-2.5 text-xs font-semibold">
                        {ev?.bestWindow ? `${relativeDay(ev.bestWindow.start, todayIso)} ${hhmm(ev.bestWindow.start)}–${hhmm(ev.bestWindow.end)}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {ev?.agreement ? <span style={{ color: AGREEMENT_META[ev.agreement.level].color }}>{AGREEMENT_META[ev.agreement.level].label}</span> : 'n/d'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card card-pad">
            <h2 className="mb-2 font-display text-lg font-extrabold">Vent moyen sur 48 h (nœuds)</h2>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="time" tickFormatter={(t: string) => (t.endsWith('T00:00') ? dayLabel(t) : hourLabel(t))} minTickGap={20} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(t: any) => `${dayLabel(String(t), true)} · ${hourLabel(String(t))}`}
                    formatter={(v: any, n: any) => [`${fmt(Number(v))} nds`, SPOT_BY_ID[n]?.shortName ?? n]}
                  />
                  <Legend formatter={(v: string) => SPOT_BY_ID[v]?.shortName ?? v} wrapperStyle={{ fontSize: 12 }} />
                  {SPOTS.map((s, i) =>
                    selected.includes(s.id) ? (
                      <Line key={s.id} type="monotone" dataKey={s.id} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.2} dot={false} isAnimationActive={false} />
                    ) : null,
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
