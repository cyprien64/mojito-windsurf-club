import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { SpotDefinition } from '../types';
import { fetchGrau, type GrauSeries } from '../services/weather';
import { hourLabel } from '../lib/format';

type Flow = 'entrant' | 'sortant' | 'faible';

/**
 * Courant au grau, INDICATIF : quand la mer monte, l'eau entre dans l'étang ;
 * quand elle baisse, elle en sort. En Méditerranée la marée est faible
 * (quelques dizaines de cm) mais le vent et la pression la modifient.
 */
function flowAt(s: GrauSeries, i: number): { flow: Flow; cmPerH: number } | null {
  const a = s.level[i - 1];
  const b = s.level[i + 1];
  if (a == null || b == null) return null;
  const cmPerH = ((b - a) / 2) * 100;
  return { flow: cmPerH > 1 ? 'entrant' : cmPerH < -1 ? 'sortant' : 'faible', cmPerH };
}

const META: Record<Flow, { label: string; cls: string; Icon: typeof Minus }> = {
  entrant: { label: 'entrant', cls: 'bg-[#2F6FDE]/15 text-[#2F6FDE]', Icon: ArrowDownRight },
  sortant: { label: 'sortant', cls: 'bg-orange-100 text-orange-800', Icon: ArrowUpRight },
  faible: { label: 'faible', cls: 'bg-mint-50 text-ink-700', Icon: Minus },
};

export function GrauCard({ spot, nowIso }: { spot: SpotDefinition; nowIso: string }) {
  const [data, setData] = useState<GrauSeries | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!spot.grau) return;
    fetchGrau(spot.grau)
      .then((r) => setData(r.data))
      .catch(() => setError(true));
  }, [spot.grau]);
  if (!spot.grau) return null;

  const hourKey = nowIso.slice(0, 13) + ':00';
  const now = data ? Math.max(1, data.time.indexOf(hourKey)) : -1;
  const cur = data && now > 0 ? flowAt(data, now) : null;
  const next = data && now > 0 ? Array.from({ length: 12 }, (_, k) => now + k).filter((i) => i < data.time.length - 1) : [];

  return (
    <section className="card card-pad">
      <h2 className="mb-1 font-display text-lg font-extrabold">🌊 Courant au {spot.grau.name}</h2>
      {error ? (
        <p className="text-sm text-ink-700">Données indisponibles pour le moment.</p>
      ) : !data ? (
        <div className="skeleton h-16" />
      ) : (
        <>
          {cur && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              En ce moment :{' '}
              <span className={`chip ${META[cur.flow].cls}`}>
                {(() => {
                  const I = META[cur.flow].Icon;
                  return <I className="h-3.5 w-3.5" />;
                })()}
                courant {META[cur.flow].label}
              </span>
              <span className="text-ink-700">
                mer {cur.cmPerH >= 0 ? 'qui monte' : 'qui baisse'} de {Math.abs(cur.cmPerH).toFixed(1)} cm/h
                {data.level[now] != null && ` · niveau ${((data.level[now] as number) * 100).toFixed(0)} cm`}
              </span>
            </p>
          )}
          <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {next.map((i) => {
              const f = flowAt(data, i);
              if (!f) return null;
              const m = META[f.flow];
              return (
                <div key={data.time[i]} className="w-[64px] shrink-0 rounded-xl border border-mint-100 bg-cream-50 p-1.5 text-center">
                  <p className="text-[11px] font-bold text-ink-700">{hourLabel(data.time[i])}</p>
                  <span className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 ${m.cls}`}>
                    <m.Icon className="h-4 w-4" />
                  </span>
                  <p className="text-[11px] font-bold">{m.label}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-700">
            Indicatif : déduit de la montée ou de la baisse du niveau de la mer au large (Open-Meteo Marine). Le courant réel dans le grau dépend aussi du vent
            (la Tramontane vide l’étang, le vent marin le remplit) et de l’ouverture du grau. Ne naviguez jamais dans le chenal du grau.
          </p>
        </>
      )}
    </section>
  );
}
