import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isAdmin } from '../lib/supabase';
import type { Registration, Race, Stage, Category, Rider, Club } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { fullName, formatDate } from '../lib/hooks';
import { ClipboardList, Plus, Check, X, Search, Flag, ChevronRight, Bike } from 'lucide-react';

const STATUS: Record<string, { label: string; color: 'yellow' | 'green' | 'red' }> = {
  pending: { label: 'En attente', color: 'yellow' },
  validated: { label: 'Validé', color: 'green' },
  refused: { label: 'Refusé', color: 'red' },
};

export default function Registrations() {
  const { role, user } = useAuth();
  const admin = isAdmin(role);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [myClub, setMyClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'validated' | 'refused'>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
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

    if (!admin && user) {
      const { data: clubData } = await supabase
        .from('clubs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setMyClub(clubData as Club | null);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stageName = (id: string) => stages.find((s) => s.id === id)?.name ?? '—';
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '—';
  const riderName = (id: string) => {
    const r = riders.find((x) => x.id === id);
    return r ? fullName(r.first_name, r.last_name) : '—';
  };
  const riderClub = (id: string) => {
    const r = riders.find((x) => x.id === id);
    return r?.club_id ? clubs.find((c) => c.id === r.club_id)?.name ?? '—' : '—';
  };

  const raceLabel = (raceId: string) => {
    const r = races.find((x) => x.id === raceId);
    if (!r) return '—';
    return `${stageName(r.stage_id)} · ${catName(r.category_id)}`;
  };

  const raceStageDate = (raceId: string) => {
    const r = races.find((x) => x.id === raceId);
    if (!r) return '';
    return formatDate(stages.find((s) => s.id === r.stage_id)?.stage_date ?? null);
  };

  // For associations: only their own riders
  const myRiders = admin ? riders : riders.filter((r) => r.club_id === myClub?.id);

  // For associations: only their own registrations
  const visibleRegs = admin
    ? regs
    : regs.filter((r) => myRiders.some((rd) => rd.id === r.rider_id));

  const setStatus = async (id: string, status: Registration['status']) => {
    if (!admin) return;
    let bib: number | null = null;
    if (status === 'validated') {
      const reg = regs.find((r) => r.id === id);
      const raceRegs = regs.filter(
        (r) => r.race_id === reg?.race_id && r.status === 'validated' && r.bib_number != null,
      );
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
    await supabase
      .from('registrations')
      .insert({ race_id: form.race_id, rider_id: form.rider_id, status: 'pending' });
    setOpen(false);
    setForm({ race_id: '', rider_id: '' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Annuler cette inscription ?')) return;
    await supabase.from('registrations').delete().eq('id', id);
    load();
  };

  // Group races by stage for the race picker
  const racesByStage = stages
    .map((s) => ({
      stage: s,
      races: races.filter((r) => r.stage_id === s.id),
    }))
    .filter((g) => g.races.length > 0);

  // When a race is selected in the association view, show only riders not yet registered
  const alreadyRegistered = (raceId: string) =>
    new Set(regs.filter((r) => r.race_id === raceId).map((r) => r.rider_id));

  const filtered = visibleRegs
    .filter((r) => filter === 'all' || r.status === filter)
    .filter((r) => riderName(r.rider_id).toLowerCase().includes(query.toLowerCase()));

  const counts = {
    all: visibleRegs.length,
    pending: visibleRegs.filter((r) => r.status === 'pending').length,
    validated: visibleRegs.filter((r) => r.status === 'validated').length,
    refused: visibleRegs.filter((r) => r.status === 'refused').length,
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  // Association view: pick a race first, then see their riders
  if (!admin && selectedRaceId) {
    const race = races.find((r) => r.id === selectedRaceId);
    const registered = alreadyRegistered(selectedRaceId);
    const availableRiders = myRiders.filter((r) => !registered.has(r.id));
    const raceRegs = visibleRegs.filter((r) => r.race_id === selectedRaceId);

    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setSelectedRaceId(null)} className="btn-ghost !p-2">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl font-bold">{raceLabel(selectedRaceId)}</h2>
            <p className="text-sm text-gray-400">{raceStageDate(selectedRaceId)} · {catName(race?.category_id ?? '')}</p>
          </div>
          <button
            onClick={() => { setForm({ race_id: selectedRaceId, rider_id: '' }); setOpen(true); }}
            disabled={availableRiders.length === 0}
            className="btn-primary ml-auto"
          >
            <Plus className="w-4 h-4" /> Inscrire un coureur
          </button>
        </div>

        {raceRegs.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Aucune inscription" description="Inscrivez vos coureurs à cette course." />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/50 text-left text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Coureur</th>
                    <th className="px-4 py-3 font-medium">Dossard</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {raceRegs.map((r) => (
                    <tr key={r.id} className="table-row-hover">
                      <td className="px-4 py-3 font-medium">{riderName(r.rider_id)}</td>
                      <td className="px-4 py-3 font-mono">{r.bib_number ?? '—'}</td>
                      <td className="px-4 py-3"><Badge color={STATUS[r.status].color}>{STATUS[r.status].label}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        {(r.status === 'pending' || r.status === 'refused') && (
                          <button onClick={() => remove(r.id)} className="btn-ghost !p-1.5 hover:text-error-500" title="Annuler">
                            <X className="w-4 h-4" />
                          </button>
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
            <div>
              <label className="label">Course</label>
              <div className="input bg-gray-50 dark:bg-slate-800">{raceLabel(selectedRaceId)}</div>
            </div>
            <div>
              <label className="label">Coureur *</label>
              <select required value={form.rider_id} onChange={(e) => setForm({ ...form, rider_id: e.target.value })} className="input">
                <option value="">—</option>
                {availableRiders.map((r) => (
                  <option key={r.id} value={r.id}>{fullName(r.first_name, r.last_name)}</option>
                ))}
              </select>
              {availableRiders.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Tous vos coureurs sont déjà inscrits à cette course.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
              <button type="submit" className="btn-primary">Inscrire</button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // Association view: list of races to pick from
  if (!admin) {
    return (
      <div>
        <PageHeader title="Inscriptions" subtitle="Choisissez une course pour inscrire vos coureurs" />

        {racesByStage.length === 0 ? (
          <EmptyState icon={Flag} title="Aucune course disponible" description="Les courses seront créées par l'administrateur." />
        ) : (
          <div className="space-y-6">
            {racesByStage.map(({ stage, races: stageRaces }) => (
              <div key={stage.id}>
                <div className="flex items-center gap-2 mb-3">
                  <Flag className="w-4 h-4 text-gray-400" />
                  <h3 className="font-semibold text-sm">{stage.name}</h3>
                  <span className="text-xs text-gray-400">{formatDate(stage.stage_date)}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stageRaces.map((r) => {
                    const raceRegs = visibleRegs.filter((rg) => rg.race_id === r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRaceId(r.id)}
                        className="card p-5 text-left hover:shadow-card-hover transition group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-500/10 text-accent-600 grid place-items-center">
                            <Bike className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold">{catName(r.category_id)}</h4>
                            <p className="text-xs text-gray-400">{raceRegs.length} inscription(s)</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Admin view: all registrations with validation controls
  return (
    <div>
      <PageHeader title="Inscriptions" subtitle={`${visibleRegs.length} inscription(s)`} />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(['all', 'pending', 'validated', 'refused'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'} !py-2 !px-3.5 text-sm`}
          >
            {f === 'all' ? 'Toutes' : STATUS[f].label} <span className="ml-1.5 opacity-70">{counts[f]}</span>
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Coureur..." className="input pl-10 !py-2" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune inscription" description="Les associations inscrivent leurs coureurs aux courses." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-left text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Coureur</th>
                  <th className="px-4 py-3 font-medium">Club</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Dossard</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
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
                      {r.status === 'pending' && (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setStatus(r.id, 'validated')} className="btn-ghost !p-1.5 text-success-600" title="Valider">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setStatus(r.id, 'refused')} className="btn-ghost !p-1.5 text-error-500" title="Refuser">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {r.status !== 'pending' && (
                        <button onClick={() => setStatus(r.id, 'pending')} className="btn-ghost !p-1.5 text-xs ml-auto block">
                          Réinitialiser
                        </button>
                      )}
                    </td>
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
