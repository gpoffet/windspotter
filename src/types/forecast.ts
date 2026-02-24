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
  createdAt: { toMillis: () => number };
  updatedAt: { toMillis: () => number };
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

export interface CurrentWeather {
  temp: number | null;
  windSpeed: number | null;
  windGust: number | null;
  windDir: number | null;
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

// --- Forecast data from Firestore ---

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
  date: string;
  sunshine: number;
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

export interface ForecastData {
  updatedAt: { toMillis: () => number }; // Firestore Timestamp
  csvTimestamp: string;
  spots: SpotForecast[];
}
