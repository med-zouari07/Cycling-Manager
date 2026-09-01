import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isReadOnly } from '../lib/supabase';
import type { Club } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { Building2, Plus, Pencil, Trash2, Search } from 'lucide-react';

const empty: Omit<Club, 'id' | 'created_at'> = {
  name: '', logo_url: null, manager: '', address: '', phone: '', email: '', city: '', country: '',
};

export default function Clubs() {
  const { role } = useAuth();
  const readOnly = isReadOnly(role);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clubs').select('*').order('name');
    if (error) setError(error.message);
    setClubs((data as Club[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = clubs.filter((c) =>
    [c.name, c.city, c.country, c.manager].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase())
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await supabase.from('clubs').update(form).eq('id', editId);
    } else {
      await supabase.from('clubs').insert(form);
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce club ?')) return;
    await supabase.from('clubs').delete().eq('id', id);
    load();
  };

  const edit = (c: Club) => {
    setEditId(c.id);
    setForm({ name: c.name, logo_url: c.logo_url, manager: c.manager ?? '', address: c.address ?? '', phone: c.phone ?? '', email: c.email ?? '', city: c.city ?? '', country: c.country ?? '' });
    setOpen(true);
  };

  const add = () => {
    setEditId(null);
    setForm(empty);
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Clubs"
        subtitle={`${clubs.length} club(s) enregistré(s)`}
        action={!readOnly && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Nouveau club</button>}
      />

      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un club..." className="input pl-10" />
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Aucun club" description="Ajoutez votre premier club pour commencer." action={!readOnly && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="card p-5 hover:shadow-card-hover transition-shadow group">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-600/10 text-primary-600 grid place-items-center overflow-hidden shrink-0">
                  {c.logo_url ? <img src={c.logo_url} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{c.name}</h3>
                  <p className="text-xs text-gray-400 truncate">{c.manager ?? '—'}</p>
                </div>
                {!readOnly && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => edit(c)} className="btn-ghost !p-1.5"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(c.id)} className="btn-ghost !p-1.5 hover:text-error-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><Badge color="blue">{c.city ?? '—'}</Badge><Badge>{c.country ?? '—'}</Badge></div>
                <div className="text-gray-500 dark:text-slate-400 truncate">{c.email ?? '—'}</div>
                <div className="text-gray-500 dark:text-slate-400">{c.phone ?? '—'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Modifier le club' : 'Nouveau club'} size="lg">
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Nom *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
          <div><label className="label">Logo (URL)</label><input value={form.logo_url ?? ''} onChange={(e) => setForm({ ...form, logo_url: e.target.value || null })} className="input" /></div>
          <div><label className="label">Responsable</label><input value={form.manager ?? ''} onChange={(e) => setForm({ ...form, manager: e.target.value })} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Adresse</label><input value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></div>
          <div><label className="label">Téléphone</label><input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
          <div><label className="label">Email</label><input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></div>
          <div><label className="label">Ville</label><input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" /></div>
          <div><label className="label">Pays</label><input value={form.country ?? ''} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input" /></div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">{editId ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
