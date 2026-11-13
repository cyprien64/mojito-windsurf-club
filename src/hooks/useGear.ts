import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SPOT_BY_ID } from '../config/spots';
import { adviseGear, type GearAdvice } from '../lib/gear';
import { hhmm } from '../lib/format';

/** Conseil matériel pour un spot : maintenant et sur le meilleur créneau. */
export function useGear(spotId: string): { now: GearAdvice | null; best: GearAdvice | null } {
  const { evaluations, settings, rider } = useApp();
  const ev = evaluations[spotId];
  return useMemo(() => {
    const spot = SPOT_BY_ID[spotId];
    if (!ev || !spot || ev.speed == null) return { now: null, best: null };
    const cfg = settings.spots[spotId] ?? spot.defaults;
    const now = adviseGear(rider, { speed: ev.speed, gust: ev.gust, source: 'maintenant' }, spot, cfg, ev.blocked);
    const w = ev.bestWindow;
    const best = w
      ? adviseGear(rider, { speed: w.avgSpeed, gust: w.maxGust, source: `créneau ${hhmm(w.start)} – ${hhmm(w.end)}` }, spot, cfg, false)
      : null;
    return { now, best };
  }, [ev, settings, rider, spotId]);
}
