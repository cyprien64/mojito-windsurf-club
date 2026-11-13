// Codes météo WMO (Open-Meteo) → libellé FR + icône Lucide.
export type WeatherIconName = 'sun' | 'moon' | 'cloud-sun' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export function weatherInfo(code: number | null | undefined, isDay = true): { label: string; icon: WeatherIconName } {
  if (code == null) return { label: 'Indisponible', icon: 'cloud' };
  if (code === 0) return { label: 'Ciel clair', icon: isDay ? 'sun' : 'moon' };
  if (code <= 2) return { label: code === 1 ? 'Peu nuageux' : 'Partiellement nuageux', icon: 'cloud-sun' };
  if (code === 3) return { label: 'Couvert', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Brouillard', icon: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Bruine', icon: 'drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: code >= 80 ? 'Averses' : 'Pluie', icon: 'rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Neige', icon: 'snow' };
  if (code >= 95) return { label: 'Orage', icon: 'storm' };
  return { label: 'Variable', icon: 'cloud' };
}
