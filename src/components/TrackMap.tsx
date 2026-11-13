import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Carte d'un tracé GPS de session (chargée seulement à l'ouverture). */
export default function TrackMap({ track, className = 'h-64' }: { track: [number, number][]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || track.length < 2) return;
    const map = L.map(ref.current, { attributionControl: true, scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const line = L.polyline(track, { color: '#16A038', weight: 3 }).addTo(map);
    L.circleMarker(track[0], { radius: 6, color: '#fff', weight: 2, fillColor: '#22D24A', fillOpacity: 1 }).addTo(map).bindTooltip('Départ');
    L.circleMarker(track[track.length - 1], { radius: 6, color: '#fff', weight: 2, fillColor: '#0A120C', fillOpacity: 1 }).addTo(map).bindTooltip('Arrivée');
    map.fitBounds(line.getBounds().pad(0.1));
    return () => {
      map.remove();
    };
  }, [track]);
  return <div ref={ref} className={`w-full overflow-hidden rounded-xl ${className}`} />;
}
