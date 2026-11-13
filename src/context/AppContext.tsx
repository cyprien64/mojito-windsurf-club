import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ClubSettings, ModelRunInfo, SpotModels, SpotWeather } from '../types';
import { SPOTS, SPOT_BY_ID, DEFAULT_SPOT_ID } from '../config/spots';
import { buildDefaultSettings, REFRESH_INTERVAL_MS } from '../config/scoring';
import { fetchAllSpotsModels, fetchAllSpotsWeather, fetchModelRuns } from '../services/weather';
import {
  clearLocalSettings,
  fetchClubSettings,
  loadLocalSettings,
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
}

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
  const settings = localSettings ?? clubSettings ?? buildDefaultSettings();
  const settingsSource: SettingsSource = localSettings ? 'local' : clubSettings ? 'club' : 'default';

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

  const refresh = useCallback(() => load(true), [load]);

  // ---------- Évaluations ----------
  const evaluations = useMemo(() => {
    const out: Record<string, SpotEvaluation> = {};
    if (!weather.data) return out;
    for (const s of SPOTS) {
      const w = weather.data[s.id];
      if (!w) continue;
      out[s.id] = evaluateSpot(s.id, w, settings.spots[s.id] ?? s.defaults, settings, models.data?.[s.id]);
    }
    return out;
  }, [weather.data, models.data, settings]);

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
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp doit être utilisé dans <AppProvider>');
  return v;
}
