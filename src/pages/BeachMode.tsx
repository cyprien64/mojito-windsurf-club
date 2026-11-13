import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RefreshCw, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSpotRoute } from '../hooks/useSpotRoute';
import { SPOTS } from '../config/spots';
import { WindArrow } from '../components/WindArrow';
import { cardinal } from '../lib/wind';
import { LEVEL_META } from '../lib/scoring';
import { hourLabel } from '../lib/format';
import { isFresh } from '../services/stations';

/**
 * MODE PLAGE — un écran très simple et très lisible à consulter au bord de
 * l'eau, en plein soleil : chiffres géants, fort contraste, écran maintenu
 * allumé, actualisation automatique.
 */
export function BeachMode() {
  const spot = useSpotRoute();
  const { evaluations, weather, stations, refresh } = useApp();
  const [bright, setBright] = useState(() => {
    try {
      return localStorage.getItem('mwc-beach-bright') === '1';
    } catch {
      return false;
    }
  });
  const [, tick] = useState(0);

  // Écran maintenu allumé (si le navigateur le permet)
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        lock = await (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null;
      } catch {
        /* non disponible */
      }
    };
    request();
    const onVis = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => undefined);
    };
  }, []);

  // Rafraîchit l'affichage de l'âge des données chaque minute
  useEffect(() => {
    const id = window.setInterval(() => tick((x) => x + 1), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const ev = evaluations[spot.id];
  const w = weather.data?.[spot.id];
  const st = (stations[spot.id] ?? []).find((s) => isFresh(s));
  const live = st && st.avg != null;
  const speed = live ? st.avg : w?.current.windSpeed ?? null;
  const gust = live ? st.max : w?.current.windGusts ?? null;
  const dir = live ? st.heading : w?.current.windDirection ?? null;
  const next = ev ? ev.hours.slice(ev.hours.findIndex((h) => h.index === w?.nowIndex) + 1).slice(0, 3) : [];
  const lvl = ev ? LEVEL_META[ev.level] : null;

  const bg = bright ? 'bg-white text-black' : 'bg-[#050806] text-white';
  const accent = bright ? 'text-[#0E6B24]' : 'text-[#3FE06A]';
  const sub = bright ? 'text-black/70' : 'text-white/70';
  const idx = SPOTS.findIndex((s) => s.id === spot.id);
  const prev = SPOTS[(idx - 1 + SPOTS.length) % SPOTS.length];
  const nxt = SPOTS[(idx + 1) % SPOTS.length];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-y-auto ${bg}`}>
      <div className="flex items-center justify-between gap-2 px-4 pt-[max(env(safe-area-inset-top),12px)]">
        <Link to={`/conditions/${spot.id}`} className={`inline-flex items-center gap-1 text-base font-bold ${accent}`}>
          <ArrowLeft className="h-5 w-5" /> Quitter
        </Link>
        <div className="flex items-center gap-2">
          <button
            className={`grid h-11 w-11 place-items-center rounded-full border ${bright ? 'border-black/20' : 'border-white/20'}`}
            onClick={() => {
              setBright((b) => {
                try {
                  localStorage.setItem('mwc-beach-bright', b ? '0' : '1');
                } catch {
                  /* ignore */
                }
                return !b;
              });
            }}
            aria-label="Changer le contraste"
          >
            <Sun className="h-5 w-5" />
          </button>
          <button className={`grid h-11 w-11 place-items-center rounded-full border ${bright ? 'border-black/20' : 'border-white/20'}`} onClick={refresh} aria-label="Actualiser">
            <RefreshCw className={`h-5 w-5 ${weather.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pt-3">
        <Link to={`/plage/${prev.id}`} className={`p-2 ${sub}`} aria-label={`Spot précédent : ${prev.shortName}`}>
          <ArrowLeft className="h-7 w-7" />
        </Link>
        <h1 className="text-center font-brand text-2xl leading-tight">{spot.shortName}</h1>
        <Link to={`/plage/${nxt.id}`} className={`p-2 ${sub}`} aria-label={`Spot suivant : ${nxt.shortName}`}>
          <ArrowRight className="h-7 w-7" />
        </Link>
      </div>
      <p className={`text-center text-base font-bold ${sub}`}>
        {live ? `Balise ${st.name} · il y a ${st.ageMin ?? '?'} min` : 'Prévision du modèle (pas de balise en direct)'}
      </p>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-4">
        <div className="flex items-end gap-3">
          <span className="tabular font-brand text-[9rem] leading-none">{speed != null ? Math.round(speed) : '—'}</span>
          <span className={`mb-5 text-3xl font-extrabold ${accent}`}>nds</span>
        </div>
        <p className="text-4xl font-extrabold">
          rafales <span className={`tabular ${accent}`}>{gust != null ? Math.round(gust) : '—'}</span>
        </p>
        <div className="mt-3 flex items-center gap-4">
          <WindArrow deg={dir} size={84} className={accent} />
          <div>
            <p className="font-brand text-5xl">{cardinal(dir)}</p>
            <p className={`text-xl font-bold ${sub}`}>{dir != null ? `${Math.round(dir)}°` : ''}</p>
          </div>
        </div>
        {ev && lvl && (
          <p className="mt-4 rounded-full px-6 py-3 text-2xl font-extrabold" style={{ background: lvl.color, color: '#fff' }}>
            {ev.score}/100 · {lvl.short}
          </p>
        )}
        {ev?.trend && (
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
            {ev.trend === 'hausse' ? <ArrowUp className="h-7 w-7" /> : ev.trend === 'baisse' ? <ArrowDown className="h-7 w-7" /> : <ArrowRight className="h-7 w-7" />}
            vent {ev.trend === 'stable' ? 'stable' : `en ${ev.trend}`}
          </p>
        )}
        {ev?.warnings.map((x) => (
          <p key={x} className="mt-2 max-w-md rounded-xl bg-[#E5484D] px-4 py-2 text-center text-lg font-bold text-white">
            {x}
          </p>
        ))}
      </div>

      {next.length > 0 && (
        <div className="grid grid-cols-3 gap-2 px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          {next.map((h) => (
            <div key={h.time} className={`rounded-2xl border p-3 text-center ${bright ? 'border-black/15' : 'border-white/15'}`}>
              <p className={`text-lg font-bold ${sub}`}>{hourLabel(h.time)}</p>
              <p className="tabular font-brand text-4xl">{h.speed != null ? Math.round(h.speed) : '—'}</p>
              <p className={`text-base font-bold ${sub}`}>
                raf. {h.gust != null ? Math.round(h.gust) : '—'} · {cardinal(h.dir)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
