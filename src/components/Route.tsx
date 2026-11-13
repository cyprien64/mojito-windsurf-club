import { useState } from 'react';
import { Car, LocateFixed, MapPin, Navigation, X } from 'lucide-react';
import type { SpotDefinition } from '../types';
import { useApp } from '../context/AppContext';
import { formatDuration, geocodeCity, googleMapsUrl, locate, wazeEmbedUrl, wazeUrl } from '../services/routing';
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

/** Logo Waze simplifié (bulle souriante). */
function WazeIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3c5 0 8.5 3.3 8.5 7.6 0 3.2-2 5.2-4.2 6.1a2 2 0 0 1-3.8.6h-1.6a2 2 0 0 1-3.8-.4C5 16.3 3.5 14.6 3.5 12.6c.8 0 1.2-.5 1.2-1.6C4.7 6.4 8 3 12 3Z" fill="#fff" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9.6" cy="9.6" r="1" fill="currentColor" />
      <circle cx="14.6" cy="9.6" r="1" fill="currentColor" />
      <path d="M9.2 12.4c1.5 1.6 4.2 1.6 5.7 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Bouton principal : guidage Waze avec trafic en temps réel. */
export function WazeButton({ spot, className = '' }: { spot: SpotDefinition; className?: string }) {
  return (
    <a className={`btn !py-2 bg-[#33CCFF] text-[#0A1A2A] shadow-card hover:bg-[#5AD6FF] ${className}`} href={wazeUrl(spot.lat, spot.lon)} target="_blank" rel="noreferrer">
      <WazeIcon /> Y aller avec Waze
    </a>
  );
}

/** Section « Trajet » d'un spot. */
export function RouteCard({ spot }: { spot: SpotDefinition }) {
  const { origin, routes, routesLoading } = useApp();
  const [showTraffic, setShowTraffic] = useState(false);
  const r = routes[spot.id];
  return (
    <section className="card card-pad">
      <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold">
        <Car className="h-5 w-5 text-mint-600" /> Trajet jusqu’au spot
      </h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <WazeButton spot={spot} />
        <a className="btn-ghost !py-2" href={googleMapsUrl(spot.lat, spot.lon)} target="_blank" rel="noreferrer">
          <Navigation className="h-4 w-4" /> Google Maps
        </a>
        <button className="btn-ghost !py-2" onClick={() => setShowTraffic((v) => !v)} aria-expanded={showTraffic}>
          🚦 {showTraffic ? 'Masquer le trafic' : 'Trafic Waze en direct'}
        </button>
      </div>
      <p className="mb-3 text-xs text-ink-700">
        Waze calcule le <strong>temps de trajet réel avec le trafic</strong> depuis votre position dès l’ouverture du lien.
      </p>
      {showTraffic && (
        <div className="mb-3 overflow-hidden rounded-xl border border-mint-100">
          <iframe
            title={`Trafic Waze autour de ${spot.shortName}`}
            src={wazeEmbedUrl(spot.lat, spot.lon)}
            className="h-72 w-full sm:h-96"
            loading="lazy"
            allowFullScreen
          />
        </div>
      )}
      {!origin ? (
        <>
          <p className="label mb-1">Estimer le temps de route sur le site</p>
          <OriginPicker />
        </>
      ) : (
        <>
          {routesLoading && !r ? (
            <div className="skeleton h-16" />
          ) : r ? (
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="label">Temps de route estimé</p>
                <p className="tabular font-display text-3xl font-extrabold">{formatDuration(r.durationMin)}</p>
              </div>
              <div>
                <p className="label">Distance</p>
                <p className="tabular font-display text-3xl font-extrabold">
                  {fmt(r.distanceKm)} <span className="text-base">km</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-700">Estimation indisponible pour le moment.</p>
          )}
          <p className="mt-2 text-xs text-ink-700">
            {r?.estimated
              ? 'Estimation à vol d’oiseau (service d’itinéraire indisponible).'
              : 'Estimation sans trafic (OSRM / OpenStreetMap), utile pour comparer les spots. Pour le temps réel, ouvrez Waze.'}
          </p>
          <div className="mt-2">
            <OriginPicker compact />
          </div>
        </>
      )}
    </section>
  );
}
