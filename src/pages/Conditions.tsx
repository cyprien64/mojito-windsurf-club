import { Activity, AlertTriangle, Clock, Cloud, Droplets, Gauge, MapPin, Sunrise, Sunset, Thermometer, Umbrella, Wind } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useSpotRoute } from '../hooks/useSpotRoute';
import { SpotPicker } from '../components/SpotPicker';
import { WindRose, RoseLegend } from '../components/WindRose';
import { WindArrow } from '../components/WindArrow';
import { RatingBadge, ScoreRing } from '../components/RatingBadge';
import { StatTile } from '../components/StatTile';
import { DataStamp } from '../components/DataStamp';
import { ErrorBox, LoadingBlock, WarningBanner } from '../components/States';
import { SafetyNotice } from '../components/SafetyNotice';
import { SpotImage } from '../components/SpotImage';
import { WeatherIcon } from '../components/WeatherIcon';
import { beaufort, cardinal, cardinalLong, toKmh } from '../lib/wind';
import { fmt, hhmm, hourLabel, relativeDay } from '../lib/format';
import { LEVEL_META, SECTOR_RATING_META, levelFromScore } from '../lib/scoring';
import { weatherInfo } from '../lib/weatherCodes';
import { useGear } from '../hooks/useGear';
import { GearPanel } from '../components/Gear';
import { MarineCard } from '../components/MarineCard';

const STRENGTH_COLOR: Record<string, string> = { faible: '#7BDCAE', modéré: '#3DBE6A', fort: '#F2994A', 'très fort': '#E5484D' };

