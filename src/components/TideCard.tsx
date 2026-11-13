import { useEffect, useState } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Anchor } from 'lucide-react';
import type { SpotDefinition, TideSeries } from '../types';
import { fetchTides } from '../services/weather';
import { dayLabel, fmt, hhmm, hourLabel, relativeDay } from '../lib/format';

/** Marées (hauteur d'eau modélisée, Open-Meteo Marine). */
export function TideCard({ spot, nowIso, windowStart, windowEnd }: { spot: SpotDefinition; nowIso: string; windowStart?: string; windowEnd?: string }) {
  const point = spot.marine ?? { lat: spot.lat, lon: spot.lon };
  const [data, setData] = useState<TideSeries | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetchTides(point)
      .then((r) => alive && setData(r.data))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot.id]);

  const nowHour = nowIso.slice(0, 13) + ':00';
  const upcoming = data?.events.filter((e) => e.time >= nowHour).slice(0, 6) ?? [];
  const chart = data ? data.time.map((t, i) => ({ t, h: data.height[i] })).filter((x) => x.t >= nowHour.slice(0, 10)) .slice(0, 48) : [];
  const nowIdx = data ? data.time.indexOf(nowHour) : -1;
  const rising = data && nowIdx > 0 && data.height[nowIdx] != null && data.height[nowIdx - 1] != null ? (data.height[nowIdx] as number) > (data.height[nowIdx - 1] as number) : null;
  const tideAt = (iso?: string) => {
    if (!data || !iso) return null;
    const i = data.time.indexOf(iso.slice(0, 13) + ':00');
    return i >= 0 ? data.height[i] : null;
  };

  return (
    <section className="card card-pad">
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-extrabold">
        <Anchor className="h-5 w-5 text-lagoon-500" /> Marées
      </h2>
      <p className="mb-3 text-xs text-ink-700">
        Hauteur d’eau modélisée (Open-Meteo Marine). Heures à ± 30 min environ ; le coefficient n’est pas fourni par cette source : consultez le SHOM pour
        l’annuaire officiel.
      </p>
      {error ? (
        <p className="text-sm text-rate-bad">Marées indisponibles : {error}</p>
      ) : !data ? (
        <div className="skeleton h-24" />
      ) : (
        <>
          <p className="mb-2 text-sm font-bold">
            Actuellement : marée {rising == null ? '—' : rising ? 'montante ↗' : 'descendante ↘'}
            {windowStart && (
              <span className="font-normal text-ink-700">
                {' '}
                · pendant le meilleur créneau ({hhmm(windowStart)} – {hhmm(windowEnd)}) : {fmt(tideAt(windowStart), 1)} m → {fmt(tideAt(windowEnd), 1)} m
              </span>
            )}
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {upcoming.map((e) => (
              <span key={e.time} className={`chip ${e.type === 'haute' ? 'bg-lagoon-500 text-white' : 'bg-mint-100 text-ink-900'}`}>
                {e.type === 'haute' ? 'Pleine mer' : 'Basse mer'} · {relativeDay(e.time, nowIso)} {hhmm(e.time)} · {fmt(e.height, 1)} m
              </span>
            ))}
          </div>
          <div className="h-36">
            <ResponsiveContainer>
              <AreaChart data={chart} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <XAxis dataKey="t" tickFormatter={(t: string) => (t.endsWith('T00:00') ? dayLabel(t) : hourLabel(t))} minTickGap={24} />
                <YAxis unit=" m" />
                <Tooltip labelFormatter={(t: any) => `${dayLabel(String(t), true)} · ${hourLabel(String(t))}`} formatter={(v: any) => [`${fmt(Number(v), 2)} m`, 'Hauteur']} />
                <ReferenceLine x={nowHour} stroke="#E58A1F" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="h" stroke="#1FB3A6" fill="#3CCFC1" fillOpacity={0.3} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
