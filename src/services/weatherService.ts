import type { Spot, WindForecast } from '../types/spot';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

export async function fetchSpotForecast(spot: Spot): Promise<WindForecast[]> {
  const params = new URLSearchParams({
    latitude: spot.latitude.toString(),
    longitude: spot.longitude.toString(),
    hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,weather_code',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    forecast_days: '3',
  });

  const response = await fetch(`${OPEN_METEO_BASE}?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch forecast for ${spot.name}`);
  }

  const data = await response.json();
  const { hourly } = data;

  const forecasts: WindForecast[] = hourly.time.map(
    (time: string, i: number) => ({
      timestamp: time,
      windSpeed: hourly.wind_speed_10m[i],
      windGust: hourly.wind_gusts_10m[i],
      windDirection: hourly.wind_direction_10m[i],
      temperature: hourly.temperature_2m[i],
      weatherCode: hourly.weather_code[i],
    })
  );

  return forecasts;
}
