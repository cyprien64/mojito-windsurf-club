import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock } from 'lucide-react';
import { SPOTS, SPOT_BY_ID } from '../config/spots';
import { useApp } from '../context/AppContext';
import { bestWindow, findWindows, levelFromScore, type HourEval, type SailWindow } from '../lib/scoring';
import { RatingBadge } from '../components/RatingBadge';
import { WindArrow } from '../components/WindArrow';
import { ErrorBox, LoadingBlock } from '../components/States';
import { SafetyNotice } from '../components/SafetyNotice';
import { cardinal } from '../lib/wind';
import { dayLabel, fmt, hhmm } from '../lib/format';

/** Samedi et dimanche à venir (ou en cours), au format YYYY-MM-DD. */
function weekendDays(todayIso: string): string[] {
  const [y, m, d] = todayIso.slice(0, 10).split('-').map(Number);
  const today = new Date(y, m - 1, d);
  const dow = today.getDay(); // 0 = dimanche
  const toIso = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  if (dow === 0) return [toIso(today)];
  const sat = new Date(today);
  sat.setDate(today.getDate() + ((6 - dow + 7) % 7));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return [toIso(sat), toIso(sun)];
}

interface DayRank {
  spotId: string;
  window: SailWindow | null;
  bestHour: HourEval | null;
  value: number;
}

export function Weekend() {
  const { weather, evaluations, settings, refresh } = useApp();
  const todayIso = weather.data ? Object.values(weather.data)[0]?.current.time ?? '' : '';
  const days = todayIso ? weekendDays(todayIso) : [];

  const ranking = useMemo(() => {
    const out: Record<string, DayRank[]> = {};
    for (const day of days) {
      const list: DayRank[] = [];
      for (const s of SPOTS) {
        const ev = evaluations[s.id];
        if (!ev) continue;
        const idx = ev.hours.map((h, i) => (h.time.startsWith(day) ? i : -1)).filter((i) => i >= 0);
        if (!idx.length) continue;
        const wins = findWindows(ev.hours, idx[0], idx[idx.length - 1] + 1, settings.windowThreshold, settings.daylightOnly);
        const w = bestWindow(wins);
        let bh: HourEval | null = null;
        for (const i of idx) {
          const h = ev.hours[i];
          if (h.blocked || (settings.daylightOnly && !h.daylight)) continue;
          if (!bh || h.score > bh.score) bh = h;
        }
        list.push({ spotId: s.id, window: w, bestHour: bh, value: w ? w.avgScore * Math.min(w.hours, 5) : (bh?.score ?? 0) / 5 });
      }
      out[day] = list.sort((a, b) => b.value - a.value);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluations, settings, days.join()]);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <CalendarDays className="h-7 w-7 text-mint-600" /> Prévision du week-end
        </h1>
        <p className="text-sm text-ink-700">Le meilleur spot et le meilleur créneau pour samedi et dimanche, recalculés à chaque mise à jour des prévisions.</p>
      </section>
      {weather.error && !weather.data ? (
        <ErrorBox message={weather.error} onRetry={refresh} />
      ) : !days.length || !Object.keys(evaluations).length ? (
        <LoadingBlock rows={2} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {days.map((day) => {
            const list = ranking[day] ?? [];
            const top = list[0];
            return (
              <section key={day} className="card overflow-hidden">
                <div className="bg-gradient-to-r from-mint-500 to-lagoon-500 px-4 py-3 text-white">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Week-end</p>
                  <h2 className="font-display text-2xl font-extrabold capitalize">{dayLabel(day, true)}</h2>
                </div>
                <div className="p-4">
                  {top && top.window ? (
                    <div className="mb-4 rounded-2xl bg-lemon-300/40 p-3">
                      <p className="label">Meilleur choix</p>
                      <Link to={`/conditions/${top.spotId}`} className="font-display text-xl font-extrabold hover:underline">
                        🌴 {SPOT_BY_ID[top.spotId].name}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold">
                        <span className="inline-flex items-center gap-1 rounded-full bg-night px-2.5 py-1 text-xs text-lemon-300">
                          <Clock className="h-3.5 w-3.5" /> {hhmm(top.window.start)} – {hhmm(top.window.end)}
                        </span>
                        {fmt(top.window.avgSpeed)} nds moy. · rafales max {fmt(top.window.maxGust)} nds ·{' '}
                        <WindArrow deg={top.window.mainDir} size={14} className="text-mint-700" /> {cardinal(top.window.mainDir)}
                      </p>
                    </div>
                  ) : (
                    <p className="mb-4 rounded-2xl bg-mint-50 p-3 text-sm">Aucun créneau favorable prévu ce jour-là sur les spots du club.</p>
                  )}
                  <ol className="space-y-2">
                    {list.map((r, i) => (
                      <li key={r.spotId} className="flex items-center gap-3 rounded-xl border border-mint-100 bg-cream-50 px-3 py-2 text-sm">
                        <span className="w-5 text-center font-extrabold text-ink-700/60">{i + 1}</span>
                        <Link to={`/previsions/${r.spotId}`} className="flex-1 font-bold hover:underline">
                          {SPOT_BY_ID[r.spotId].shortName}
                        </Link>
                        {r.window ? (
                          <RatingBadge level={levelFromScore(r.window.avgScore)} size="sm" label={`${hhmm(r.window.start)}–${hhmm(r.window.end)}`} />
                        ) : (
                          <span className="text-xs text-ink-700/70">
                            {r.bestHour ? `max ${Math.round(r.bestHour.score)}/100 à ${hhmm(r.bestHour.time)}` : '—'}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            );
          })}
        </div>
      )}
      <SafetyNotice compact />
    </div>
  );
}
