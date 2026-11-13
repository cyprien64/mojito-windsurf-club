import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useSpotRoute } from '../hooks/useSpotRoute';
import { useGear } from '../hooks/useGear';
import { SpotPicker } from '../components/SpotPicker';
import { GearPanel, RiderForm } from '../components/Gear';
import { ErrorBox, LoadingBlock } from '../components/States';
import { SafetyNotice } from '../components/SafetyNotice';

export function GearPage() {
  const spot = useSpotRoute();
  const navigate = useNavigate();
  const { weather, refresh } = useApp();
  const { now, best } = useGear(spot.id);

  return (
    <div className="space-y-5">
      <SpotPicker value={spot.id} onChange={(id) => navigate(`/materiel/${id}`)} />
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Matériel · {spot.shortName}</h1>
        <p className="max-w-2xl text-sm text-ink-700">
          Taille de voile, volume de planche, aileron et matériel de wing foil conseillés selon le vent prévu, le plan d’eau et votre profil. Votre profil est
          enregistré sur cet appareil.
        </p>
      </section>

      <section className="card card-pad">
        <h2 className="mb-3 font-display text-lg font-extrabold">Mon profil</h2>
        <RiderForm />
      </section>

      {weather.error && !weather.data ? (
        <ErrorBox message={weather.error} onRetry={refresh} />
      ) : !now ? (
        <LoadingBlock rows={2} />
      ) : (
        <>
          {best && (
            <section className="card card-pad">
              <h2 className="mb-3 font-display text-lg font-extrabold">Pour le meilleur créneau</h2>
              <GearPanel advice={best} />
            </section>
          )}
          <section className="card card-pad">
            <h2 className="mb-3 font-display text-lg font-extrabold">Pour les conditions actuelles</h2>
            <GearPanel advice={now} />
          </section>
        </>
      )}
      <SafetyNotice />
    </div>
  );
}
