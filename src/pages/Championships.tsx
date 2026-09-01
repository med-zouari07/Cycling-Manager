import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isAdmin } from '../lib/supabase';
import type { Championship } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { formatDate } from '../lib/hooks';
import { navigate } from '../lib/router';
import { Trophy, Plus, Pencil, Trash2, Flag } from 'lucide-react';

const empty: Omit<Championship, 'id' | 'created_at'> = {
  name: '', season: '', description: '', start_date: null, end_date: null, status: 'draft',
};

const STATUS: Record<string, { label: string; color: 'gray' | 'green' | 'yellow' }> = {
  draft: { label: 'Brouillon', color: 'gray' },
  active: { label: 'En cours', color: 'green' },
  completed: { label: 'Terminé', color: 'yellow' },
};

export default function Championships() {
  const { role } = useAuth();
  const admin = isAdmin(role);
  const [items, setItems] = useState<Championship[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('championships').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    const list = (data as Championship[]) ?? [];
    setItems(list);
    if (list.length) {
      const { data: st } = await supabase.from('stages').select('championship_id').not('championship_id', 'is', null);
      const counts: Record<string, number> = {};
      (st ?? []).forEach((s) => { const id = s.championship_id as string; counts[id] = (counts[id] ?? 0) + 1; });
      setStageCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) await supabase.from('championships').update(form).eq('id', editId);
    else await supabase.from('championships').insert({ ...form, is_global: admin });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce championnat et ses manches ?')) return;
    await supabase.from('championships').delete().eq('id', id);
    load();
  };

  const edit = (c: Championship) => { setEditId(c.id); setForm({ ...c }); setOpen(true); };
  const add = () => { setEditId(null); setForm(empty); setOpen(true); };

  return (
    <div>
      <PageHeader title="Championnats" subtitle={`${items.length} championnat(s)`} action={admin && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Nouveau</button>} />
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : items.length === 0 ? (
        <EmptyState icon={Trophy} title="Aucun championnat" description="Créez un championnat pour organiser ses manches." action={admin && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Créer</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c.id} className="card p-5 group hover:shadow-card-hover transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-600/10 text-primary-600 grid place-items-center"><Trophy className="w-5 h-5" /></div>
                  <div><h3 className="font-semibold">{c.name}</h3><p className="text-xs text-gray-400">Saison {c.season ?? '—'}</p></div>
                </div>
                <Badge color={STATUS[c.status].color}>{STATUS[c.status].label}</Badge>
              </div>
              {c.description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-3 line-clamp-2">{c.description}</p>}
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="text-gray-400">{formatDate(c.start_date)} → {formatDate(c.end_date)}</div>
                <button onClick={() => navigate('stages')} className="text-primary-600 hover:underline text-xs flex items-center gap-1"><Flag className="w-3.5 h-3.5" /> {stageCounts[c.id] ?? 0} manche(s)</button>
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

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Modifier le championnat' : 'Nouveau championnat'} size="lg">
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Nom *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
          <div><label className="label">Saison</label><input value={form.season ?? ''} onChange={(e) => setForm({ ...form, season: e.target.value })} className="input" placeholder="2026" /></div>
          <div><label className="label">Statut</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Championship['status'] })} className="input"><option value="draft">Brouillon</option><option value="active">En cours</option><option value="completed">Terminé</option></select></div>
          <div><label className="label">Date début</label><input type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value || null })} className="input" /></div>
          <div><label className="label">Date fin</label><input type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Description</label><textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={3} /></div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">{editId ? 'Enregistrer' : 'Créer'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
