import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SPOTS } from '../config/spots';
import { useApp } from '../context/AppContext';
import { LEVEL_META } from '../lib/scoring';
import { cardinal } from '../lib/wind';
import { isFresh } from '../services/stations';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export function MapPage() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const { evaluations, stations } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.fitBounds(L.latLngBounds(SPOTS.map((s) => [s.lat, s.lon] as [number, number])).pad(0.15));
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    // lien « Voir le spot » dans les popups
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[data-spot]') as HTMLAnchorElement | null;
      if (a) {
        e.preventDefault();
        navigate(`/conditions/${a.dataset.spot}`);
      }
    };
    ref.current.addEventListener('click', onClick);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [navigate]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const s of SPOTS) {
      const ev = evaluations[s.id];
      const color = ev ? LEVEL_META[ev.level].color : '#9DB8AE';
      const m = L.circleMarker([s.lat, s.lon], { radius: 13, color: '#fff', weight: 3, fillColor: color, fillOpacity: 0.95 }).addTo(layer);
      m.bindTooltip(`${esc(s.shortName)}${ev ? ` · ${ev.score}` : ''}`, { permanent: true, direction: 'top', offset: [0, -12], className: 'font-bold' });
      m.bindPopup(
        `<div style="min-width:180px"><strong>${esc(s.name)}</strong><br/>` +
          (ev
            ? `${Math.round(ev.speed ?? 0)} nds ${cardinal(ev.dir)} · rafales ${Math.round(ev.gust ?? 0)} nds<br/>${LEVEL_META[ev.level].label} (${ev.score}/100)<br/>`
            : 'Chargement…<br/>') +
          `<a href="#" data-spot="${s.id}" style="font-weight:700;color:#1E8F60">Voir le spot →</a></div>`,
      );
      for (const st of stations[s.id] ?? []) {
        if (st.lat == null || st.lon == null) continue;
        L.circleMarker([st.lat, st.lon], { radius: 6, color: '#0B2A20', weight: 2, fillColor: isFresh(st) ? '#3DBE6A' : '#9DB8AE', fillOpacity: 1 })
          .bindTooltip(`Balise ${esc(st.name)} : ${isFresh(st) ? `${Math.round(st.avg ?? 0)} nds ${cardinal(st.heading)}` : 'pas de mesure récente'}`)
          .addTo(layer);
      }
    }
  }, [evaluations, stations]);

  return (
    <div className="space-y-4">
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Carte des spots</h1>
        <p className="text-sm text-ink-700">Couleur = navigabilité actuelle. Petits points = balises de vent réel (vert : mesure récente).</p>
      </section>
      <div ref={ref} className="h-[65vh] w-full overflow-hidden rounded-2xl border border-mint-100 shadow-card" style={{ zIndex: 0 }} />
    </div>
  );
}
