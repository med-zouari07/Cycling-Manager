import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Result, Rider, Race, Category } from '../lib/types';import { PageHeader, Spinner, ErrorState, StatCard } from '../components/ui';
import { BarChart, DonutChart, LineChart } from '../components/Charts';
import { fullName } from '../lib/hooks';
import { Trophy, Medal, BarChart3, TrendingUp } from 'lucide-react';

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topRiders, setTopRiders] = useState<{ label: string; value: number }[]>([]);
  const [podiums, setPodiums] = useState<{ label: string; value: number }[]>([]);
  const [byCat, setByCat] = useState<{ label: string; value: number; color: string }[]>([]);
  const [trend, setTrend] = useState<{ label: string; value: number }[]>([]);
  const [totals, setTotals] = useState({ races: 0, wins: 0, podiums: 0, avgPts: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [results, riders, races, cats] = await Promise.all([
          supabase.from('results').select('*'),
          supabase.from('riders').select('*'),
          supabase.from('races').select('id, category_id'),
          supabase.from('categories').select('id, name'),
        ]);
        const R = (results.data as Result[]) ?? [];
        const Rd = (riders.data as Rider[]) ?? [];
        const Rc = (races.data as Race[]) ?? [];
        const Ct = (cats.data as Category[]) ?? [];
        const name = (id: string) => { const r = Rd.find((x) => x.id === id); return r ? fullName(r.first_name, r.last_name) : '—'; };

        const pts = new Map<string, number>();
        const wins = new Map<string, number>();
        const pod = new Map<string, number>();
        R.forEach((r) => {
          pts.set(r.rider_id, (pts.get(r.rider_id) ?? 0) + r.points);
          if (r.position === 1) wins.set(r.rider_id, (wins.get(r.rider_id) ?? 0) + 1);
          if (r.position && r.position <= 3) pod.set(r.rider_id, (pod.get(r.rider_id) ?? 0) + 1);
        });
        setTopRiders(Array.from(pts, ([id, v]) => ({ label: name(id), value: v })).sort((a, b) => b.value - a.value).slice(0, 8));
        setPodiums(Array.from(pod, ([id, v]) => ({ label: name(id), value: v })).sort((a, b) => b.value - a.value).slice(0, 8));

        const raceCat = new Map(Rc.map((r) => [r.id, r.category_id]));
        const catMap = new Map(Ct.map((c) => [c.id, c.name]));
        const catCount = new Map<string, number>();
        R.forEach((r) => { const cid = raceCat.get(r.race_id); const n = cid ? catMap.get(cid) ?? '—' : '—'; catCount.set(n, (catCount.get(n) ?? 0) + 1); });
        setByCat(Array.from(catCount, ([label, value]) => ({ label, value, color: ['#2563eb', '#06b6d4', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'][0] })).map((d, i) => ({ ...d, color: ['#2563eb', '#06b6d4', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'][i % 6] })));

        const byMonth = new Map<string, number>();
        R.forEach((r) => { const d = new Date(r.created_at); const k = `${d.getMonth() + 1}`; byMonth.set(k, (byMonth.get(k) ?? 0) + r.points); });
        setTrend(Array.from(byMonth, ([label, value]) => ({ label: `M${label}`, value })).slice(-8));

        setTotals({
          races: new Set(R.map((r) => r.race_id)).size,
          wins: Array.from(wins.values()).reduce((s, v) => s + v, 0),
          podiums: Array.from(pod.values()).reduce((s, v) => s + v, 0),
          avgPts: R.length ? Math.round(R.reduce((s, r) => s + r.points, 0) / R.length) : 0,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Statistiques" subtitle="Analyse des performances et des participations" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Courses disputées" value={totals.races} icon={BarChart3} color="primary" />
        <StatCard label="Victoires" value={totals.wins} icon={Trophy} color="warning" />
        <StatCard label="Podiums" value={totals.podiums} icon={Medal} color="success" />
        <StatCard label="Moyenne points" value={totals.avgPts} icon={TrendingUp} color="accent" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Top coureurs (points)</h3>
          {topRiders.length ? <BarChart data={topRiders} color="#2563eb" /> : <div className="h-[200px] grid place-items-center text-sm text-gray-400">Aucune donnée.</div>}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Podiums par coureur</h3>
          {podiums.length ? <BarChart data={podiums} color="#22c55e" /> : <div className="h-[200px] grid place-items-center text-sm text-gray-400">Aucune donnée.</div>}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Résultats par catégorie</h3>
          {byCat.length ? <DonutChart data={byCat} /> : <div className="h-[200px] grid place-items-center text-sm text-gray-400">Aucune donnée.</div>}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Évolution des points</h3>
          {trend.length ? <LineChart data={trend} /> : <div className="h-[200px] grid place-items-center text-sm text-gray-400">Aucune donnée.</div>}
        </div>
      </div>
    </div>
  );
}
