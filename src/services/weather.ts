// Service météo — API Open-Meteo (https://open-meteo.com), gratuite et sans clé
// pour un usage non commercial. Toutes les vitesses sont demandées en nœuds.

import type { CurrentWeather, DailySeries, Fetched, HourlySeries, ModelRunInfo, SpotDefinition, SpotModels, SpotWeather } from '../types';
import { cached } from './cache';
import { FORECAST_TTL_MS, MODELS_TTL_MS } from '../config/scoring';
import { WEATHER_MODELS } from '../config/models';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEZONE = 'Europe/Paris';

/** Nombre de jours passés récupérés (historique modélisé). */
export const PAST_DAYS = 7;
export const FORECAST_DAYS = 7;

export class WeatherApiError extends Error {}

async function getJson(url: string): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new WeatherApiError('Connexion à Open-Meteo impossible (réseau indisponible ?).');
  }
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok || body?.error) {
    const reason = body?.reason ? ` : ${body.reason}` : '';
    if (res.status === 429) throw new WeatherApiError('Limite d’appels Open-Meteo atteinte, réessayez plus tard.');
    throw new WeatherApiError(`Erreur Open-Meteo (${res.status})${reason}`);
  }
  return body;
}

const CURRENT_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'weather_code',
  'is_day',
];
const HOURLY_VARS = [
  'temperature_2m',
  'precipitation',
  'precipitation_probability',
  'cloud_cover',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'weather_code',
];
const DAILY_VARS = [
  'sunrise',
  'sunset',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'wind_direction_10m_dominant',
  'weather_code',
];

const arr = (v: unknown, n: number): (number | null)[] => (Array.isArray(v) ? (v as (number | null)[]) : new Array(n).fill(null));
const num = (v: unknown): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

function parseLocation(spotId: string, d: any): SpotWeather {
  const c = d.current ?? {};
  const current: CurrentWeather = {
    time: c.time ?? '',
    temperature: num(c.temperature_2m),
    apparentTemperature: num(c.apparent_temperature),
    humidity: num(c.relative_humidity_2m),
    precipitation: num(c.precipitation),
    cloudCover: num(c.cloud_cover),
    pressure: num(c.pressure_msl),
    windSpeed: num(c.wind_speed_10m),
    windDirection: num(c.wind_direction_10m),
    windGusts: num(c.wind_gusts_10m),
    weatherCode: num(c.weather_code),
    isDay: c.is_day !== 0,
  };
  const h = d.hourly ?? {};
  const time: string[] = h.time ?? [];
  const n = time.length;
  const hourly: HourlySeries = {
    time,
    temperature: arr(h.temperature_2m, n),
    precipitation: arr(h.precipitation, n),
    precipitationProbability: arr(h.precipitation_probability, n),
    cloudCover: arr(h.cloud_cover, n),
    windSpeed: arr(h.wind_speed_10m, n),
    windDirection: arr(h.wind_direction_10m, n),
    windGusts: arr(h.wind_gusts_10m, n),
    weatherCode: arr(h.weather_code, n),
  };
  const dd = d.daily ?? {};
  const dt: string[] = dd.time ?? [];
  const m = dt.length;
  const daily: DailySeries = {
    time: dt,
    sunrise: dd.sunrise ?? [],
    sunset: dd.sunset ?? [],
    tempMax: arr(dd.temperature_2m_max, m),
    tempMin: arr(dd.temperature_2m_min, m),
    precipitationSum: arr(dd.precipitation_sum, m),
    windMax: arr(dd.wind_speed_10m_max, m),
    gustMax: arr(dd.wind_gusts_10m_max, m),
    windDirectionDominant: arr(dd.wind_direction_10m_dominant, m),
    weatherCode: arr(dd.weather_code, m),
  };
  const hourKey = current.time ? current.time.slice(0, 13) + ':00' : '';
  let nowIndex = time.indexOf(hourKey);
  if (nowIndex < 0) nowIndex = Math.min(PAST_DAYS * 24, Math.max(0, n - 1));
  return { spotId, current, hourly, daily, nowIndex, elevation: num(d.elevation) };
}

/**
 * Récupère en UN appel les conditions actuelles, l'historique récent (7 j)
 * et les prévisions (7 j) de tous les spots. Mis en cache 15 min.
 */
