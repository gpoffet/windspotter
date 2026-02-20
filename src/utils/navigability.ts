import { dirText } from './windDirection';
import type { HourlyData, NavigableSlot, NavigabilityConfig } from '../types/forecast';

/**
 * Calculate navigable slots for a day's hourly data using the given config.
 * Only considers hours within [dayStartHour, dayEndHour).
 */
export function calculateSlots(
  hourly: HourlyData[],
  config: NavigabilityConfig,
): NavigableSlot[] {
  const validHours = hourly.filter(
    (h) => h.hour >= config.dayStartHour && h.hour < config.dayEndHour,
  );

  const slots: NavigableSlot[] = [];
  let runStart = -1;
  let runHours: HourlyData[] = [];

  for (const h of validHours) {
    const isNavigable =
      h.speed >= config.windSpeedMin &&
      h.gust >= config.gustMin;

    if (isNavigable) {
      if (runStart === -1) runStart = h.hour;
      runHours.push(h);
    } else {
      if (runHours.length >= config.minConsecutiveHours) {
        slots.push(buildSlot(runStart, runHours));
      }
      runStart = -1;
      runHours = [];
    }
  }

  if (runHours.length >= config.minConsecutiveHours) {
    slots.push(buildSlot(runStart, runHours));
  }

  return slots;
}

function buildSlot(startHour: number, hours: HourlyData[]): NavigableSlot {
  const avgSpeed = Math.round(
    hours.reduce((sum, h) => sum + h.speed, 0) / hours.length,
  );
  const avgGust = Math.round(
    hours.reduce((sum, h) => sum + h.gust, 0) / hours.length,
  );
  const avgDir = averageDirection(hours.map((h) => h.dir));

  return {
    start: startHour,
    end: hours[hours.length - 1].hour + 1,
    hours: hours.length,
    avgSpeed,
    avgGust,
    direction: dirText(avgDir),
  };
}

function averageDirection(directions: number[]): number {
  let sinSum = 0;
  let cosSum = 0;
  for (const deg of directions) {
    const rad = (deg * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  let avg = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
  if (avg < 0) avg += 360;
  return Math.round(avg);
}
