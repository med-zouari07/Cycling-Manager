import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { ROLE_LABELS } from '../lib/supabase';
import { StatCard, Spinner, ErrorState } from '../components/ui';
import { DonutChart, LineChart } from '../components/Charts';
import { formatDate } from '../lib/hooks';
import { navigate } from '../lib/router';
import {
  Trophy, Users, Building2, Flag, Bike, Medal, CalendarDays, TrendingUp,
} from 'lucide-react';

interface Counts {
  championships: number;
  cups: number;
  stages: number;
  clubs: number;
  riders: number;
  races: number;
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [recent, setRecent] = useState<{ name: string; stage_date: string; city: string | null; stage_type: string }[]>([]);
  const [byCat, setByCat] = useState<{ label: string; value: number }[]>([]);
  const [pointsTrend, setPointsTrend] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [ch, cu, st, cl, ri, ra] = await Promise.all([
          supabase.from('championships').select('id', { count: 'exact', head: true }),
          supabase.from('cups').select('id', { count: 'exact', head: true }),
          supabase.from('stages').select('id', { count: 'exact', head: true }),
          supabase.from('clubs').select('id', { count: 'exact', head: true }),
          supabase.from('riders').select('id', { count: 'exact', head: true }),
          supabase.from('races').select('id', { count: 'exact', head: true }),
        ]);
        setCounts({
          championships: ch.count ?? 0,
          cups: cu.count ?? 0,
          stages: st.count ?? 0,
          clubs: cl.count ?? 0,
          riders: ri.count ?? 0,
          races: ra.count ?? 0,
        });

        const { data: stages } = await supabase
          .from('stages')
          .select('name, stage_date, city, stage_type')
          .order('stage_date', { ascending: false })
          .limit(6);
        setRecent((stages as typeof recent) ?? []);

        const { data: riders } = await supabase
          .from('riders')
          .select('category_id');
        const { data: cats } = await supabase.from('categories').select('id, name');
        const catMap = new Map((cats ?? []).map((c) => [c.id, c.name]));
        const counts2 = new Map<string, number>();
        (riders ?? []).forEach((r) => {
          const n = r.category_id ? catMap.get(r.category_id) ?? 'Sans catégorie' : 'Sans catégorie';
          counts2.set(n, (counts2.get(n) ?? 0) + 1);
        });
        setByCat(Array.from(counts2, ([label, value]) => ({ label, value })));

        const { data: results } = await supabase
          .from('results')
          .select('points, created_at')
          .order('created_at', { ascending: true })
          .limit(200);
        if (results && results.length) {
          const byMonth = new Map<string, number>();
          results.forEach((r) => {
            const d = new Date(r.created_at);
            const k = `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
            byMonth.set(k, (byMonth.get(k) ?? 0) + (r.points ?? 0));
          });
          setPointsTrend(Array.from(byMonth, ([label, value]) => ({ label, value })).slice(-8));
        } else {
          setPointsTrend([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  const donutData = byCat.map((d, i) => ({
    label: d.label,
    value: d.value,
    color: ['#2563eb', '#06b6d4', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'][i % 6],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <img src="/images/Federation_tunisienne_de_cyclisme_logo.png" alt="FTC" className="hidden sm:block w-14 h-14 object-contain" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {user?.email?.split('@')[0]}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Connecté en tant que <span className="font-medium text-primary-600">{ROLE_LABELS[role]}</span> — vue d'ensemble de la saison.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Championnats" value={counts?.championships ?? 0} icon={Trophy} color="primary" />
        <StatCard label="Coupes" value={counts?.cups ?? 0} icon={Medal} color="accent" />
        <StatCard label="Manches" value={counts?.stages ?? 0} icon={Flag} color="warning" />
        <StatCard label="Clubs" value={counts?.clubs ?? 0} icon={Building2} color="success" />
        <StatCard label="Coureurs" value={counts?.riders ?? 0} icon={Users} color="primary" />
        <StatCard label="Courses" value={counts?.races ?? 0} icon={Bike} color="accent" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Évolution des points</h3>
              <p className="text-xs text-gray-400">Cumul par mois</p>
            </div>
            <TrendingUp className="w-5 h-5 text-primary-500" />
          </div>
          {pointsTrend.length ? (
            <LineChart data={pointsTrend} />
          ) : (
            <div className="h-[200px] grid place-items-center text-sm text-gray-400">
              Aucun résultat enregistré pour le moment.
            </div>
          )}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Répartition par catégorie</h3>
          {donutData.length ? (
            <DonutChart data={donutData} />
          ) : (
            <div className="h-[200px] grid place-items-center text-sm text-gray-400">
              Aucun coureur catégorisé.
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Dernières compétitions</h3>
            <button onClick={() => navigate('calendar')} className="text-sm text-primary-600 hover:underline">
              Voir le calendrier
            </button>
          </div>
          {recent.length ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {recent.map((s, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-600/10 text-primary-600 grid place-items-center">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.city ?? '—'} · {s.stage_type}</div>
                  </div>
                  <div className="text-sm text-gray-500">{formatDate(s.stage_date)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-gray-400">Aucune manche programmée.</div>
          )}
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold">Aperçu calendrier</h3>
          </div>
          <MiniCalendar />
        </div>
      </div>
    </div>
  );
}

function MiniCalendar() {
  const [now] = useState(new Date());
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const today = now.getDate();
  return (
    <div>
      <div className="text-center font-semibold mb-3">
        {now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400 mb-1">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`aspect-square grid place-items-center text-xs rounded-lg ${
              c === today
                ? 'bg-primary-600 text-white font-semibold'
                : c
                ? 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                : ''
            }`}
          >
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}
