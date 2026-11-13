import { useState } from 'react';
import { Car, LocateFixed, MapPin, Navigation, X } from 'lucide-react';
import type { SpotDefinition } from '../types';
import { useApp } from '../context/AppContext';
import { formatDuration, geocodeCity, googleMapsUrl, locate, wazeUrl } from '../services/routing';
import { fmt } from '../lib/format';

/** Choix du point de départ : GPS ou ville. */
export function OriginPicker({ compact = false }: { compact?: boolean }) {
  const { origin, setOrigin } = useApp();
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await f();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (origin && compact) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-xs text-ink-700">
        <MapPin className="h-3.5 w-3.5" /> Départ : <strong>{origin.label}</strong>
        <button className="font-bold text-mint-700 underline" onClick={() => setOrigin(null)}>
          changer
        </button>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {origin ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-mint-700" /> Départ : <strong>{origin.label}</strong>
          <button className="inline-flex items-center gap-1 text-xs font-bold text-mint-700" onClick={() => setOrigin(null)}>
            <X className="h-3.5 w-3.5" /> effacer
          </button>
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary !py-2" disabled={busy} onClick={() => run(async () => setOrigin(await locate()))}>
          <LocateFixed className="h-4 w-4" /> {busy ? 'Localisation…' : 'Utiliser ma position'}
        </button>
        <span className="text-xs text-ink-700">ou</span>
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (city.trim()) run(async () => setOrigin(await geocodeCity(city.trim())));
          }}
        >
          <input className="input !py-2" placeholder="Ville de départ (ex. Pau)" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Ville de départ" />
          <button className="btn-ghost !py-2" disabled={busy || !city.trim()} type="submit">
            OK
          </button>
        </form>
      </div>
      {error && <p className="text-sm text-rate-bad">{error}</p>}
      <p className="text-[11px] text-ink-700/70">
        Votre position n’est envoyée qu’au service d’itinéraire libre OSRM (et à OpenStreetMap pour une ville), uniquement quand vous le demandez, et n’est
        gardée que sur cet appareil.
      </p>
    </div>
  );
}

/** Ligne compacte pour les cartes de spot. */
export function RouteLine({ spotId }: { spotId: string }) {
  const { routes } = useApp();
  const r = routes[spotId];
  if (!r) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-800">
      <Car className="h-3.5 w-3.5 text-mint-600" /> {formatDuration(r.durationMin)} · {fmt(r.distanceKm)} km{r.estimated && ' (estimation)'}
    </p>
  );
}

/** Section « Trajet » d'un spot. */
export function RouteCard({ spot }: { spot: SpotDefinition }) {
  const { origin, routes, routesLoading } = useApp();
  const r = routes[spot.id];
  return (
    <section className="card card-pad">
      <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold">
        <Car className="h-5 w-5 text-mint-600" /> Trajet jusqu’au spot
      </h2>
      {!origin ? (
        <OriginPicker />
      ) : (
        <>
          {routesLoading && !r ? (
            <div className="skeleton h-16" />
          ) : r ? (
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="label">Temps de route</p>
                <p className="tabular font-display text-3xl font-extrabold">{formatDuration(r.durationMin)}</p>
              </div>
              <div>
                <p className="label">Distance</p>
                <p className="tabular font-display text-3xl font-extrabold">
                  {fmt(r.distanceKm)} <span className="text-base">km</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn-primary !py-2" href={googleMapsUrl(spot.lat, spot.lon)} target="_blank" rel="noreferrer">
                  <Navigation className="h-4 w-4" /> Google Maps
                </a>
                <a className="btn-ghost !py-2" href={wazeUrl(spot.lat, spot.lon)} target="_blank" rel="noreferrer">
                  Waze
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-700">Trajet indisponible pour le moment.</p>
          )}
          <p className="mt-2 text-xs text-ink-700">
            {r?.estimated
              ? 'Estimation à vol d’oiseau (service d’itinéraire indisponible).'
              : 'Itinéraire en voiture calculé par OSRM (OpenStreetMap), sans trafic : prévoyez de la marge.'}
          </p>
          <div className="mt-2">
            <OriginPicker compact />
          </div>
        </>
      )}
    </section>
  );
}