export function Conditions() {
  const spot = useSpotRoute();
  const navigate = useNavigate();
  const { weather, evaluations, settings, refresh } = useApp();
  const w = weather.data?.[spot.id];
  const ev = evaluations[spot.id];
  const cfg = settings.spots[spot.id] ?? spot.defaults;
  const gear = useGear(spot.id);

  const header = (
    <div className="space-y-3">
      <SpotPicker value={spot.id} onChange={(id) => navigate(`/conditions/${id}`)} />
    </div>
  );

  if (!w || !ev) {
    return (
      <div className="space-y-4">
        {header}
        {weather.error ? <ErrorBox message={weather.error} onRetry={refresh} /> : <LoadingBlock />}
      </div>
    );
  }

  const c = w.current;
  const todayIdx = w.daily.time.indexOf(c.time.slice(0, 10));
  const di = todayIdx >= 0 ? todayIdx : 0;
  const next12 = ev.hours.slice(w.nowIndex, w.nowIndex + 13);
  const gf = ev.gustFactor;
  const reg = ev.components.regularity;

  return (
    <div className="space-y-5">
      {header}

      {/* En-tête du spot */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{spot.name}</h1>
          <p className="flex items-center gap-1 text-sm text-ink-700">
            <MapPin className="h-4 w-4" /> {spot.location}
          </p>
        </div>
        <DataStamp fetchedAt={weather.fetchedAt} modelTime={c.time} stale={weather.stale} loading={weather.loading} onRefresh={refresh} />
      </section>

      {ev.warnings.map((x) => (
        <WarningBanner key={x}>{x}</WarningBanner>
      ))}

      {/* L'essentiel : visible sans défiler */}
      <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="card overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-mint-100">
            <div className="p-4">
              <p className="label">Vent moyen</p>
              <p className="tabular font-display text-5xl font-extrabold leading-none text-ink-900">{fmt(c.windSpeed)}</p>
              <p className="text-sm font-bold text-mint-700">nœuds</p>
              <p className="tabular text-sm text-ink-700">{fmt(c.windSpeed != null ? toKmh(c.windSpeed) : null)} km/h</p>
            </div>
            <div className="p-4">
              <p className="label">Rafales</p>
              <p className="tabular font-display text-5xl font-extrabold leading-none text-ink-900">{fmt(c.windGusts)}</p>
              <p className="text-sm font-bold text-mint-700">nœuds</p>
              <p className="tabular text-sm text-ink-700">{fmt(c.windGusts != null ? toKmh(c.windGusts) : null)} km/h</p>
            </div>
            <div className="p-4">
              <p className="label">Direction</p>
              <div className="flex items-center gap-2">
                <WindArrow deg={c.windDirection} size={40} className="text-mint-700" />
                <span className="font-display text-3xl font-extrabold">{cardinal(c.windDirection)}</span>
              </div>
              <p className="text-sm font-bold text-ink-800">{c.windDirection != null ? `${Math.round(c.windDirection)}°` : '—'}</p>
              <p className="text-xs text-ink-700">{cardinalLong(c.windDirection)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 border-t border-mint-100 bg-gradient-to-r from-mint-50 to-transparent p-4">
            <ScoreRing score={ev.score} level={ev.level} size={70} />
            <div className="min-w-0 flex-1">
              <p className="label">Navigabilité</p>
              <RatingBadge level={ev.level} size="lg" />
              <p className="mt-1.5 text-sm text-ink-800">{ev.summary}</p>
            </div>
          </div>
          <p className="border-t border-mint-100 px-4 py-2 text-[11px] text-ink-700/70">
            Valeurs modélisées (Open-Meteo, meilleur modèle disponible) — pas une mesure de station.
          </p>
        </div>

        <div className="card card-pad">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Rose des vents du spot</h2>
            <Link to="/admin" className="text-xs font-bold text-mint-700 hover:underline">
              Configurer
            </Link>
          </div>
          <WindRose sectors={cfg.sectors} direction={c.windDirection} speedLabel={c.windSpeed != null ? `${Math.round(c.windSpeed)} nds` : undefined} size={280} />
          <div className="mt-2">
            <RoseLegend />
          </div>
        </div>
      </section>

      {/* Indicateurs windsurf */}
      <section>
        <h2 className="section-title mb-3">Indicateurs windsurf</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatTile
            icon={<Wind className="h-4 w-4 text-white" />}
            accent={ev.strength ? STRENGTH_COLOR[ev.strength] : undefined}
            label="Force"
            value={<span className="capitalize">{ev.strength ?? '—'}</span>}
            sub={c.windSpeed != null ? `Beaufort ${beaufort(c.windSpeed)} · ${ev.speedClass} pour ce spot` : undefined}
          />
          <StatTile
            icon={<WindArrow deg={c.windDirection} size={16} color="#fff" />}
            accent={ev.sectorRating ? SECTOR_RATING_META[ev.sectorRating].color : undefined}
            label="Orientation"
            value={ev.sectorRating ? SECTOR_RATING_META[ev.sectorRating].label : '—'}
            sub={`${cardinalLong(c.windDirection)} selon la config du spot`}
          />
          <StatTile
            icon={<Activity className="h-4 w-4 text-ink-900" />}
            accent={reg == null ? undefined : reg >= 0.7 ? '#ACEBCB' : reg >= 0.4 ? '#FBEF8A' : '#F8B4B4'}
            label="Stabilité"
            value={reg == null ? '—' : reg >= 0.7 ? 'Stable' : reg >= 0.4 ? 'Variable' : 'Instable'}
            sub="Vitesse et direction sur 4 h"
          />
          <StatTile
            icon={<AlertTriangle className="h-4 w-4 text-ink-900" />}
            accent={gf == null ? undefined : gf <= 1.3 ? '#ACEBCB' : gf < cfg.gusts.maxGustFactor ? '#FBEF8A' : '#F8B4B4'}
            label="Rafales"
            value={gf == null ? '—' : gf <= 1.3 ? 'Faibles' : gf < cfg.gusts.maxGustFactor ? 'Marquées' : 'Très fortes'}
            sub={gf != null ? `Rapport rafale/moyen ×${gf.toFixed(2)}` : undefined}
          />
          <StatTile
            icon={<Clock className="h-4 w-4 text-ink-900" />}
            accent="#FBEF8A"
            label="Meilleur créneau"
            value={ev.bestWindow ? `${hhmm(ev.bestWindow.start)} – ${hhmm(ev.bestWindow.end)}` : 'Aucun'}
            sub={ev.bestWindow ? `${relativeDay(ev.bestWindow.start, c.time)} · ${ev.bestWindow.hours} h · ${Math.round(ev.bestWindow.avgScore)}/100` : `Aucune heure ≥ ${settings.windowThreshold}/100 sur 48 h`}
          />
          <StatTile
            icon={<Gauge className="h-4 w-4 text-ink-900" />}
            label="Plage idéale"
            value={`${cfg.speed.idealMin}–${cfg.speed.idealMax} nds`}
            sub={`Min ${cfg.speed.minRideable} · max ${cfg.speed.maxRideable} nds`}
          />
        </div>
      </section>

      {/* Matériel & discipline */}
      {(gear.best ?? gear.now) && (
        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Quel matériel ? Windsurf ou wing foil ?</h2>
            <Link to={`/materiel/${spot.id}`} className="text-sm font-bold text-mint-700 hover:underline">
              Mon profil & détails →
            </Link>
          </div>
          <GearPanel advice={(gear.best ?? gear.now)!} />
        </section>
      )}

      {spot.marine && <MarineCard spotId={spot.id} />}

      {/* 12 prochaines heures */}
      <section className="card card-pad">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold">Les 12 prochaines heures</h2>
          <Link to={`/previsions/${spot.id}`} className="text-sm font-bold text-mint-700 hover:underline">
            Prévisions détaillées →
          </Link>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {next12.map((h) => {
            const lvl = h.blocked ? 'blocked' : levelFromScore(h.score);
            return (
              <div key={h.time} className="w-[62px] shrink-0 rounded-xl border border-mint-100 bg-white p-1.5 text-center">
                <p className="text-[11px] font-bold text-ink-700">{hourLabel(h.time)}</p>
                <WindArrow deg={h.dir} size={18} className="mx-auto my-1 text-mint-700" />
                <p className="tabular text-base font-extrabold leading-none">{fmt(h.speed)}</p>
                <p className="tabular text-[10px] text-ink-700/70">raf. {fmt(h.gust)}</p>
                <div className="mx-auto mt-1 h-1.5 w-full rounded-full" style={{ background: LEVEL_META[lvl].color, opacity: h.daylight ? 1 : 0.4 }} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Météo générale */}
      <section>
        <h2 className="section-title mb-3">Météo</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={<Thermometer className="h-4 w-4 text-mint-700" />} label="Température" value={`${fmt(c.temperature, 1)} °C`} sub={`Ressentie ${fmt(c.apparentTemperature, 1)} °C`} />
          <StatTile icon={<WeatherIcon code={c.weatherCode} isDay={c.isDay} className="h-4 w-4" />} label="Ciel" value={weatherInfo(c.weatherCode, c.isDay).label} sub={`Couverture nuageuse ${fmt(c.cloudCover)} %`} />
          <StatTile icon={<Gauge className="h-4 w-4 text-mint-700" />} label="Pression" value={`${fmt(c.pressure)} hPa`} sub="Au niveau de la mer" />
          <StatTile icon={<Droplets className="h-4 w-4 text-mint-700" />} label="Humidité" value={`${fmt(c.humidity)} %`} />
          <StatTile icon={<Umbrella className="h-4 w-4 text-mint-700" />} label="Précipitations" value={`${fmt(c.precipitation, 1)} mm`} sub={`Cumul du jour ${fmt(w.daily.precipitationSum[di], 1)} mm`} />
          <StatTile icon={<Cloud className="h-4 w-4 text-mint-700" />} label="Nuages" value={`${fmt(c.cloudCover)} %`} />
          <StatTile icon={<Sunrise className="h-4 w-4 text-lemon-500" />} label="Lever du soleil" value={hhmm(w.daily.sunrise[di])} />
          <StatTile icon={<Sunset className="h-4 w-4 text-rate-mid" />} label="Coucher du soleil" value={hhmm(w.daily.sunset[di])} />
        </div>
      </section>

      {/* Infos spot */}
      <section className="card grid overflow-hidden md:grid-cols-[1fr_1.4fr]">
        <SpotImage spot={spot} className="h-44 md:h-full" />
        <div className="space-y-2 p-4 text-sm">
          <h2 className="font-display text-lg font-extrabold">À propos du spot</h2>
          {spot.info && <p className="text-ink-800">{spot.info}</p>}
          {cfg.notes && (
            <p className="rounded-lg bg-lemon-300/40 px-3 py-2 text-ink-900">
              <strong>Note des admins :</strong> {cfg.notes}
            </p>
          )}
          <p className="text-xs text-ink-700">
            Coordonnées : {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)} — source : {spot.coordSource} (vérifiées le {spot.coordCheckedOn}).{' '}
            {w.elevation != null && `Altitude du point de grille : ${Math.round(w.elevation)} m.`}
          </p>
          {spot.aka && <p className="text-xs text-ink-700">Aussi appelé : {spot.aka.join(', ')}</p>}
        </div>
      </section>

      <SafetyNotice />
    </div>
  );
}
