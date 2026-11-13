import { Radio } from 'lucide-react';
import type { StationReading } from '../types';
import { cardinal, toKmh } from '../lib/wind';
import { fmt } from '../lib/format';
import { isFresh } from '../services/stations';
import { WindArrow } from './WindArrow';

const age = (m: number | null) => (m == null ? '—' : m < 1 ? 'à l’instant' : m < 60 ? `il y a ${m} min` : `il y a ${Math.round(m / 60)} h`);

/** Ligne compacte (cartes de spot). */
export function StationLine({ station }: { station: StationReading }) {
  const fresh = isFresh(station);
  return (
    <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${fresh ? 'text-ink-800' : 'text-ink-700/60'}`}>
      <Radio className={`h-3.5 w-3.5 ${fresh ? 'text-rate-good' : ''}`} />
      Balise : {fresh ? `${fmt(station.avg)} nds (max ${fmt(station.max)}) ${cardinal(station.heading)}` : 'pas de mesure récente'} · {age(station.ageMin)}
    </p>
  );
}

/** Carte détaillée « vent mesuré » + comparaison avec le modèle. */
export function StationCard({ stations, modelSpeed, modelDir, usedForScore }: { stations: StationReading[]; modelSpeed: number | null; modelDir: number | null; usedForScore: boolean }) {
  return (
    <section className="card card-pad">
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-extrabold">
        <Radio className="h-5 w-5 text-rate-good" /> Vent mesuré (balise)
      </h2>
      <p className="mb-3 text-xs text-ink-700">
        Mesures réelles du réseau Pioupiou / OpenWindMap. La balise n’est pas exactement sur le plan d’eau : altitude et exposition peuvent différer.
        {usedForScore ? ' Cette mesure est utilisée pour la note du spot (option activée par les admins).' : ' La note du spot reste calculée sur le modèle.'}
      </p>
      <div className="space-y-3">
        {stations.map((s) => {
          const fresh = isFresh(s);
          const diff = fresh && modelSpeed != null && s.avg != null ? s.avg - modelSpeed : null;
          return (
            <div key={s.id} className="rounded-xl border border-mint-100 bg-cream-50 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">{s.name}</p>
                <p className="text-xs text-ink-700">
                  {s.distanceKm != null && `à ${fmt(s.distanceKm, 1)} km · `}
                  {fresh ? <span className="font-bold text-rate-good">● en direct</span> : <span className="text-rate-mid">mesure ancienne ou balise hors ligne</span>} · {age(s.ageMin)}
                </p>
              </div>
              {s.avg != null && (
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-mint-50 p-2">
                    <p className="label">Moyen</p>
                    <p className="tabular text-2xl font-extrabold">{fmt(s.avg)}</p>
                    <p className="text-xs text-ink-700">nds · {fmt(toKmh(s.avg))} km/h</p>
                  </div>
                  <div className="rounded-lg bg-mint-50 p-2">
                    <p className="label">Rafale</p>
                    <p className="tabular text-2xl font-extrabold">{fmt(s.max)}</p>
                    <p className="text-xs text-ink-700">min {fmt(s.min)} nds</p>
                  </div>
                  <div className="rounded-lg bg-mint-50 p-2">
                    <p className="label">Direction</p>
                    <p className="flex items-center justify-center gap-1 text-2xl font-extrabold">
                      <WindArrow deg={s.heading} size={20} className="text-mint-700" /> {cardinal(s.heading)}
                    </p>
                    <p className="text-xs text-ink-700">{s.heading != null ? `${Math.round(s.heading)}°` : '—'}</p>
                  </div>
                </div>
              )}
              {diff != null && (
                <p className="mt-2 text-sm">
                  Modèle : {fmt(modelSpeed)} nds {cardinal(modelDir)} →{' '}
                  <strong className={Math.abs(diff) >= 4 ? 'text-rate-mid' : 'text-rate-good'}>
                    {Math.abs(diff) < 2 ? 'mesure et modèle concordent' : diff > 0 ? `la balise mesure ${fmt(diff)} nds de plus que le modèle` : `la balise mesure ${fmt(-diff)} nds de moins que le modèle`}
                  </strong>
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-ink-700/70">© contributeurs du réseau OpenWindMap · données Pioupiou (licence ouverte).</p>
    </section>
  );
}
