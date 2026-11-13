import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ClubSettings, ModelRunInfo, RiderProfile, SpotModels, SpotWeather, StationReading } from '../types';
import { fetchStations, isFresh, withContext } from '../services/stations';
import { fetchRoutes, loadOrigin, saveOrigin, type Origin, type RouteInfo } from '../services/routing';
import { backendEnabled, fetchRemoteSettings, listReports, type SessionReport } from '../services/backend';
import { DEFAULT_RIDER } from '../lib/gear';
import { SPOTS, SPOT_BY_ID, DEFAULT_SPOT_ID } from '../config/spots';
import { buildDefaultSettings, REFRESH_INTERVAL_MS } from '../config/scoring';
import { fetchAllSpotsModels, fetchAllSpotsWeather, fetchModelRuns } from '../services/weather';
import {
  clearLocalSettings,
  fetchClubSettings,
  loadLocalSettings,
  normalizeSettings,
  saveLocalSettings,
  type SettingsSource,
} from '../services/settings';
import { evaluateSpot, rankEvaluations, type SpotEvaluation } from '../lib/scoring';
import { dispatchAlerts, evaluateRules, loadRules } from '../services/notifications';

interface LoadState<T> {
  data: T | null;
  fetchedAt: number | null;
  stale: boolean;
  loading: boolean;
  error: string | null;
}

const emptyState = <T,>(): LoadState<T> => ({ data: null, fetchedAt: null, stale: false, loading: true, error: null });

interface AppContextValue {
  settings: ClubSettings;
  settingsSource: SettingsSource;
  clubSettings: ClubSettings | null;
  saveSettings: (s: ClubSettings) => void;
  resetSettings: () => void;

  weather: LoadState<Record<string, SpotWeather>>;
  models: LoadState<Record<string, SpotModels>>;
  runs: LoadState<ModelRunInfo[]>;
  refresh: () => void;

  evaluations: Record<string, SpotEvaluation>;
  ranking: SpotEvaluation[];

