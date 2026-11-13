// Service webcams : accès à la configuration (src/config/webcams.ts).
import { NO_WEBCAM_NOTE, WEBCAMS } from '../config/webcams';
import type { Webcam } from '../types';

export function webcamsForSpot(spotId: string): Webcam[] {
  return WEBCAMS.filter((w) => w.spotIds.includes(spotId));
}

export function embeddableWebcams(spotId?: string): Webcam[] {
  return (spotId ? webcamsForSpot(spotId) : WEBCAMS).filter((w) => w.kind !== 'link');
}

export function noWebcamNote(spotId: string): string | null {
  return NO_WEBCAM_NOTE[spotId] ?? null;
}

/** Ajoute un paramètre anti-cache pour forcer le rechargement d'une image. */
export function bustUrl(url: string, ts: number): string {
  return url + (url.includes('?') ? '&' : '?') + `_t=${ts}`;
}
