// =====================================================================
//  IMPORT GPX — lit un fichier .gpx (montre, appli GPS) dans le navigateur
//  et en tire distance, durée, vitesse max et un tracé simplifié.
//  Rien n'est envoyé tant que le rider ne publie pas sa session.
// =====================================================================

export interface GpxPoint {
  lat: number;
  lon: number;
  t: number | null; // ms
}

export interface GpxSummary {
  points: number;
  start: Date | null;
  end: Date | null;
  distanceKm: number;
  durationMin: number | null;
  /** Vitesse max lissée sur 10 s (nœuds), comme les applis de speedsurf. */
  maxSpeedKn: number | null;
  avgSpeedKn: number | null;
  /** Tracé simplifié, 400 points max : [lat, lon]. */
  track: [number, number][];
  /** Point de départ (pour proposer le spot le plus proche). */
  first: { lat: number; lon: number } | null;
}

const R = 6371.0088;
export function distKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function parseGpx(xml: string): GpxPoint[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('fichier GPX illisible.');
  // trkpt (traces) en priorité, sinon rtept / wpt
  let nodes = Array.from(doc.getElementsByTagName('trkpt'));
  if (!nodes.length) nodes = Array.from(doc.getElementsByTagName('rtept'));
  const pts: GpxPoint[] = [];
  for (const n of nodes) {
    const lat = Number(n.getAttribute('lat'));
    const lon = Number(n.getAttribute('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const timeEl = n.getElementsByTagName('time')[0];
    const t = timeEl?.textContent ? Date.parse(timeEl.textContent) : NaN;
    pts.push({ lat, lon, t: Number.isFinite(t) ? t : null });
  }
  if (pts.length < 2) throw new Error('aucun tracé trouvé dans ce fichier.');
  return pts;
}

/** Simplification par pas régulier (suffisant pour un aperçu sur la carte). */
function decimate(pts: GpxPoint[], max: number): [number, number][] {
  const step = Math.max(1, Math.ceil(pts.length / max));
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i += step) out.push([Math.round(pts[i].lat * 1e5) / 1e5, Math.round(pts[i].lon * 1e5) / 1e5]);
  const last = pts[pts.length - 1];
  if (out.length < max) out.push([Math.round(last.lat * 1e5) / 1e5, Math.round(last.lon * 1e5) / 1e5]);
  return out.slice(0, max);
}

export function summarizeGpx(pts: GpxPoint[]): GpxSummary {
  // Distance : on ignore les sauts GPS aberrants (> 35 m/s ≈ 68 nds)
  let dist = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = distKm(pts[i - 1], pts[i]);
    const a = pts[i - 1].t;
    const b = pts[i].t;
    if (a != null && b != null && b > a && (d * 1000) / ((b - a) / 1000) > 35) continue;
    dist += d;
  }

  const timed = pts.filter((p) => p.t != null) as (GpxPoint & { t: number })[];
  const start = timed.length ? new Date(timed[0].t) : null;
  const end = timed.length ? new Date(timed[timed.length - 1].t) : null;
  const durationMin = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;

  // Vitesse max sur 10 s glissantes
  let maxKn: number | null = null;
  if (timed.length > 2) {
    let j = 0;
    let acc = 0;
    const seg: number[] = [0];
    for (let i = 1; i < timed.length; i++) seg.push(distKm(timed[i - 1], timed[i]));
    for (let i = 1; i < timed.length; i++) {
      acc += seg[i];
      while (j < i && timed[i].t - timed[j].t > 10000) {
        j++;
        acc -= seg[j];
      }
      const dt = (timed[i].t - timed[j].t) / 1000;
      if (dt >= 8) {
        const kn = (acc * 1000) / dt / 0.514444;
        if (kn < 55 && (maxKn == null || kn > maxKn)) maxKn = kn;
      }
    }
  }
  const avg = durationMin && durationMin > 0 ? dist / (durationMin / 60) / 1.852 : null;

  return {
    points: pts.length,
    start,
    end,
    distanceKm: Math.round(dist * 10) / 10,
    durationMin,
    maxSpeedKn: maxKn != null ? Math.round(maxKn * 10) / 10 : null,
    avgSpeedKn: avg != null ? Math.round(avg * 10) / 10 : null,
    track: decimate(pts, 400),
    first: { lat: pts[0].lat, lon: pts[0].lon },
  };
}
