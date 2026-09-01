import { useEffect, useState } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';

export function useAsync<T>(
  fn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const run = async () => {
    setLoading(true);
    setError(null);
    const { data: d, error: e } = await fn();
    if (e) setError(e.message);
    setData(d);
    setLoading(false);
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload: run, setData };
}

export function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function initials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

export function fullName(first: string, last: string): string {
  return `${first} ${last}`;
}

export function formatInterval(v: string | null): string {
  if (!v) return '—';
  // Postgres interval like "01:23:45" or "PT1H23M45S"
  if (v.startsWith('PT') || v.startsWith('P')) {
    const m = v.match(/(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const h = m?.[1] ? Number(m[1]) : 0;
    const mi = m?.[2] ? Number(m[2]) : 0;
    const s = m?.[3] ? Number(m[3]) : 0;
    return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return v;
}
