import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Sun } from 'lucide-react';
import { weatherInfo } from '../lib/weatherCodes';

export function WeatherIcon({ code, isDay = true, className = 'h-5 w-5' }: { code: number | null | undefined; isDay?: boolean; className?: string }) {
  const { icon, label } = weatherInfo(code, isDay);
  const props = { className, 'aria-label': label };
  switch (icon) {
    case 'sun':
      return <Sun {...props} color="#EFD12B" />;
    case 'moon':
      return <Moon {...props} color="#1C4A3A" />;
    case 'cloud-sun':
      return <CloudSun {...props} color="#E5A50A" />;
    case 'fog':
      return <CloudFog {...props} color="#6B8F84" />;
    case 'drizzle':
      return <CloudDrizzle {...props} color="#1FB3A6" />;
    case 'rain':
      return <CloudRain {...props} color="#178F86" />;
    case 'snow':
      return <CloudSnow {...props} color="#5B9BD5" />;
    case 'storm':
      return <CloudLightning {...props} color="#8E44AD" />;
    default:
      return <Cloud {...props} color="#6B8F84" />;
  }
}
