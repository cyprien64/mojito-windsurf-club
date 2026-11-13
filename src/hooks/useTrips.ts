import { useCallback, useEffect, useState } from 'react';
import { backendEnabled, listTrips, type Trip } from '../services/backend';

/** Sorties prévues par les membres (« Qui y va ? »), rechargées toutes les 3 min. */
export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(backendEnabled);
  const reload = useCallback(async () => {
    if (!backendEnabled) return;
    try {
      setTrips(await listTrips());
      setError(null);
    } catch (e) {
      const m = (e as Error).message;
      setError(/trips/.test(m) ? 'La base n’est pas encore à jour : un admin doit relancer le script supabase/schema.sql.' : m);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
    const id = window.setInterval(reload, 3 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [reload]);
  return { trips, error, loading, reload };
}

/** Date locale AAAA-MM-JJ dans n jours. */
export function isoDay(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
