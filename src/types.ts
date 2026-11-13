// Types partagés de l'application Mojito Windsurf Club.

/** Classement d'un secteur de vent (rose des vents à 16 secteurs). */
export type SectorRating = 'ideal' | 'ok' | 'bad' | 'danger';

export interface SpeedThresholds {
  /** En dessous : vent trop faible pour naviguer (nœuds). */
  minRideable: number;
  /** Début de la plage idéale (nœuds). */
  idealMin: number;
  /** Fin de la plage idéale (nœuds). Au-delà : vent fort. */
  idealMax: number;
  /** Au-delà : vent excessif (nœuds) — avertissement de sécurité. */
  maxRideable: number;
}

export interface GustThresholds {
  /** Rafale maximale acceptable (nœuds). Au-delà : avertissement. */
  maxGust: number;
  /** Rapport rafale / vent moyen à partir duquel le vent est jugé très irrégulier. */
  maxGustFactor: number;
}

/** Paramètres nautiques d'un spot — modifiables depuis la page Admin. */
export interface SpotWindConfig {
  /** 16 secteurs, dans l'ordre N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSO, SO, OSO, O, ONO, NO, NNO. */
  sectors: SectorRating[];
  speed: SpeedThresholds;
  gusts: GustThresholds;
  /** Remarques des admins (restrictions locales, zones interdites, etc.). */
  notes: string;
  /** Utiliser la mesure de la balise (si récente) à la place du modèle pour le vent actuel. */
  useStation?: boolean;
}

export interface ScoringWeights {
  orientation: number;
  speed: number;
  regularity: number;
  gusts: number;
  trend: number;
  models: number;
}

export interface ClubSettings {
  version: 1;
  weights: ScoringWeights;
  /** Score horaire minimum (0-100) pour qu'une heure fasse partie d'un « bon créneau ». */
  windowThreshold: number;
  /** Ne proposer des créneaux qu'entre le lever et le coucher du soleil. */
  daylightOnly: boolean;
  spots: Record<string, SpotWindConfig>;
  updatedAt?: string;
}

export interface SpotPhoto {
  src: string;
  author: string;
  license: string;
  sourceUrl: string;
  caption: string;
}

/** Caractéristiques du plan d'eau — utilisées pour le conseil matériel. */
export interface WaterInfo {
  depth: 'très faible' | 'faible' | 'moyenne' | 'profonde';
  /** Algues fréquentes (aileron anti-algues conseillé). */
  weed: boolean;
  surface: 'plat' | 'clapot' | 'vagues';
  /** Pratique du foil (wing foil, windfoil). */
  foil: 'ok' | 'prudence' | 'déconseillé';
  foilNote: string;
}

export interface SpotDefinition {
  id: string;
  name: string;
  shortName: string;
  location: string;
  /** Noms alternatifs (orthographes rencontrées). */
  aka?: string[];
  kind: 'lac' | 'étang' | 'baie';
  lat: number;
  lon: number;
  /** D'où viennent les coordonnées (traçabilité). */
  coordSource: string;
  coordCheckedOn: string;
  photo?: SpotPhoto;
  /** Couleur d'accent de l'illustration de repli. */
  accent: string;
  /** Informations utiles affichées sur le dashboard. */
  info?: string;
  /** Plan d'eau (profondeur, algues, foil). */
  water: WaterInfo;
  /** Balises anémomètres Pioupiou / OpenWindMap proches (identifiants). */
  stations?: number[];
  /** Afficher les marées (spots soumis à la marée). */
  tides?: boolean;
  /** Point en mer pour les données de houle (Open-Meteo Marine), uniquement pour les spots en mer. */
  marine?: { lat: number; lon: number; label: string };
  /** Paramètres par défaut (avant personnalisation par les admins). */
  defaults: SpotWindConfig;
}

// ---------- Profil du rider (conseil matériel) ----------

export type RiderLevel = 'débutant' | 'intermédiaire' | 'confirmé' | 'expert';

