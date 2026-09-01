import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Stage, Championship, Cup } from '../lib/types';
import { PageHeader, Spinner, ErrorState, Badge } from '../components/ui';
import { formatDate } from '../lib/hooks';
import { navigate } from '../lib/router';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';

const TYPE_COLOR: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  'Route': 'blue', 'Contre-la-montre': 'green', 'VTT': 'yellow', 'Cyclo-cross': 'red', 'Piste': 'gray',
};

export default function Calendar() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [champs, setChamps] = useState<Championship[]>([]);
  const [cups, setCups] = useState<Cup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    (async () => {
      const [s, c, cu] = await Promise.all([
        supabase.from('stages').select('*'),
        supabase.from('championships').select('id, name'),
        supabase.from('cups').select('id, name'),
      ]);
      if (s.error) setError(s.error.message);
      setStages((s.data as Stage[]) ?? []);
      setChamps((c.data as Championship[]) ?? []);
      setCups((cu.data as Cup[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const parentName = (s: Stage) => {
    if (s.championship_id) return champs.find((c) => c.id === s.championship_id)?.name;
    if (s.cup_id) return cups.find((c) => c.id === s.cup_id)?.name;
    return undefined;
  };

  const filtered = filterType ? stages.filter((s) => s.stage_type === filterType) : stages;

  const monthStages = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    return filtered.filter((s) => {
      const d = new Date(s.stage_date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [filtered, cursor]);

  const byDay = useMemo(() => {
    const map = new Map<number, Stage[]>();
    monthStages.forEach((s) => { const d = new Date(s.stage_date).getDate(); map.set(d, [...(map.get(d) ?? []), s]); });
    return map;
  }, [monthStages]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  return (
    <div>
      <PageHeader title="Calendrier" subtitle="Toutes les compétitions programmées" />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="btn-ghost !p-2"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="text-lg font-semibold w-44 text-center">{cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="btn-ghost !p-2"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input !py-2 !w-48 ml-auto">
          <option value="">Tous les types</option>
          {['Route', 'Contre-la-montre', 'VTT', 'Cyclo-cross', 'Piste'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => (
            <div key={i} className={`min-h-[88px] sm:min-h-[110px] rounded-xl p-1.5 border ${c ? 'border-gray-100 dark:border-slate-800' : 'border-transparent'} ${isToday(c ?? -1) ? 'bg-primary-50 dark:bg-primary-600/10' : ''}`}>
              {c && (
                <>
                  <div className={`text-xs font-medium mb-1 ${isToday(c) ? 'text-primary-600' : 'text-gray-400'}`}>{c}</div>
                  <div className="space-y-1">
                    {(byDay.get(c) ?? []).map((s) => (
                      <button key={s.id} onClick={() => navigate('races')} className="block w-full text-left">
                        <div className={`rounded-lg px-1.5 py-1 text-[10px] sm:text-xs truncate ${s.stage_type === 'Route' ? 'bg-primary-100 dark:bg-primary-600/20 text-primary-700 dark:text-primary-300' : s.stage_type === 'VTT' ? 'bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400' : 'bg-accent-100 dark:bg-accent-500/20 text-accent-700 dark:text-accent-300'}`}>
                          {s.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold mb-3">Compétitions du mois ({monthStages.length})</h3>
        {monthStages.length === 0 ? <div className="text-sm text-gray-400">Aucune compétition ce mois-ci.</div> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {monthStages.sort((a, b) => a.stage_date.localeCompare(b.stage_date)).map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-600/10 text-primary-600 grid place-items-center"><Flag className="w-5 h-5" /></div>
                  <div className="min-w-0 flex-1"><h4 className="font-medium text-sm truncate">{s.name}</h4><p className="text-xs text-gray-400">{formatDate(s.stage_date)} · {s.city ?? '—'}</p></div>
                </div>
                <div className="mt-2 flex items-center gap-2"><Badge color={TYPE_COLOR[s.stage_type]}>{s.stage_type}</Badge>{parentName(s) && <span className="text-xs text-gray-400 truncate">{parentName(s)}</span>}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
