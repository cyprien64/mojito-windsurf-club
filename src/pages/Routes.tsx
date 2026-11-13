import { Link } from 'react-router-dom';
import { Car, Navigation } from 'lucide-react';
import { SPOTS } from '../config/spots';
import { useApp } from '../context/AppContext';
import { OriginPicker } from '../components/Route';
import { RatingBadge } from '../components/RatingBadge';
import { formatDuration, googleMapsUrl } from '../services/routing';
import { fmt, hhmm } from '../lib/format';

export function RoutesPage() {
  const { origin, routes, routesLoading, evaluations } = useApp();
  const list = SPOTS.map((s) => ({ spot: s, r: routes[s.id], ev: evaluations[s.id] })).sort(
    (a, b) => (a.r?.durationMin ?? 1e9) - (b.r?.durationMin ?? 1e9),
  );
  return (
    <div className="space-y-5">
      <section>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <Car className="h-7 w-7 text-mint-600" /> Trajets
        </h1>
        <p className="text-sm text-ink-700">Distance et temps de route jusqu’à chaque spot depuis votre position, avec les conditions du moment.</p>
      </section>
      <section className="card card-pad">
        <OriginPicker />
      </section>
      {origin && (
        <section className="card overflow-hidden">
          <ul className="divide-y divide-mint-100">
            {list.map(({ spot, r, ev }) => (
              <li key={spot.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/conditions/${spot.id}`} className="font-bold hover:underline">
                    {spot.name}
                  </Link>
                  <p className="text-xs text-ink-700">
                    {ev?.bestWindow ? `Meilleur créneau ${hhmm(ev.bestWindow.start)} – ${hhmm(ev.bestWindow.end)}` : 'Pas de bon créneau dans les 48 h'}
                  </p>
                </div>
                {ev && <RatingBadge level={ev.level} size="sm" label={`${ev.score}/100`} />}
                <div className="w-28 text-right">
                  {r ? (
                    <>
                      <p className="tabular text-lg font-extrabold leading-none">{formatDuration(r.durationMin)}</p>
                      <p className="tabular text-xs text-ink-700">
                        {fmt(r.distanceKm)} km{r.estimated && ' (est.)'}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-ink-700">{routesLoading ? 'calcul…' : '—'}</p>
                  )}
                </div>
                <a className="grid h-9 w-9 place-items-center rounded-full bg-mint-600 text-white" href={googleMapsUrl(spot.lat, spot.lon)} target="_blank" rel="noreferrer" aria-label={`Itinéraire vers ${spot.name}`}>
                  <Navigation className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
