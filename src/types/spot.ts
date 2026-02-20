export interface Spot {
  id: string;
  name: string;
  location: string;
  country: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export interface WindForecast {
  timestamp: string;
  windSpeed: number;       // km/h
  windGust: number;        // km/h
  windDirection: number;   // degrees (0-360)
  temperature: number;     // °C
  weatherCode: number;
}

export interface SpotForecast {
  spot: Spot;
  forecasts: WindForecast[];
  updatedAt: string;
}
