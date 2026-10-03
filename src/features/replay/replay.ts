import type { LocationPoint } from '@/api/types';

export function interpolate(points: LocationPoint[], at: number): LocationPoint | null {
  if (!points.length) return null;
  if (points.length === 1 || at <= Date.parse(points[0].recordedAt)) return points[0];
  if (at >= Date.parse(points[points.length - 1].recordedAt)) return points[points.length - 1];
  let low = 0;
  let high = points.length - 1;
  while (low + 1 < high) { const middle = Math.floor((low + high) / 2); if (Date.parse(points[middle].recordedAt) <= at) low = middle; else high = middle; }
  const first = points[low];
  const second = points[high];
  const fraction = (at - Date.parse(first.recordedAt)) / (Date.parse(second.recordedAt) - Date.parse(first.recordedAt));
  const blend = (left: number | null, right: number | null) => left == null || right == null ? left : left + (right - left) * fraction;
  return { ...first, latitude: first.latitude + (second.latitude - first.latitude) * fraction, longitude: first.longitude + (second.longitude - first.longitude) * fraction, speed: blend(first.speed, second.speed), heading: blend(first.heading, second.heading), accuracy: first.accuracy + (second.accuracy - first.accuracy) * fraction, recordedAt: new Date(at).toISOString() };
}
