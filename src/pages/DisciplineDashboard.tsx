import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Stage, Championship, Cup, Rider } from '../lib/types';
import { StatCard, Spinner, ErrorState, EmptyState, Badge } from '../components/ui';
import { formatDate, fullName } from '../lib/hooks';
import { navigate } from '../lib/router';
import { Mountain, Bike, Flag, Trophy, Medal, Users, CalendarDays, BarChart3 } from 'lucide-react';

export type Discipline = 'VTT' | 'Route';

const DISCIPLINE_CONFIG: Record<Discipline, {
  title: string;
  subtitle: string;
  icon: typeof Mountain;
  stageTypes: string[];
  accent: string;
  gradient: string;
}> = {
  VTT: {
    title: 'VTT — Vélo Tout Terrain',
    subtitle: 'Discipline tout-terrain: cross-country, descente, enduro',
    icon: Mountain,
    stageTypes: ['VTT'],
    accent: 'success',
    gradient: 'from-success-500 to-success-700',
  },
  Route: {
    title: 'Route',
    subtitle: 'Cyclisme sur route: courses en ligne, contre-la-montre',
    icon: Bike,
    stageTypes: ['Route', 'Contre-la-montre'],
    accent: 'primary',
    gradient: 'from-primary-500 to-primary-700',
  },
};

interface Props {
  discipline: Discipline;
}

export default function DisciplineDashboard({ discipline }: Props) {
  const cfg = DISCIPLINE_CONFIG[discipline];
  const Icon = cfg.icon;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [champs, setChamps] = useState<Championship[]>([]);
  const [cups, setCups] = useState<Cup[]>([]);
  const [topRiders, setTopRiders] = useState<{ rider: Rider; total: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [stagesRes, champsRes, cupsRes] = await Promise.all([
          supabase.from('stages').select('*').order('stage_date', { ascending: false }),
          supabase.from('championships').select('id, name, status').order('name'),
          supabase.from('cups').select('id, name, status').order('name'),
        ]);

        if (stagesRes.error) throw stagesRes.error;

        const allStages = (stagesRes.data as Stage[]) ?? [];
        const filtered = allStages.filter((s) => cfg.stageTypes.includes(s.stage_type));
        setStages(filtered);
        setChamps((champsRes.data as Championship[]) ?? []);
        setCups((cupsRes.data as Cup[]) ?? []);

        // Top riders by total points in this discipline
        const stageIds = filtered.map((s) => s.id);
        if (stageIds.length) {
          const racesRes = await supabase.from('races').select('id, stage_id').in('stage_id', stageIds);
          const raceIds = ((racesRes.data as { id: string; stage_id: string }[]) ?? []).map((r) => r.id);
          if (raceIds.length) {
            const resultsRes = await supabase
              .from('results')
              .select('rider_id, points')
              .in('race_id', raceIds);
            const results = (resultsRes.data as { rider_id: string; points: number }[]) ?? [];
            const totals = new Map<string, number>();
            for (const r of results) {
              totals.set(r.rider_id, (totals.get(r.rider_id) ?? 0) + r.points);
            }
            const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
            if (sorted.length) {
              const ridersRes = await supabase.from('riders').select('*').in('id', sorted.map((s) => s[0]));
              const riders = (ridersRes.data as Rider[]) ?? [];
              const ranked = sorted
                .map(([id, total]) => ({ rider: riders.find((r) => r.id === id), total }))
                .filter((x): x is { rider: Rider; total: number } => !!x.rider);
              setTopRiders(ranked);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    })();
  }, [discipline]);

  const upcoming = stages
    .filter((s) => new Date(s.stage_date) >= new Date())
    .sort((a, b) => new Date(a.stage_date).getTime() - new Date(b.stage_date).getTime());

  const parentName = (s: Stage) => {
    if (s.championship_id) return champs.find((c) => c.id === s.championship_id)?.name ?? 'Championnat';
    if (s.cup_id) return cups.find((c) => c.id === s.cup_id)?.name ?? 'Coupe';
    return '—';
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      {/* Hero banner */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.gradient} text-white mb-6`}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative z-10 p-6 lg:p-8 flex items-center gap-5">
          <div className="grid place-items-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur">
            <Icon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold">{cfg.title}</h1>
            <p className="text-white/80 text-sm mt-1">{cfg.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Manches" value={stages.length} icon={Flag} color={cfg.accent as 'primary' | 'success'} />
        <StatCard label="À venir" value={upcoming.length} icon={CalendarDays} color="warning" />
        <StatCard label="Championnats" value={champs.filter((c) => c.status === 'active').length} icon={Trophy} color={cfg.accent as 'primary' | 'success'} />
        <StatCard label="Coureurs classés" value={topRiders.length} icon={Users} color="primary" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming stages */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-gray-400" /> Prochaines manches
            </h2>
            <button onClick={() => navigate('stages')} className="text-sm text-primary-600 hover:underline">
              Voir tout
            </button>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon={Flag} title="Aucune manche à venir" description={`Créez une manche de type ${discipline}.`} />
          ) : (
            <div className="space-y-2">
              {upcoming.slice(0, 5).map((s) => (
                <div key={s.id} className="card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow cursor-pointer" onClick={() => navigate('races')}>
                  <div className="grid place-items-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 shrink-0">
                    <Icon className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {parentName(s)} · {s.city ?? '—'} · {formatDate(s.stage_date)}
                    </div>
                  </div>
                  <Badge color={discipline === 'VTT' ? 'green' : 'blue'}>{s.stage_type}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top riders ranking */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Medal className="w-5 h-5 text-gray-400" /> Top coureurs {discipline}
            </h2>
            <button onClick={() => navigate('rankings')} className="text-sm text-primary-600 hover:underline">
              Classements
            </button>
          </div>
          {topRiders.length === 0 ? (
            <EmptyState icon={BarChart3} title="Aucun classement" description="Les points apparaîtront après saisie des résultats." />
          ) : (
            <div className="card overflow-hidden">
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {topRiders.map((r, i) => (
                      <tr key={r.rider.id} className="table-row-hover">
                        <td className="px-4 py-3 w-10 text-center">
                          <span className={`inline-grid place-items-center w-7 h-7 rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-warning-100 text-warning-700' :
                            i === 1 ? 'bg-gray-200 text-gray-600' :
                            i === 2 ? 'bg-orange-100 text-orange-700' :
                            'text-gray-400'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{fullName(r.rider.first_name, r.rider.last_name)}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary-600">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
