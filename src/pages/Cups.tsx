import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isAdmin } from '../lib/supabase';
import type { Cup } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { navigate } from '../lib/router';
import { Medal, Plus, Pencil, Trash2, Flag } from 'lucide-react';

const empty: Omit<Cup, 'id' | 'created_at'> = { name: '', season: '', description: '', status: 'draft' };
const STATUS: Record<string, { label: string; color: 'gray' | 'green' | 'yellow' }> = {
  draft: { label: 'Brouillon', color: 'gray' }, active: { label: 'En cours', color: 'green' }, completed: { label: 'Terminé', color: 'yellow' },
};

export default function Cups() {
  const { role } = useAuth();
  const admin = isAdmin(role);
  const [items, setItems] = useState<Cup[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('cups').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    const list = (data as Cup[]) ?? [];
    setItems(list);
    if (list.length) {
      const { data: st } = await supabase.from('stages').select('cup_id').not('cup_id', 'is', null);
      const counts: Record<string, number> = {};
      (st ?? []).forEach((s) => { const id = s.cup_id as string; counts[id] = (counts[id] ?? 0) + 1; });
      setStageCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) await supabase.from('cups').update(form).eq('id', editId);
    else await supabase.from('cups').insert({ ...form, is_global: admin });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette coupe et ses manches ?')) return;
    await supabase.from('cups').delete().eq('id', id);
    load();
  };

  const edit = (c: Cup) => { setEditId(c.id); setForm({ ...c }); setOpen(true); };
  const add = () => { setEditId(null); setForm(empty); setOpen(true); };

  return (
    <div>
      <PageHeader title="Coupes" subtitle={`${items.length} coupe(s)`} action={admin && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Nouvelle</button>} />
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : items.length === 0 ? (
        <EmptyState icon={Medal} title="Aucune coupe" description="Créez une coupe pour organiser ses manches." action={admin && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Créer</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c.id} className="card p-5 group hover:shadow-card-hover transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-accent-50 dark:bg-accent-500/10 text-accent-600 grid place-items-center"><Medal className="w-5 h-5" /></div>
                  <div><h3 className="font-semibold">{c.name}</h3><p className="text-xs text-gray-400">Saison {c.season ?? '—'}</p></div>
                </div>
                <Badge color={STATUS[c.status].color}>{STATUS[c.status].label}</Badge>
              </div>
              {c.description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-3 line-clamp-2">{c.description}</p>}
              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => navigate('stages')} className="text-primary-600 hover:underline text-xs flex items-center gap-1"><Flag className="w-3.5 h-3.5" /> {stageCounts[c.id] ?? 0} manche(s)</button>
                <span className="text-xs text-gray-400">Classement auto</span>
              </div>
              {admin && (
                <div className="mt-4 flex gap-1 opacity-0 group-hover:opacity-100 transition border-t border-gray-100 dark:border-slate-800 pt-3">
                  <button onClick={() => edit(c)} className="btn-ghost !py-1.5 text-xs"><Pencil className="w-3.5 h-3.5" /> Modifier</button>
                  <button onClick={() => remove(c.id)} className="btn-ghost !py-1.5 text-xs hover:text-error-500 ml-auto"><Trash2 className="w-3.5 h-3.5" /> Supprimer</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Modifier la coupe' : 'Nouvelle coupe'}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Nom *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
          <div><label className="label">Saison</label><input value={form.season ?? ''} onChange={(e) => setForm({ ...form, season: e.target.value })} className="input" placeholder="2026" /></div>
          <div><label className="label">Statut</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Cup['status'] })} className="input"><option value="draft">Brouillon</option><option value="active">En cours</option><option value="completed">Terminé</option></select></div>
          <div><label className="label">Description</label><textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={3} /></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">{editId ? 'Enregistrer' : 'Créer'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
