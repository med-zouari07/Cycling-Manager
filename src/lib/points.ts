import { supabase } from './supabase';
import type { PointsScale } from './types';

const DEFAULT_SCALE: { position: number; points: number }[] = [
  { position: 1, points: 100 },
  { position: 2, points: 80 },
  { position: 3, points: 70 },
  { position: 4, points: 60 },
  { position: 5, points: 50 },
  { position: 6, points: 45 },
  { position: 7, points: 40 },
  { position: 8, points: 36 },
  { position: 9, points: 32 },
  { position: 10, points: 30 },
  { position: 11, points: 28 },
  { position: 12, points: 26 },
  { position: 13, points: 24 },
  { position: 14, points: 22 },
  { position: 15, points: 20 },
  { position: 16, points: 18 },
  { position: 17, points: 16 },
  { position: 18, points: 14 },
  { position: 19, points: 12 },
  { position: 20, points: 10 },
];

export async function getActiveScale(): Promise<{ position: number; points: number }[]> {
  const { data } = await supabase.from('points_scales').select('*').eq('is_active', true).maybeSingle();
  const scale = (data as PointsScale | null)?.scale;
  if (scale && Array.isArray(scale) && scale.length) return scale;
  return DEFAULT_SCALE;
}

export function pointsForPosition(position: number | null, status: string, scale: { position: number; points: number }[]): number {
  if (status !== 'finished' || !position) return 0;
  const entry = scale.find((s) => s.position === position);
  if (entry) return entry.points;
  // beyond defined scale: last points minus decrement
  const sorted = [...scale].sort((a, b) => a.position - b.position);
  if (position > sorted[sorted.length - 1].position) {
    const last = sorted[sorted.length - 1];
    return Math.max(0, last.points - (position - last.position) * 2);
  }
  return 0;
}

export const DEFAULT_SCALE_EXPORT = DEFAULT_SCALE;