  spotId: string;
  setSpotId: (id: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  rider: RiderProfile;
  setRider: (r: RiderProfile) => void;

  /** Balises proches de chaque spot, triées par distance. */
  stations: Record<string, StationReading[]>;
  theme: Theme;
  setTheme: (t: Theme) => void;
  remoteSettings: ClubSettings | null;
  reloadRemoteSettings: () => void;
  reports: SessionReport[];
  reportsError: string | null;
  reloadReports: () => void;
  /** Point de départ choisi par l'utilisateur (stocké sur l'appareil uniquement). */
  origin: Origin | null;
  setOrigin: (o: Origin | null) => void;
  routes: Record<string, RouteInfo>;
  routesLoading: boolean;
}

export type Theme = 'auto' | 'light' | 'dark';

const Ctx = createContext<AppContextValue | null>(null);

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  // ---------- Paramètres ----------
  const [localSettings, setLocalSettings] = useState<ClubSettings | null>(() => loadLocalSettings());
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null);
  useEffect(() => {
    fetchClubSettings().then(setClubSettings);
  }, []);
  const [remoteSettings, setRemoteSettings] = useState<ClubSettings | null>(null);
  const reloadRemoteSettings = useCallback(() => {
    if (!backendEnabled) return;
    fetchRemoteSettings()
      .then((r) => setRemoteSettings(r ? normalizeSettings(r.data) : null))
      .catch(() => undefined);
  }, []);
  useEffect(reloadRemoteSettings, [reloadRemoteSettings]);
  const settings = localSettings ?? remoteSettings ?? clubSettings ?? buildDefaultSettings();
  const settingsSource: SettingsSource = localSettings ? 'local' : remoteSettings ? 'remote' : clubSettings ? 'club' : 'default';

  const saveSettings = useCallback((s: ClubSettings) => {
    saveLocalSettings(s);
    setLocalSettings(s);
  }, []);
  const resetSettings = useCallback(() => {
    clearLocalSettings();
    setLocalSettings(null);
  }, []);

  // ---------- Données ----------
  const [weather, setWeather] = useState(emptyState<Record<string, SpotWeather>>);
  const [models, setModels] = useState(emptyState<Record<string, SpotModels>>);
  const [runs, setRuns] = useState(emptyState<ModelRunInfo[]>);

  const load = useCallback((force: boolean) => {
    setWeather((s) => ({ ...s, loading: true }));
    fetchAllSpotsWeather(SPOTS, force)
      .then((r) => setWeather({ data: r.data, fetchedAt: r.fetchedAt, stale: r.stale, loading: false, error: r.stale ? 'Données en cache : la dernière actualisation a échoué.' : null }))
      .catch((e: Error) => setWeather((s) => ({ ...s, loading: false, error: e.message })));

    setModels((s) => ({ ...s, loading: true }));
    fetchAllSpotsModels(SPOTS, force)
      .then((r) => setModels({ data: r.data, fetchedAt: r.fetchedAt, stale: r.stale, loading: false, error: r.stale ? 'Données en cache : la dernière actualisation a échoué.' : null }))
      .catch((e: Error) => setModels((s) => ({ ...s, loading: false, error: e.message })));

    fetchModelRuns(force)
      .then((r) => setRuns({ data: r.data, fetchedAt: r.fetchedAt, stale: r.stale, loading: false, error: null }))
      .catch((e: Error) => setRuns((s) => ({ ...s, loading: false, error: e.message })));
  }, []);

  useEffect(() => {
    load(false);
    const id = window.setInterval(() => load(false), REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // ---------- Balises (vent mesuré) ----------
  const [rawStations, setRawStations] = useState<Record<number, StationReading>>({});
  const [stationTick, setStationTick] = useState(0);
  const loadStations = useCallback((force: boolean) => {
    const ids = SPOTS.flatMap((s) => s.stations ?? []);
    if (!ids.length) return;
    fetchStations(ids, force).then((r) => {
      setRawStations(r);
      setStationTick((t) => t + 1);
    });
  }, []);
  useEffect(() => {
    loadStations(false);
    const id = window.setInterval(() => loadStations(false), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [loadStations]);
  const stations = useMemo(() => {
    const out: Record<string, StationReading[]> = {};
    for (const s of SPOTS) {
      out[s.id] = (s.stations ?? [])
        .map((id) => rawStations[id])
        .filter((x): x is StationReading => !!x)
        .map((x) => withContext(x, s.lat, s.lon))
        .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawStations, stationTick]);

  const refresh = useCallback(() => {
    load(true);
    loadStations(true);
  }, [load, loadStations]);

  // ---------- Évaluations ----------
  const evaluations = useMemo(() => {
    const out: Record<string, SpotEvaluation> = {};
    if (!weather.data) return out;
    for (const s of SPOTS) {
      let w = weather.data[s.id];
      if (!w) continue;
      const cfg = settings.spots[s.id] ?? s.defaults;
      const st = stations[s.id]?.[0];
      const useStation = !!cfg.useStation && !!st && isFresh(st);
      if (useStation && st) {
        // Vent actuel remplacé par la mesure réelle de la balise (option Admin).
        w = { ...w, current: { ...w.current, windSpeed: st.avg, windGusts: st.max ?? w.current.windGusts, windDirection: st.heading ?? w.current.windDirection } };
      }
      const ev = evaluateSpot(s.id, w, cfg, settings, models.data?.[s.id]);
      ev.windSource = useStation ? 'balise' : 'modèle';
      out[s.id] = ev;
    }
    return out;
  }, [weather.data, models.data, settings, stations]);

  const ranking = useMemo(() => rankEvaluations(Object.values(evaluations)), [evaluations]);

  // Alertes (si activées par l'utilisateur)
  const lastAlertRun = useRef(0);
  useEffect(() => {
    if (!ranking.length || weather.fetchedAt === lastAlertRun.current) return;
    lastAlertRun.current = weather.fetchedAt ?? 0;
    const alerts = evaluateRules(loadRules(), ranking, (id) => SPOT_BY_ID[id]?.shortName ?? id);
    dispatchAlerts(alerts).catch(() => undefined);
  }, [ranking, weather.fetchedAt]);

  // ---------- Spot courant & favoris ----------
  const [spotId, setSpotIdState] = useState<string>(() => {
    const v = readLS<string>('mwc-spot', DEFAULT_SPOT_ID);
    return SPOT_BY_ID[v] ? v : DEFAULT_SPOT_ID;
  });
  const setSpotId = useCallback((id: string) => {
    if (!SPOT_BY_ID[id]) return;
    setSpotIdState(id);
    writeLS('mwc-spot', id);
  }, []);

  const [favorites, setFavorites] = useState<string[]>(() => readLS<string[]>('mwc-favorites', []));
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      writeLS('mwc-favorites', next);
      return next;
    });
  }, []);

  // ---------- Profil du rider (conseil matériel) ----------
  const [rider, setRiderState] = useState<RiderProfile>(() => ({ ...DEFAULT_RIDER, ...readLS<Partial<RiderProfile>>('mwc-rider', {}) }));
  const setRider = useCallback((r: RiderProfile) => {
    setRiderState(r);
    writeLS('mwc-rider', r);
  }, []);

  // ---------- Thème ----------
  const [theme, setThemeState] = useState<Theme>(() => readLS<Theme>('mwc-theme-v', 'auto'));
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'auto' && mq.matches));
    apply();
    try {
      localStorage.setItem('mwc-theme', theme);
    } catch {
      /* ignore */
    }
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    writeLS('mwc-theme-v', t);
  }, []);

  // ---------- Retours de session des membres ----------
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const reloadReports = useCallback(() => {
    if (!backendEnabled) return;
    listReports()
      .then((r) => {
        setReports(r);
        setReportsError(null);
      })
      .catch((e: Error) => setReportsError(e.message));
  }, []);
  useEffect(() => {
    reloadReports();
    const id = window.setInterval(reloadReports, 3 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [reloadReports]);

  // ---------- Trajets ----------
  const [origin, setOriginState] = useState<Origin | null>(() => loadOrigin());
  const [routes, setRoutes] = useState<Record<string, RouteInfo>>({});
  const [routesLoading, setRoutesLoading] = useState(false);
  const setOrigin = useCallback((o: Origin | null) => {
    saveOrigin(o);
    setOriginState(o);
    if (!o) setRoutes({});
  }, []);
  useEffect(() => {
    if (!origin) return;
    let alive = true;
    setRoutesLoading(true);
    fetchRoutes(origin, SPOTS)
      .then((r) => alive && setRoutes(r))
      .finally(() => alive && setRoutesLoading(false));
    return () => {
      alive = false;
    };
  }, [origin]);

  const value: AppContextValue = {
    settings,
    settingsSource,
    clubSettings,
    saveSettings,
    resetSettings,
    weather,
    models,
    runs,
    refresh,
    evaluations,
    ranking,
    spotId,
    setSpotId,
    favorites,
    toggleFavorite,
    rider,
    setRider,
    stations,
    theme,
    setTheme,
    remoteSettings,
    reloadRemoteSettings,
    reports,
    reportsError,
    reloadReports,
    origin,
    setOrigin,
    routes,
    routesLoading,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp doit être utilisé dans <AppProvider>');
  return v;
}
