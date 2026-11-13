// Modèles météo comparés (API Open-Meteo).
// `id` = valeur du paramètre `models` de l'API.
// `metaId` = identifiant utilisé par https://api.open-meteo.com/data/{metaId}/static/meta.json
// pour connaître l'heure du dernier run.

export interface WeatherModel {
  id: string;
  label: string;
  provider: string;
  resolution: string;
  horizon: string;
  color: string;
  metaId: string | null;
  description: string;
}

export const WEATHER_MODELS: WeatherModel[] = [
  {
    id: 'ecmwf_ifs025',
    label: 'ECMWF IFS',
    provider: 'Centre européen (ECMWF)',
    resolution: '~25 km',
    horizon: '15 j',
    color: '#0F7A43',
    metaId: 'ecmwf_ifs025',
    description: 'Modèle global de référence européen.',
  },
  {
    id: 'gfs_seamless',
    label: 'GFS',
    provider: 'NOAA (États-Unis)',
    resolution: '~13–25 km',
    horizon: '16 j',
    color: '#2F6FDE',
    metaId: 'ncep_gfs025',
    description: 'Modèle global américain.',
  },
  {
    id: 'icon_seamless',
    label: 'ICON',
    provider: 'DWD (Allemagne)',
    resolution: '~7–13 km',
    horizon: '7,5 j',
    color: '#E58A1F',
    metaId: 'dwd_icon',
    description: 'ICON global + ICON-EU combinés (seamless).',
  },
  {
    id: 'icon_eu',
    label: 'ICON-EU',
    provider: 'DWD (Allemagne)',
    resolution: '~7 km',
    horizon: '5 j',
    color: '#B5651D',
    metaId: 'dwd_icon_eu',
    description: 'Version régionale Europe d’ICON.',
  },
  {
    id: 'meteofrance_arpege_europe',
    label: 'ARPEGE',
    provider: 'Météo-France',
    resolution: '~11 km',
    horizon: '4 j',
    color: '#8E44AD',
    metaId: 'meteofrance_arpege_europe',
    description: 'Modèle de Météo-France, domaine Europe.',
  },
  {
    id: 'meteofrance_arome_france_hd',
    label: 'AROME HD',
    provider: 'Météo-France',
    resolution: '~1,5 km',
    horizon: '~2 j',
    color: '#E5484D',
    metaId: 'meteofrance_arome_france_hd',
    description: 'Modèle haute résolution de Météo-France : idéal pour les effets locaux à courte échéance.',
  },
];

export const MODEL_BY_ID: Record<string, WeatherModel> = Object.fromEntries(WEATHER_MODELS.map((m) => [m.id, m]));
