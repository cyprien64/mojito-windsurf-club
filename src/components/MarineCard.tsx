import { useEffect, useState } from 'react';
import { Waves } from 'lucide-react';
import { SPOT_BY_ID } from '../config/spots';
import { fetchMarine } from '../services/weather';
import type { MarineCurrent } from '../types';
import { cardinal } from '../lib/wind';
import { fmt, timeAgo } from '../lib/format';
import { WindArrow } from './WindArrow';

/** État de la mer au large (Open-Meteo Marine) pour les spots en mer. */
export function MarineCard({ spotId }: { spotId: string }) {
  const spot = SPOT_BY_ID[spotId];
  const [data, setData] = useState<{ m: MarineCurrent; at: number; stale: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spot?.marine) return;
    let alive = true;
    setData(null);
    setError(null);
    fetchMarine(spot.marine)
      .then((r) => alive && setData({ m: r.data, at: r.fetchedAt, stale: r.stale }))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [spot]);

  if (!spot?.marine) return null;
  return (
    <section className="card card-pad">
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-extrabold">
        <Waves className="h-5 w-5 text-lagoon-500" /> État de la mer
      </h2>
      <p className="mb-3 text-xs text-ink-700">
        Modèle de vagues Open-Meteo Marine, {spot.marine.label}. La baie est abritée par les digues : la mer y est généralement plus calme.
      </p>
      {error ? (
        <p className="text-sm text-rate-bad">Données de houle indisponibles : {error}</p>
      ) : !data ? (
        <div className="skeleton h-14" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-mint-50 p-3">
            <p className="label">Hauteur des vagues</p>
            <p className="tabular text-xl font-extrabold">{fmt(data.m.waveHeight, 1)} m</p>
          </div>
          <div className="rounded-xl bg-mint-50 p-3">
            <p className="label">Houle</p>
            <p className="tabular text-xl font-extrabold">{fmt(data.m.swellHeight, 1)} m</p>
          </div>
          <div className="rounded-xl bg-mint-50 p-3">
            <p className="label">Période</p>
            <p className="tabular text-xl font-extrabold">{fmt(data.m.wavePeriod, 0)} s</p>
          </div>
          <div className="rounded-xl bg-mint-50 p-3">
            <p className="label">Provenance</p>
            <p className="flex items-center gap-1 text-xl font-extrabold">
              <WindArrow deg={data.m.waveDirection} size={18} className="text-lagoon-500" /> {cardinal(data.m.waveDirection)}
            </p>
          </div>
          <p className="col-span-full text-[11px] text-ink-700/70">
            Récupéré {timeAgo(data.at)}
            {data.stale && ' (cache)'} · valeurs du modèle pour {data.m.time.slice(11, 16)}
          </p>
        </div>
      )}
    </section>
  );
}
