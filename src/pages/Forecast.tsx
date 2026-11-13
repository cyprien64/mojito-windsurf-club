import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSpotRoute } from '../hooks/useSpotRoute';
import { SpotPicker } from '../components/SpotPicker';
import { DataStamp } from '../components/DataStamp';
import { ErrorBox, LoadingBlock } from '../components/States';
import { WindArrow } from '../components/WindArrow';
import { WeatherIcon } from '../components/WeatherIcon';
import { RatingBadge } from '../components/RatingBadge';
import { cardinal } from '../lib/wind';
import { cloudLabel, dayLabel, fmt, hhmm, hourLabel, octas, relativeDay } from '../lib/format';
import { bestWindow, findWindows, levelFromScore, LEVEL_META, type SailWindow } from '../lib/scoring';

type Mode = 'hourly' | 'daily';

/** Flèche de direction utilisée comme "dot" Recharts. */
function ArrowDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || payload?.dir == null) return <g />;
  const color = payload.daylight === false ? '#9DB8AE' : LEVEL_META[levelFromScore(payload.score ?? 0)].color;
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${payload.dir + 180})`}>
      <path d="M0 -8 L5 6 L0 3 L-5 6Z" fill={color} />
    </g>
  );
}

function TooltipBox({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-mint-200 bg-cream-50/95 px-3 py-2 text-xs shadow-lift">
      <p className="font-bold">
        {p.dayLabel} · {p.hour}
      </p>
      {p.speed != null && (
        <p>
          Vent <b>{fmt(p.speed)} nds</b> · rafales <b>{fmt(p.gust)} nds</b>
        </p>
      )}
      {p.dir != null && (
        <p>
          Direction {cardinal(p.dir)} ({Math.round(p.dir)}°)
        </p>
      )}
      {p.temp != null && <p>Température {fmt(p.temp, 1)} °C</p>}
      {p.cloud != null && (
        <p>
          Nébulosité {fmt(p.cloud)} % ({octas(p.cloud)}/8)
          {p.cloudLow != null && ` · basse ${fmt(p.cloudLow)} %, moy. ${fmt(p.cloudMid)} %, haute ${fmt(p.cloudHigh)} %`}
        </p>
      )}
      {p.precip != null && <p>Pluie {fmt(p.precip, 1)} mm{p.pop != null ? ` (${p.pop} %)` : ''}</p>}
      {p.score != null && (
        <p className="mt-1 font-bold" style={{ color: LEVEL_META[levelFromScore(p.score)].color }}>
          Score windsurf {Math.round(p.score)}/100{p.daylight === false ? ' (nuit)' : ''}
        </p>
      )}
    </div>
  );
}

const DIR_TICKS = [0, 90, 180, 270, 360];
const dirTick = (v: number) => ['N', 'E', 'S', 'O', 'N'][DIR_TICKS.indexOf(v)] ?? '';

export function Forecast() {
  const spot = useSpotRoute();
  const navigate = useNavigate();
  const { weather, evaluations, settings, refresh } = useApp();
  const [mode, setMode] = useState<Mode>('hourly');
  const [range, setRange] = useState<{ start: number; end: number }>({ start: 0, end: 47 });

  const w = weather.data?.[spot.id];
  const ev = evaluations[spot.id];

  const hourly = useMemo(() => {
    if (!w || !ev) return [];
    const out = [];
    for (let i = w.nowIndex; i < Math.min(w.hourly.time.length, w.nowIndex + 48); i++) {
      const t = w.hourly.time[i];
      out.push({
        time: t,
        hour: hourLabel(t),
        dayLabel: dayLabel(t, true),
        speed: w.hourly.windSpeed[i],
        gust: w.hourly.windGusts[i],
        dir: w.hourly.windDirection[i],
        temp: w.hourly.temperature[i],
        precip: w.hourly.precipitation[i],
        pop: w.hourly.precipitationProbability[i],
        cloud: w.hourly.cloudCover[i],
        cloudLow: w.hourly.cloudLow[i],
        cloudMid: w.hourly.cloudMid[i],
        cloudHigh: w.hourly.cloudHigh[i],
        score: ev.hours[i]?.score ?? null,
        daylight: ev.hours[i]?.daylight ?? true,
      });
    }
    return out;
  }, [w, ev]);

  const windows48: SailWindow[] = ev?.windows ?? [];
  const weekWindows = useMemo(() => {
    if (!w || !ev) return [] as SailWindow[];
    return findWindows(ev.hours, w.nowIndex, ev.hours.length, settings.windowThreshold, settings.daylightOnly);
  }, [w, ev, settings.windowThreshold, settings.daylightOnly]);

  const daily = useMemo(() => {
    if (!w) return [];
    const today = w.current.time.slice(0, 10);
    return w.daily.time
      .map((d, i) => ({
        day: d,
        label: dayLabel(d),
        windMax: w.daily.windMax[i],
        gustMax: w.daily.gustMax[i],
        dir: w.daily.windDirectionDominant[i],
        tmax: w.daily.tempMax[i],
        tmin: w.daily.tempMin[i],
        precip: w.daily.precipitationSum[i],
        code: w.daily.weatherCode[i],
        cloud: w.daily.cloudMean[i],
        best: bestWindow(weekWindows.filter((x) => x.start.startsWith(d))),
      }))
      .filter((d) => d.day >= today);
  }, [w, weekWindows]);

  const header = <SpotPicker value={spot.id} onChange={(id) => navigate(`/previsions/${id}`)} />;

  if (!w || !ev) {
    return (
      <div className="space-y-4">
        {header}
        {weather.error ? <ErrorBox message={weather.error} onRetry={refresh} /> : <LoadingBlock rows={2} />}
      </div>
    );
  }

  const start = Math.min(range.start, hourly.length - 1);
  const end = Math.min(range.end, hourly.length - 1);
  const visible = hourly.slice(start, end + 1);
  const presets = [
    { label: '12 h', s: 0, e: 11 },
    { label: '24 h', s: 0, e: 23 },
    { label: 'J+1', s: 24, e: 47 },
    { label: '48 h', s: 0, e: 47 },
  ];

  return (
    <div className="space-y-5">
      {header}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Prévisions · {spot.shortName}</h1>
          <DataStamp fetchedAt={weather.fetchedAt} stale={weather.stale} loading={weather.loading} onRefresh={refresh} />
          <Link to={`/tendance/${spot.id}`} className="mt-1 inline-block text-sm font-bold text-mint-700 hover:underline">
            📈 Tendance sur 15 jours avec indice de confiance →
          </Link>
        </div>
        <div className="flex rounded-full border border-mint-200 bg-cream-50 p-1" role="tablist">
          {(['hourly', 'daily'] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${mode === m ? 'bg-mint-600 text-white' : 'text-ink-800'}`}
            >
              {m === 'hourly' ? '48 h heure par heure' : '7 jours'}
            </button>
          ))}
        </div>
      </section>

      {mode === 'hourly' ? (
        <>
          {/* Créneaux favorables */}
          <section className="card card-pad">
            <h2 className="mb-2 font-display text-lg font-extrabold">Créneaux favorables (score ≥ {settings.windowThreshold}/100)</h2>
            {windows48.length ? (
              <div className="flex flex-wrap gap-2">
                {windows48.map((x) => (
                  <span
                    key={x.start}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                      x === ev.bestWindow ? 'bg-night text-lemon-300' : 'bg-mint-100 text-ink-900'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {relativeDay(x.start, w.current.time)} {hhmm(x.start)} – {hhmm(x.end)} · {Math.round(x.avgSpeed)} nds · {Math.round(x.avgScore)}/100
                    {x === ev.bestWindow && ' · MEILLEUR'}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-700">Aucun créneau favorable dans les 48 prochaines heures selon la configuration de ce spot.</p>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <span className="label">Période :</span>
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setRange({ start: p.s, end: p.e })}
                className={`chip border ${start === p.s && end === Math.min(p.e, hourly.length - 1) ? 'border-night bg-night text-white' : 'border-mint-200 bg-cream-50'}`}
              >
                {p.label}
              </button>
            ))}
            <span className="text-xs text-ink-700/70">ou faites glisser la barre sous le graphique</span>
          </div>

          <section className="card card-pad">
            <h2 className="mb-1 font-display text-lg font-extrabold">Vent moyen & rafales (nœuds)</h2>
            <p className="mb-2 text-xs text-ink-700">Zones vertes : créneaux favorables. Lignes pointillées : plage idéale du spot.</p>
            <div className="h-72">
              <ResponsiveContainer>
                <ComposedChart data={hourly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} syncId="fc">
                  <defs>
                    <linearGradient id="windFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#22D24A" stopOpacity={0.55} />
                      <stop offset="1" stopColor="#22D24A" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  {windows48.map((x) => {
                    const last = hourly.filter((h) => h.time < x.end).pop();
                    return <ReferenceArea key={x.start} x1={x.start} x2={last?.time ?? x.start} fill="#3DBE6A" fillOpacity={0.14} ifOverflow="visible" />;
                  })}
                  {(() => {
                    const cfg = settings.spots[spot.id] ?? spot.defaults;
                    return (
                      <>
                        <ReferenceLine y={cfg.speed.idealMin} stroke="#0F7A43" strokeDasharray="4 4" strokeOpacity={0.6} />
                        <ReferenceLine y={cfg.speed.idealMax} stroke="#0F7A43" strokeDasharray="4 4" strokeOpacity={0.6} />
                      </>
                    );
                  })()}
                  <XAxis dataKey="time" tickFormatter={hourLabel} minTickGap={18} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<TooltipBox />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="speed" name="Vent moyen" stroke="#17A63A" strokeWidth={2.5} fill="url(#windFill)" connectNulls />
                  <Line type="monotone" dataKey="gust" name="Rafales" stroke="#E58A1F" strokeWidth={2} dot={false} strokeDasharray="5 3" connectNulls />
                  <Brush
                    dataKey="time"
                    height={24}
                    stroke="#17A63A"
                    travellerWidth={10}
                    startIndex={start}
                    endIndex={end}
                    tickFormatter={hourLabel}
                    onChange={(r: any) => {
                      if (r && typeof r.startIndex === 'number' && typeof r.endIndex === 'number') setRange({ start: r.startIndex, end: r.endIndex });
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card card-pad">
            <h2 className="mb-2 font-display text-lg font-extrabold">Direction du vent</h2>
            <div className="h-40">
              <ResponsiveContainer>
                <LineChart data={visible} margin={{ top: 10, right: 8, left: -18, bottom: 0 }} syncId="fc2">
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="time" tickFormatter={hourLabel} minTickGap={18} />
                  <YAxis domain={[0, 360]} ticks={DIR_TICKS} tickFormatter={dirTick} />
                  <Tooltip content={<TooltipBox />} />
                  <Line dataKey="dir" stroke="none" isAnimationActive={false} dot={<ArrowDot />} activeDot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-ink-700">Flèches colorées selon le score windsurf de l’heure (gris = nuit).</p>
          </section>

          <section className="card card-pad">
            <h2 className="mb-2 font-display text-lg font-extrabold">Température & précipitations</h2>
            <div className="h-56">
              <ResponsiveContainer>
                <ComposedChart data={visible} margin={{ top: 8, right: 0, left: -18, bottom: 0 }} syncId="fc2">
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="time" tickFormatter={hourLabel} minTickGap={18} />
                  <YAxis yAxisId="t" unit="°" />
                  <YAxis yAxisId="p" orientation="right" unit="mm" width={44} />
                  <Tooltip content={<TooltipBox />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="p" dataKey="precip" name="Pluie (mm)" fill="#3CCFC1" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="t" type="monotone" dataKey="temp" name="Température (°C)" stroke="#EFD12B" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card card-pad">
            <h2 className="mb-1 font-display text-lg font-extrabold">Nébulosité</h2>
            <p className="mb-2 text-xs text-ink-700">Couverture nuageuse totale (aire) et par étage : nuages bas, moyens et hauts.</p>
            <div className="h-52">
              <ResponsiveContainer>
                <ComposedChart data={visible} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} syncId="fc2">
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="time" tickFormatter={hourLabel} minTickGap={18} />
                  <YAxis domain={[0, 100]} unit="%" ticks={[0, 25, 50, 75, 100]} />
                  <Tooltip content={<TooltipBox />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="cloud" name="Totale" stroke="#7C9A90" fill="#9DB8AE" fillOpacity={0.35} />
                  <Line type="monotone" dataKey="cloudLow" name="Basse" stroke="#4B5D57" dot={false} strokeWidth={1.6} />
                  <Line type="monotone" dataKey="cloudMid" name="Moyenne" stroke="#1FB3A6" dot={false} strokeWidth={1.6} />
                  <Line type="monotone" dataKey="cloudHigh" name="Haute" stroke="#A3CC2A" dot={false} strokeWidth={1.6} strokeDasharray="4 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {daily.map((d) => (
              <div key={d.day} className="card p-3.5">
                <div className="flex items-center justify-between">
                  <p className="font-display text-base font-extrabold capitalize">{relativeDay(d.day, w.current.time)}</p>
                  <WeatherIcon code={d.code} className="h-6 w-6" />
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <WindArrow deg={d.dir} size={26} className="text-mint-700" />
                  <div>
                    <p className="tabular text-xl font-extrabold leading-none">
                      {fmt(d.windMax)} <span className="text-xs font-bold text-ink-700">nds max</span>
                    </p>
                    <p className="tabular text-xs text-ink-700">
                      rafales {fmt(d.gustMax)} nds · {cardinal(d.dir)}
                    </p>
                  </div>
                </div>
                <p className="tabular mt-2 text-xs text-ink-700">
                  {fmt(d.tmin)}° / {fmt(d.tmax)}° · pluie {fmt(d.precip, 1)} mm · nébulosité {fmt(d.cloud)} % ({cloudLabel(d.cloud).toLowerCase()})
                </p>
                <div className="mt-2">
                  {d.best ? (
                    <span className="inline-flex flex-wrap items-center gap-1 text-xs font-bold">
                      <RatingBadge level={levelFromScore(d.best.avgScore)} size="sm" label={`${hhmm(d.best.start)} – ${hhmm(d.best.end)}`} />
                      <span className="text-ink-700">{Math.round(d.best.avgSpeed)} nds moy.</span>
                    </span>
                  ) : (
                    <span className="text-xs text-ink-700/70">Pas de créneau favorable</span>
                  )}
                </div>
              </div>
            ))}
          </section>
          <section className="card card-pad">
            <h2 className="mb-2 font-display text-lg font-extrabold">Vent max & rafales max par jour</h2>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={daily} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(v: any) => `${fmt(Number(v))} nds`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="windMax" name="Vent max" fill="#22D24A" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="gustMax" name="Rafales max" fill="#F2994A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="card card-pad">
            <h2 className="mb-2 font-display text-lg font-extrabold">Températures & pluie par jour</h2>
            <div className="h-56">
              <ResponsiveContainer>
                <ComposedChart data={daily} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis yAxisId="t" unit="°" />
                  <YAxis yAxisId="p" orientation="right" unit="mm" width={44} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="p" dataKey="precip" name="Pluie (mm)" fill="#3CCFC1" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="t" dataKey="tmax" name="Max (°C)" stroke="#EFD12B" strokeWidth={2.5} />
                  <Line yAxisId="t" dataKey="tmin" name="Min (°C)" stroke="#1FB3A6" strokeWidth={2.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
      <p className="text-xs text-ink-700/70">
        Prévisions Open-Meteo (« best match » : combinaison automatique des meilleurs modèles pour ce lieu, dont AROME/ARPEGE en France). Pour comparer les modèles un
        par un, voir la page Modèles.
      </p>
    </div>
  );
}
