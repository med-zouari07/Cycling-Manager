import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Result, Rider, Club, Category } from '../lib/types';
import { PageHeader, Spinner, ErrorState, Badge } from '../components/ui';
import { fullName } from '../lib/hooks';
import { Medal, Trophy, Users, Flag } from 'lucide-react';

type Mode = 'general' | 'category' | 'club';

interface Rank {
  id: string;
  name: string;
  sub?: string;
  points: number;
  wins: number;
  races: number;
}

export default function Rankings() {
  const [mode, setMode] = useState<Mode>('general');
  const [catFilter, setCatFilter] = useState<string>('');
  const [rows, setRows] = useState<Rank[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [results, riders, clubs, cat] = await Promise.all([
          supabase.from('results').select('*'),
          supabase.from('riders').select('*'),
          supabase.from('clubs').select('id, name'),
          supabase.from('categories').select('id, name'),
        ]);
        const R = (results.data as Result[]) ?? [];
        const Rd = (riders.data as Rider[]) ?? [];
        const Cl = (clubs.data as Club[]) ?? [];
        const Ct = (cat.data as Category[]) ?? [];
        setCats(Ct);

        const acc = new Map<string, Rank>();

        const add = (id: string, name: string, sub: string | undefined, pts: number, win: boolean) => {
          const e = acc.get(id) ?? { id, name, sub, points: 0, wins: 0, races: 0 };
          e.points += pts;
          if (win) e.wins += 1;
          e.races += 1;
          acc.set(id, e);
        };

        R.forEach((r) => {
          if (mode === 'general' || mode === 'category') {
            const rider = Rd.find((x) => x.id === r.rider_id);
            if (!rider) return;
            if (mode === 'category' && catFilter && rider.category_id !== catFilter) return;
            add(rider.id, fullName(rider.first_name, rider.last_name), undefined, r.points, r.position === 1);
          } else if (mode === 'club') {
            const rider = Rd.find((x) => x.id === r.rider_id);
            const clubId = rider?.club_id;
            if (!clubId) return;
            const club = Cl.find((c) => c.id === clubId);
            add(clubId, club?.name ?? '—', undefined, r.points, r.position === 1);
          }
        });

        let list = Array.from(acc.values()).filter((r) => r.races > 0);
        list.sort((a, b) => b.points - a.points || b.wins - a.wins);
        setRows(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, catFilter]);

  return (
    <div>
      <PageHeader title="Classements" subtitle="Calcul automatique à partir des résultats saisis" />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {([['general', 'Général', Trophy], ['category', 'Par catégorie', Flag], ['club', 'Par club', Users]] as const).map(([m, label, Icon]) => (
          <button key={m} onClick={() => setMode(m)} className={`btn !py-2 !px-3.5 text-sm ${mode === m ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
        {mode === 'category' && (
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input !py-2 !w-48 ml-auto">
            <option value="">Toutes catégories</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 grid place-items-center mb-4"><Medal className="w-7 h-7 text-gray-400" /></div>
          <h3 className="font-semibold text-lg">Aucun classement</h3>
          <p className="text-sm text-gray-400 mt-1">Saisissez des résultats pour générer les classements.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-left text-xs uppercase text-gray-400">
                <tr><th className="px-4 py-3 font-medium w-16">Rang</th><th className="px-4 py-3 font-medium">{mode === 'club' ? 'Club' : 'Coureur'}</th><th className="px-4 py-3 font-medium w-24">Courses</th><th className="px-4 py-3 font-medium w-24">Victoires</th><th className="px-4 py-3 font-medium w-24">Points</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {rows.map((r, i) => (
                  <tr key={r.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      {i < 3 ? (
                        <span className={`inline-grid place-items-center w-8 h-8 rounded-full font-bold text-xs ${i === 0 ? 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400' : i === 1 ? 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'}`}>{i + 1}</span>
                      ) : <span className="text-gray-400 font-medium pl-2">{i + 1}</span>}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{r.races}</td>
                    <td className="px-4 py-3"><Badge color="yellow">{r.wins}</Badge></td>
                    <td className="px-4 py-3 font-bold text-primary-600">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
