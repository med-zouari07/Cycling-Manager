import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isReadOnly } from '../lib/supabase';
import type { Category } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';

const DEFAULTS = ['Elite Homme', 'Elite Femme', 'U23', 'Junior', 'Cadet', 'Master'];

export default function Categories() {
  const { role } = useAuth();
  const readOnly = isReadOnly(role);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) setError(error.message);
    setCats((data as Category[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) await supabase.from('categories').update(form).eq('id', editId);
    else await supabase.from('categories').insert(form);
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return;
    await supabase.from('categories').delete().eq('id', id);
    load();
  };

  const seedDefaults = async () => {
    const rows = DEFAULTS.map((name) => ({ name, description: null }));
    await supabase.from('categories').insert(rows);
    load();
  };

  const edit = (c: Category) => { setEditId(c.id); setForm({ name: c.name, description: c.description ?? '' }); setOpen(true); };
  const add = () => { setEditId(null); setForm({ name: '', description: '' }); setOpen(true); };

  return (
    <div>
      <PageHeader
        title="Catégories"
        subtitle={`${cats.length} catégorie(s)`}
        action={!readOnly && (
          <div className="flex gap-2">
            {cats.length === 0 && <button onClick={seedDefaults} className="btn-secondary">Charger les défauts</button>}
            <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Nouvelle catégorie</button>
          </div>
        )}
      />
      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : cats.length === 0 ? (
        <EmptyState icon={Tag} title="Aucune catégorie" description="Créez les catégories de course (Elite, U23, Junior...)" action={!readOnly && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cats.map((c) => (
            <div key={c.id} className="card p-5 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-500/10 text-accent-600 grid place-items-center"><Tag className="w-5 h-5" /></div>
                  <div><h3 className="font-semibold">{c.name}</h3>{c.description && <p className="text-xs text-gray-400">{c.description}</p>}</div>
                </div>
                {!readOnly && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => edit(c)} className="btn-ghost !p-1.5"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(c.id)} className="btn-ghost !p-1.5 hover:text-error-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="mt-3"><Badge color="blue">Classement dédié</Badge></div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Modifier' : 'Nouvelle catégorie'}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Nom *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
          <div><label className="label">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">{editId ? 'Enregistrer' : 'Créer'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
