import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isAdmin } from '../lib/supabase';
import type { Stage, Race, Category, Registration, Rider, Result } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { fullName, formatDate, formatInterval } from '../lib/hooks';
import { navigate } from '../lib/router';
import { Bike, Plus, Trash2, Flag, ChevronRight, ClipboardList, BarChart3 } from 'lucide-react';

export default function Races() {
  const { role } = useAuth();
  const admin = isAdmin(role);
  const [stages, setStages] = useState<Stage[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category_id: '', bib_start: '1' });

  const load = async () => {
    setLoading(true);
    const [s, c, r] = await Promise.all([
      supabase.from('stages').select('*').order('stage_date', { ascending: false }),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('races').select('*'),
    ]);
    if (s.error) setError(s.error.message);
    setStages((s.data as Stage[]) ?? []);
    setCats((c.data as Category[]) ?? []);
    setRaces((r.data as Race[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '—';
  const stageRaces = races.filter((r) => r.stage_id === selectedStage);
  const selected = stages.find((s) => s.id === selectedStage);

  const createRace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStage || !form.category_id) return;
    await supabase.from('races').insert({
      stage_id: selectedStage,
      category_id: form.category_id,
      bib_start: Number(form.bib_start) || 1,
      is_global: true,
    });
    setOpen(false);
    setForm({ category_id: '', bib_start: '1' });
    load();
  };

  const removeRace = async (id: string) => {
    if (!confirm('Supprimer cette course et ses inscriptions/résultats ?')) return;
    await supabase.from('races').delete().eq('id', id);
    load();
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader title="Courses" subtitle="Courses par catégorie au sein de chaque manche" />

      {!selectedStage ? (
        stages.length === 0 ? (
          <EmptyState icon={Flag} title="Aucune manche" description="Créez d'abord des manches pour y ajouter des courses." action={<button onClick={() => navigate('stages')} className="btn-primary">Aller aux manches</button>} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stages.map((s) => {
              const count = races.filter((r) => r.stage_id === s.id).length;
              return (
                <button key={s.id} onClick={() => setSelectedStage(s.id)} className="card p-5 text-left hover:shadow-card-hover transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-600/10 text-primary-600 grid place-items-center"><Flag className="w-5 h-5" /></div>
                    <div className="min-w-0 flex-1"><h3 className="font-semibold truncate">{s.name}</h3><p className="text-xs text-gray-400">{formatDate(s.stage_date)} · {s.city ?? '—'}</p></div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition" />
                  </div>
                  <div className="mt-3 flex items-center gap-2"><Badge color="blue">{count} course(s)</Badge><Badge>{s.stage_type}</Badge></div>
                </button>
              );
            })}
          </div>
        )
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setSelectedStage(null)} className="btn-ghost !p-2"><ChevronRight className="w-4 h-4 rotate-180" /></button>
            <div>
              <h2 className="text-xl font-bold">{selected?.name}</h2>
              <p className="text-sm text-gray-400">{formatDate(selected?.stage_date ?? null)} · {selected?.city ?? '—'} · {selected?.stage_type}</p>
            </div>
            {admin && <button onClick={() => setOpen(true)} className="btn-primary ml-auto"><Plus className="w-4 h-4" /> Course</button>}
          </div>

          {stageRaces.length === 0 ? (
            <EmptyState icon={Bike} title="Aucune course" description="Les courses sont créées par l'administrateur." action={admin && <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>} />
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              {stageRaces.map((r) => <RaceCard key={r.id} race={r} catName={catName(r.category_id)} readOnly={!admin} onDelete={() => removeRace(r.id)} />)}
            </div>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle course">
        <form onSubmit={createRace} className="space-y-4">
          <div><label className="label">Catégorie *</label><select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input"><option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">Dossard de départ</label><input type="number" value={form.bib_start} onChange={(e) => setForm({ ...form, bib_start: e.target.value })} className="input" /></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Créer</button></div>
        </form>
      </Modal>
    </div>
  );
}

function RaceCard({ race, catName, readOnly, onDelete }: { race: Race; catName: string; readOnly: boolean; onDelete: () => void }) {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [riders, setRiders] = useState<Record<string, Rider>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [tab, setTab] = useState<'list' | 'results'>('list');

  useEffect(() => {
    (async () => {
      const [rg, rs] = await Promise.all([
        supabase.from('registrations').select('*').eq('race_id', race.id),
        supabase.from('results').select('*').eq('race_id', race.id).order('position', { ascending: true, nullsFirst: false }),
      ]);
      setRegs((rg.data as Registration[]) ?? []);
      setResults((rs.data as Result[]) ?? []);
      const riderIds = Array.from(new Set([...(rg.data ?? []).map((x) => (x as Registration).rider_id), ...(rs.data ?? []).map((x) => (x as Result).rider_id)]));
      if (riderIds.length) {
        const { data: rd } = await supabase.from('riders').select('*').in('id', riderIds);
        const map: Record<string, Rider> = {};
        (rd as Rider[] ?? []).forEach((r) => { map[r.id] = r; });
        setRiders(map);
      }
    })();
  }, [race.id]);

  const validated = regs.filter((r) => r.status === 'validated');
  const riderName = (id: string) => { const r = riders[id]; return r ? fullName(r.first_name, r.last_name) : '—'; };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-500/10 text-accent-600 grid place-items-center"><Bike className="w-5 h-5" /></div>
          <div><h3 className="font-semibold">{catName}</h3><p className="text-xs text-gray-400">{validated.length} partant(s) · {results.length} résultat(s)</p></div>
        </div>
        {!readOnly && <button onClick={onDelete} className="btn-ghost !p-1.5 hover:text-error-500"><Trash2 className="w-4 h-4" /></button>}
      </div>
      <div className="flex border-b border-gray-100 dark:border-slate-800">
        <button onClick={() => setTab('list')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === 'list' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400'}`}><ClipboardList className="w-4 h-4 inline mr-1.5" />Liste de départ</button>
        <button onClick={() => setTab('results')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === 'results' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400'}`}><BarChart3 className="w-4 h-4 inline mr-1.5" />Résultats</button>
      </div>
      <div className="p-4 max-h-72 overflow-y-auto">
        {tab === 'list' ? (
          validated.length === 0 ? <div className="text-center text-sm text-gray-400 py-6">Aucun partant validé.</div> : (
            <table className="w-full text-sm">
              <tbody>
                {validated.sort((a, b) => (a.bib_number ?? 999) - (b.bib_number ?? 999)).map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-slate-800/50 last:border-0">
                    <td className="py-2 w-12"><span className="font-mono font-semibold text-primary-600">{r.bib_number ?? '—'}</span></td>
                    <td className="py-2">{riderName(r.rider_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          results.length === 0 ? <div className="text-center text-sm text-gray-400 py-6">Aucun résultat saisi.</div> : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 text-left"><tr><th className="py-1 w-10">#</th><th className="py-1">Coureur</th><th className="py-1 w-20">Temps</th><th className="py-1 w-14">Pts</th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-slate-800/50 last:border-0">
                    <td className="py-2 font-semibold">{r.status === 'finished' ? r.position ?? '—' : <Badge color={r.status === 'DNF' ? 'red' : 'yellow'}>{r.status}</Badge>}</td>
                    <td className="py-2">{riderName(r.rider_id)}</td>
                    <td className="py-2 text-gray-500 dark:text-slate-400 font-mono text-xs">{formatInterval(r.finish_time)}</td>
                    <td className="py-2 font-semibold text-primary-600">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