export async function fetchAllSpotsWeather(spots: SpotDefinition[], force = false): Promise<Fetched<Record<string, SpotWeather>>> {
  const key = `forecast:v1:${spots.map((s) => `${s.id}@${s.lat},${s.lon}`).join('|')}`;
  return cached(
    key,
    FORECAST_TTL_MS,
    async () => {
      const params = new URLSearchParams({
        latitude: spots.map((s) => s.lat).join(','),
        longitude: spots.map((s) => s.lon).join(','),
        current: CURRENT_VARS.join(','),
        hourly: HOURLY_VARS.join(','),
        daily: DAILY_VARS.join(','),
        wind_speed_unit: 'kn',
        timezone: TIMEZONE,
        past_days: String(PAST_DAYS),
        forecast_days: String(FORECAST_DAYS),
      });
      const body = await getJson(`${FORECAST_URL}?${params}`);
      const list: any[] = Array.isArray(body) ? body : [body];
      const out: Record<string, SpotWeather> = {};
      spots.forEach((s, i) => {
        if (list[i]) out[s.id] = parseLocation(s.id, list[i]);
      });
      return out;
    },
    force,
  );
}

/**
 * Vent horaire de chaque modèle (ECMWF, GFS, ICON, ARPEGE, AROME…) pour tous les spots.
 * Les valeurs nulles signifient que le modèle ne couvre pas cette échéance.
 */
export async function fetchAllSpotsModels(spots: SpotDefinition[], force = false): Promise<Fetched<Record<string, SpotModels>>> {
  const modelIds = WEATHER_MODELS.map((m) => m.id);
  const key = `models:v1:${modelIds.join(',')}:${spots.map((s) => `${s.lat},${s.lon}`).join('|')}`;
  return cached(
    key,
    MODELS_TTL_MS,
    async () => {
      const params = new URLSearchParams({
        latitude: spots.map((s) => s.lat).join(','),
        longitude: spots.map((s) => s.lon).join(','),
        hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m',
        models: modelIds.join(','),
        wind_speed_unit: 'kn',
        timezone: TIMEZONE,
        forecast_days: String(FORECAST_DAYS),
      });
      const body = await getJson(`${FORECAST_URL}?${params}`);
      const list: any[] = Array.isArray(body) ? body : [body];
      const out: Record<string, SpotModels> = {};
      spots.forEach((s, i) => {
        const h = list[i]?.hourly;
        if (!h) return;
        const time: string[] = h.time ?? [];
        out[s.id] = {
          spotId: s.id,
          models: modelIds.map((id) => ({
            modelId: id,
            time,
            windSpeed: arr(h[`wind_speed_10m_${id}`], time.length),
            windGusts: arr(h[`wind_gusts_10m_${id}`], time.length),
            windDirection: arr(h[`wind_direction_10m_${id}`], time.length),
          })),
        };
      });
      return out;
    },
    force,
  );
}

/** Heure du dernier run de chaque modèle (métadonnées publiques Open-Meteo). */
export async function fetchModelRuns(force = false): Promise<Fetched<ModelRunInfo[]>> {
  return cached(
    'model-runs:v1',
    MODELS_TTL_MS,
    async () =>
      Promise.all(
        WEATHER_MODELS.map(async (m): Promise<ModelRunInfo> => {
          if (!m.metaId) return { modelId: m.id, initTime: null, availableTime: null, error: 'non publié' };
          try {
            const meta = await getJson(`https://api.open-meteo.com/data/${m.metaId}/static/meta.json`);
            return {
              modelId: m.id,
              initTime: meta.last_run_initialisation_time ? new Date(meta.last_run_initialisation_time * 1000) : null,
              availableTime: meta.last_run_availability_time ? new Date(meta.last_run_availability_time * 1000) : null,
            };
          } catch (e) {
            return { modelId: m.id, initTime: null, availableTime: null, error: (e as Error).message };
          }
        }),
      ),
    force,
  ).then((r) => ({
    ...r,
    // Les Date sont sérialisées en chaîne dans le cache : on les reconstruit.
    data: r.data.map((x) => ({
      ...x,
      initTime: x.initTime ? new Date(x.initTime) : null,
      availableTime: x.availableTime ? new Date(x.availableTime) : null,
    })),
  }));
}
