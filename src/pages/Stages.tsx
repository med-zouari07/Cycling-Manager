import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isAdmin } from '../lib/supabase';
import type { Stage, Championship, Cup, StageType } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { formatDate } from '../lib/hooks';
import { navigate } from '../lib/router';
import { Flag, Plus, Pencil, Trash2 } from 'lucide-react';

const TYPES: StageType[] = ['Route', 'Contre-la-montre', 'VTT', 'Cyclo-cross', 'Piste'];
const TYPE_COLOR: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  'Route': 'blue', 'Contre-la-montre': 'green', 'VTT': 'yellow', 'Cyclo-cross': 'red', 'Piste': 'gray',
};

interface FormState {
  name: string; stage_date: string; stage_time: string; city: string; venue: string;
  distance_km: string; stage_type: StageType; championship_id: string; cup_id: string;
}
const empty: FormState = { name: '', stage_date: '', stage_time: '', city: '', venue: '', distance_km: '', stage_type: 'Route', championship_id: '', cup_id: '' };

export default function Stages() {
  const { role } = useAuth();
  const admin = isAdmin(role);
  const [items, setItems] = useState<Stage[]>([]);
  const [champs, setChamps] = useState<Championship[]>([]);
  const [cups, setCups] = useState<Cup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [s, c, cu] = await Promise.all([
      supabase.from('stages').select('*').order('stage_date', { ascending: false }),
      supabase.from('championships').select('id, name').order('name'),
      supabase.from('cups').select('id, name').order('name'),
    ]);
    if (s.error) setError(s.error.message);
    setItems((s.data as Stage[]) ?? []);
    setChamps((c.data as Championship[]) ?? []);
    setCups((cu.data as Cup[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const parentName = (s: Stage) => {
    if (s.championship_id) return { label: champs.find((c) => c.id === s.championship_id)?.name ?? 'Championnat', type: 'Championnat' };
    if (s.cup_id) return { label: cups.find((c) => c.id === s.cup_id)?.name ?? 'Coupe', type: 'Coupe' };
    return { label: '—', type: '' };
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      stage_date: form.stage_date,
      stage_time: form.stage_time || null,
      city: form.city || null,
      venue: form.venue || null,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      stage_type: form.stage_type,
      championship_id: form.championship_id || null,
      cup_id: form.cup_id || null,
    };
    if (editId) await supabase.from('stages').update(payload).eq('id', editId);
    else await supabase.from('stages').insert({ ...payload, is_global: admin });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette manche et ses courses ?')) return;
    await supabase.from('stages').delete().eq('id', id);
    load();
  };

  const edit = (s: Stage) => {
    setEditId(s.id);
    setForm({
      name: s.name, stage_date: s.stage_date, stage_time: s.stage_time ?? '', city: s.city ?? '', venue: s.venue ?? '',
      distance_km: s.distance_km?.toString() ?? '', stage_type: s.stage_type,
      championship_id: s.championship_id ?? '', cup_id: s.cup_id ?? '',
    });
    setOpen(true);
  };
  const add = () => { setEditId(null); setForm(empty); setOpen(true); };

  return (
    <div>
      <PageHeader title="Manches" subtitle={`${items.length} manche(s)`} action={admin && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Nouvelle manche</button>} />
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : items.length === 0 ? (
        <EmptyState icon={Flag} title="Aucune manche" description="Créez une manche rattachée à un championnat ou une coupe." action={admin && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Créer</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-left text-xs uppercase text-gray-400">
                <tr><th className="px-4 py-3 font-medium">Manche</th><th className="px-4 py-3 font-medium">Parent</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Lieu</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Dist.</th><th className="px-4 py-3 font-medium text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {items.map((s) => {
                  const p = parentName(s);
                  return (
                    <tr key={s.id} className="table-row-hover">
                      <td className="px-4 py-3"><button onClick={() => navigate('races')} className="font-medium text-left hover:text-primary-600">{s.name}</button></td>
                      <td className="px-4 py-3"><Badge color={p.type === 'Championnat' ? 'blue' : 'green'}>{p.label}</Badge></td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{formatDate(s.stage_date)}{s.stage_time ? ` · ${s.stage_time.slice(0, 5)}` : ''}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{s.city ?? '—'}</td>
                      <td className="px-4 py-3"><Badge color={TYPE_COLOR[s.stage_type]}>{s.stage_type}</Badge></td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{s.distance_km ? `${s.distance_km} km` : '—'}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1">{admin && <><button onClick={() => edit(s)} className="btn-ghost !p-1.5"><Pencil className="w-4 h-4" /></button><button onClick={() => remove(s.id)} className="btn-ghost !p-1.5 hover:text-error-500"><Trash2 className="w-4 h-4" /></button></>}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Modifier la manche' : 'Nouvelle manche'} size="lg">
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Nom *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
          <div><label className="label">Rattaché à (championnat)</label><select value={form.championship_id} onChange={(e) => setForm({ ...form, championship_id: e.target.value, cup_id: '' })} className="input"><option value="">—</option>{champs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">ou à (coupe)</label><select value={form.cup_id} onChange={(e) => setForm({ ...form, cup_id: e.target.value, championship_id: '' })} className="input"><option value="">—</option>{cups.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">Date *</label><input type="date" required value={form.stage_date} onChange={(e) => setForm({ ...form, stage_date: e.target.value })} className="input" /></div>
          <div><label className="label">Heure</label><input type="time" value={form.stage_time} onChange={(e) => setForm({ ...form, stage_time: e.target.value })} className="input" /></div>
          <div><label className="label">Ville</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" /></div>
          <div><label className="label">Lieu</label><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="input" /></div>
          <div><label className="label">Distance (km)</label><input type="number" step="0.1" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} className="input" /></div>
          <div><label className="label">Type</label><select value={form.stage_type} onChange={(e) => setForm({ ...form, stage_type: e.target.value as StageType })} className="input">{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">{editId ? 'Enregistrer' : 'Créer'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
