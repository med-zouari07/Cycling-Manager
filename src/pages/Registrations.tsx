import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isAdmin } from '../lib/supabase';
import type { Registration, Race, Stage, Category, Rider, Club } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { fullName } from '../lib/hooks';
import { ClipboardList, Plus, Check, X, Search } from 'lucide-react';

const STATUS: Record<string, { label: string; color: 'yellow' | 'green' | 'red' }> = {
  pending: { label: 'En attente', color: 'yellow' }, validated: { label: 'Validé', color: 'green' }, refused: { label: 'Refusé', color: 'red' },
};

export default function Registrations() {
  const { role } = useAuth();
  const admin = isAdmin(role);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'validated' | 'refused'>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ race_id: '', rider_id: '' });

  const load = async () => {
    setLoading(true);
    const [rg, ra, st, ca, ri, cl] = await Promise.all([
      supabase.from('registrations').select('*').order('created_at', { ascending: false }),
      supabase.from('races').select('*'),
      supabase.from('stages').select('id, name, stage_date'),
      supabase.from('categories').select('id, name'),
      supabase.from('riders').select('*').order('last_name'),
      supabase.from('clubs').select('id, name'),
    ]);
    if (rg.error) setError(rg.error.message);
    setRegs((rg.data as Registration[]) ?? []);
    setRaces((ra.data as Race[]) ?? []);
    setStages((st.data as Stage[]) ?? []);
    setCats((ca.data as Category[]) ?? []);
    setRiders((ri.data as Rider[]) ?? []);
    setClubs((cl.data as Club[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stageName = (id: string) => stages.find((s) => s.id === id)?.name ?? '—';
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '—';
  const riderName = (id: string) => { const r = riders.find((x) => x.id === id); return r ? fullName(r.first_name, r.last_name) : '—'; };
  const riderClub = (id: string) => { const r = riders.find((x) => x.id === id); return r?.club_id ? clubs.find((c) => c.id === r.club_id)?.name ?? '—' : '—'; };

  const raceLabel = (raceId: string) => {
    const r = races.find((x) => x.id === raceId);
    if (!r) return '—';
    return `${stageName(r.stage_id)} · ${catName(r.category_id)}`;
  };

  const setStatus = async (id: string, status: Registration['status']) => {
    if (!admin) return;
    let bib: number | null = null;
    if (status === 'validated') {
      const reg = regs.find((r) => r.id === id);
      const raceRegs = regs.filter((r) => r.race_id === reg?.race_id && r.status === 'validated' && r.bib_number != null);
      const maxBib = raceRegs.reduce((m, r) => Math.max(m, r.bib_number ?? 0), 0);
      const race = races.find((x) => x.id === reg?.race_id);
      bib = maxBib > 0 ? maxBib + 1 : (race?.bib_start ?? 1);
    }
    await supabase.from('registrations').update({ status, bib_number: bib }).eq('id', id);
    load();
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.race_id || !form.rider_id) return;
    await supabase.from('registrations').insert({ race_id: form.race_id, rider_id: form.rider_id, status: 'pending' });
    setOpen(false);
    setForm({ race_id: '', rider_id: '' });
    load();
  };

  const filtered = regs
    .filter((r) => filter === 'all' || r.status === filter)
    .filter((r) => riderName(r.rider_id).toLowerCase().includes(query.toLowerCase()));

  const counts = {
    all: regs.length,
    pending: regs.filter((r) => r.status === 'pending').length,
    validated: regs.filter((r) => r.status === 'validated').length,
    refused: regs.filter((r) => r.status === 'refused').length,
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader title="Inscriptions" subtitle={`${regs.length} inscription(s)`} action={!admin && <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Inscrire un coureur</button>} />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(['all', 'pending', 'validated', 'refused'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`btn ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'} !py-2 !px-3.5 text-sm`}>
            {f === 'all' ? 'Toutes' : STATUS[f].label} <span className="ml-1.5 opacity-70">{counts[f]}</span>
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Coureur..." className="input pl-10 !py-2" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune inscription" description="Les clubs inscrivent leurs coureurs aux courses." action={!admin && <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Inscrire un coureur</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-left text-xs uppercase text-gray-400">
                <tr><th className="px-4 py-3 font-medium">Coureur</th><th className="px-4 py-3 font-medium">Club</th><th className="px-4 py-3 font-medium">Course</th><th className="px-4 py-3 font-medium">Dossard</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 font-medium text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="table-row-hover">
                    <td className="px-4 py-3 font-medium">{riderName(r.rider_id)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{riderClub(r.rider_id)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{raceLabel(r.race_id)}</td>
                    <td className="px-4 py-3 font-mono">{r.bib_number ?? '—'}</td>
                    <td className="px-4 py-3"><Badge color={STATUS[r.status].color}>{STATUS[r.status].label}</Badge></td>
                    <td className="px-4 py-3">
                      {admin && r.status === 'pending' && (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setStatus(r.id, 'validated')} className="btn-ghost !p-1.5 text-success-600" title="Valider"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setStatus(r.id, 'refused')} className="btn-ghost !p-1.5 text-error-500" title="Refuser"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                      {admin && r.status !== 'pending' && (
                        <button onClick={() => setStatus(r.id, 'pending')} className="btn-ghost !p-1.5 text-xs ml-auto block">Réinitialiser</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Inscrire un coureur">
        <form onSubmit={create} className="space-y-4">
          <div><label className="label">Course *</label><select required value={form.race_id} onChange={(e) => setForm({ ...form, race_id: e.target.value })} className="input"><option value="">—</option>{races.map((r) => <option key={r.id} value={r.id}>{raceLabel(r.id)}</option>)}</select></div>
          <div><label className="label">Coureur *</label><select required value={form.rider_id} onChange={(e) => setForm({ ...form, rider_id: e.target.value })} className="input"><option value="">—</option>{riders.map((r) => <option key={r.id} value={r.id}>{fullName(r.first_name, r.last_name)}</option>)}</select></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Inscrire</button></div>
        </form>
      </Modal>
    </div>
  );
}
