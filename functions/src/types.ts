// --- Water body types ---

export type WaterBodyType = 'lake' | 'sea' | 'ocean' | 'river' | 'quarry_lake' | 'pond' | 'other';

export interface WaterBody {
  id: string;
  name: string;
  type: WaterBodyType;
  alplakesId?: string;
  center?: { lat: number; lng: number };
  country: string;
  region?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// --- Webcam types ---

export interface SpotWebcam {
  webcamId: string;
  title: string;
}

// --- Firestore config documents ---

export interface SpotConfig {
  id: string;
  name: string;
  pointId: string;
  stationId: string;
  npa: number;
  lat: number;
  lon: number;
  lake: string;
  alplakesKey: string;
  waterBodyId?: string;
  webcams?: SpotWebcam[];
}

export interface NavigabilityConfig {
  windSpeedMin: number;
  windSpeedMax: number;
  gustMin: number;
  minConsecutiveHours: number;
  dayStartHour: number;
  dayEndHour: number;
  timezone: string;
}

// --- Forecast data written to Firestore ---

export interface HourlyData {
  hour: number;
  speed: number;
  gust: number;
  dir: number;
  dirText: string;
  sun: number;
}

export interface NavigableSlot {
  start: number;
  end: number;
  hours: number;
  avgSpeed: number;
  avgGust: number;
  direction: string;
}

export interface DayForecast {
  date: string; // YYYY-MM-DD
  sunshine: number; // hours
  isNavigable: boolean;
  slots: NavigableSlot[];
  hourly: HourlyData[];
}

export interface WaterTemp {
  current: number | null;
  depth: number;
}

export interface SpotForecast {
  name: string;
  pointId: string;
  npa: number;
  lat: number;
  lon: number;
  lake: string;
  waterBodyName?: string;
  waterTemp: WaterTemp;
  days: DayForecast[];
}

export interface ForecastDocument {
  updatedAt: FirebaseFirestore.Timestamp;
  csvTimestamp: string;
  spots: SpotForecast[];
}

// --- Internal parsing types ---

export interface RawHourlyEntry {
  timestamp: string; // YYYYMMDDHHmm UTC
  speed?: number;
  gust?: number;
  dir?: number;
  sun?: number;
}

export type MeteoParam = 'fu3010h0' | 'fu3010h1' | 'dkl010h0' | 'sre000h0';