export interface RiderProfile {
  weightKg: number;
  level: RiderLevel;
  /** Tailles de voiles possédées (m²), facultatif. */
  sails: number[];
  /** Tailles d'ailes de wing possédées (m²), facultatif. */
  wings: number[];
  /** Le rider pratique-t-il le wing foil ? */
  doesWing: boolean;
  /** Marques / modèles du matériel (pré-remplissent les retours de session). */
  sailBrand?: string;
  boardBrand?: string;
  wingBrand?: string;
  foilBoardBrand?: string;
  /** Matériel de foil (wing) : type d'aile avant, surface (cm²), mât (cm), marque / modèle. */
  foilType?: FoilType;
  foilFrontWing?: number | null;
  foilMast?: number | null;
  foilBrand?: string;
}

export type FoilType = 'polyvalent' | 'high-aspect' | 'surf' | 'downwind';

export interface MarineCurrent {
  time: string;
  waveHeight: number | null;
  waveDirection: number | null;
  wavePeriod: number | null;
  swellHeight: number | null;
}

// ---------- Données météo normalisées ----------

export interface CurrentWeather {
  time: string;
  temperature: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  cloudCover: number | null;
  pressure: number | null;
  windSpeed: number | null; // nœuds
  windDirection: number | null; // degrés
  windGusts: number | null; // nœuds
  weatherCode: number | null;
  isDay: boolean;
}

export interface HourlySeries {
  time: string[];
  temperature: (number | null)[];
  precipitation: (number | null)[];
  precipitationProbability: (number | null)[];
  cloudCover: (number | null)[];
  cloudLow: (number | null)[];
  cloudMid: (number | null)[];
  cloudHigh: (number | null)[];
  windSpeed: (number | null)[];
  windDirection: (number | null)[];
  windGusts: (number | null)[];
  weatherCode: (number | null)[];
}

export interface DailySeries {
  time: string[];
  sunrise: string[];
  sunset: string[];
  tempMax: (number | null)[];
  tempMin: (number | null)[];
  precipitationSum: (number | null)[];
  windMax: (number | null)[];
  gustMax: (number | null)[];
  windDirectionDominant: (number | null)[];
  weatherCode: (number | null)[];
  cloudMean: (number | null)[];
}

export interface SpotWeather {
  spotId: string;
  current: CurrentWeather;
  hourly: HourlySeries;
  daily: DailySeries;
  /** Index de l'heure courante dans hourly. */
  nowIndex: number;
  elevation: number | null;
}

export interface ModelSeries {
  modelId: string;
  time: string[];
  windSpeed: (number | null)[];
  windGusts: (number | null)[];
  windDirection: (number | null)[];
}

export interface SpotModels {
  spotId: string;
  models: ModelSeries[];
}

export interface ModelRunInfo {
  modelId: string;
  initTime: Date | null;
  availableTime: Date | null;
  error?: string;
}

export interface Fetched<T> {
  data: T;
  fetchedAt: number;
  /** true si les données viennent du cache après une erreur réseau. */
  stale: boolean;
}

// ---------- Webcams ----------

export type WebcamKind = 'iframe' | 'image' | 'link';

export interface Webcam {
  id: string;
  title: string;
  provider: string;
  kind: WebcamKind;
  /** iframe : URL du lecteur ; image : URL de l'image ; link : page externe. */
  url: string;
  /** Page source à créditer. */
  sourcePage: string;
  /** Spots concernés. */
  spotIds: string[];
  /** Distance / relation au spot, affichée à l'utilisateur. */
  proximity: string;
  /** Rafraîchissement automatique (secondes) — uniquement pour les images ou iframes qui le supportent. */
  refreshSeconds?: number;
  /** true si la source est une caméra panoramique / live ; sinon instantanés. */
  live: boolean;
}

export interface StationReading {
  provider: 'pioupiou';
  id: number;
  name: string;
  lat: number | null;
  lon: number | null;
  distanceKm: number | null;
  /** Date de la mesure (ISO, UTC). */
  time: string | null;
  ageMin: number | null;
  avg: number | null; // nœuds
  max: number | null;
  min: number | null;
  heading: number | null;
  online: boolean;
}

export interface TideEvent {
  time: string;
  type: 'haute' | 'basse';
  height: number;
}

export interface TideSeries {
  time: string[];
  height: (number | null)[];
  events: TideEvent[];
}
