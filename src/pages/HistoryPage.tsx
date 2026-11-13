import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../context/AppContext';
import { useSpotRoute } from '../hooks/useSpotRoute';
import { SpotPicker } from '../components/SpotPicker';
import { DataStamp } from '../components/DataStamp';
import { ErrorBox, LoadingBlock } from '../components/States';
import { WindArrow } from '../components/WindArrow';
import { cardinal, circularMean } from '../lib/wind';
import { dayLabel, fmt, hourLabel } from '../lib/format';

export function HistoryPage() {
  const spot = useSpotRoute();
  const navigate = useNavigate();
  const { weather, evaluations, settings, refresh } = useApp();
  const w = weather.data?.[spot.id];
  const ev = evaluations[spot.id];

  const data = useMemo(() => {
    if (!w) return [];
    return w.hourly.time.slice(0, w.nowIndex + 1).map((t, i) => ({
      time: t,
      speed: w.hourly.windSpeed[i],
      gust: w.hourly.windGusts[i],
      temp: w.hourly.temperature[i],
    }));
  }, [w]);

  const days = useMemo(() => {
    if (!w || !ev) return [];
    const map = new Map<string, number[]>();
    for (let i = 0; i <= w.nowIndex; i++) {
      const d = w.hourly.time[i].slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(i);
    }
    return [...map.entries()]
      .reverse()
      .map(([d, idx]) => {
        const sp = idx.map((i) => w.hourly.windSpeed[i]).filter((v): v is number => v != null);
        const gu = idx.map((i) => w.hourly.windGusts[i]).filter((v): v is number => v != null);
        const di = idx.map((i) => w.hourly.windDirection[i]).filter((v): v is number => v != null);
        const good = idx.filter((i) => ev.hours[i] && ev.hours[i].score >= settings.windowThreshold && ev.hours[i].daylight && !ev.hours[i].blocked).length;
        return {
          day: d,
          mean: sp.length ? sp.reduce((a, b) => a + b, 0) / sp.length : null,
          max: sp.length ? Math.max(...sp) : null,
          gust: gu.length ? Math.max(...gu) : null,
          dir: circularMean(di),
          good,
        };
      });
  }, [w, ev, settings.windowThreshold]);

  const header = <SpotPicker value={spot.id} onChange={(id) => navigate(`/historique/${id}`)} />;
  if (!w || !ev) {
    return (
      <div className="space-y-4">
        {header}
        {weather.error ? <ErrorBox message={weather.error} onRetry={refresh} /> : <LoadingBlock rows={2} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {header}
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Historique · {spot.shortName}</h1>
        <p className="max-w-2xl text-sm text-ink-700">
          Évolution des 7 derniers jours. Il s’agit de <strong>valeurs modélisées</strong> (analyses et premières échéances des modèles, via Open-Meteo), pas de
          mesures d’une station sur le spot.
        </p>
        <DataStamp fetchedAt={weather.fetchedAt} stale={weather.stale} loading={weather.loading} onRefresh={refresh} />
      </section>
      <section className="card card-pad">
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="time" tickFormatter={(t: string) => (t.endsWith('T00:00') ? dayLabel(t) : hourLabel(t))} minTickGap={28} />
              <YAxis yAxisId="w" allowDecimals={false} />
              <YAxis yAxisId="t" orientation="right" unit="°" width={36} />
              <Tooltip labelFormatter={(t: any) => `${dayLabel(String(t), true)} · ${hourLabel(String(t))}`} formatter={(v: any) => fmt(Number(v), 1)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area yAxisId="w" type="monotone" dataKey="speed" name="Vent moyen (nds)" stroke="#1E8F60" fill="#2BB077" fillOpacity={0.25} strokeWidth={2} />
              <Line yAxisId="w" type="monotone" dataKey="gust" name="Rafales (nds)" stroke="#E58A1F" dot={false} strokeDasharray="5 3" />
              <Line yAxisId="t" type="monotone" dataKey="temp" name="Température (°C)" stroke="#EFD12B" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mint-50 text-left text-xs uppercase tracking-wide text-ink-700">
            <tr>
              <th className="px-4 py-2.5">Jour</th>
              <th className="px-3 py-2.5">Moyen</th>
              <th className="px-3 py-2.5">Max</th>
              <th className="px-3 py-2.5">Rafales</th>
              <th className="px-3 py-2.5">Dir.</th>
              <th className="px-3 py-2.5">Heures navigables</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day} className="border-t border-mint-100">
                <td className="px-4 py-2 font-bold capitalize">{dayLabel(d.day, true)}</td>
                <td className="tabular px-3 py-2">{fmt(d.mean)} nds</td>
                <td className="tabular px-3 py-2">{fmt(d.max)} nds</td>
                <td className="tabular px-3 py-2">{fmt(d.gust)} nds</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <WindArrow deg={d.dir} size={13} className="text-mint-700" /> {cardinal(d.dir)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`chip ${d.good ? 'bg-mint-100 text-mint-800' : 'bg-cream-200 text-ink-700'}`}>{d.good} h</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-mint-100 px-4 py-2 text-[11px] text-ink-700/70">
          « Heures navigables » : heures de jour avec un score ≥ {settings.windowThreshold}/100 selon la configuration actuelle du spot.
        </p>
      </section>
    </div>
  );
}
