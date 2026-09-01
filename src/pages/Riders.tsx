import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isReadOnly } from '../lib/supabase';
import type { Rider, Club, Category } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { qrSvgDataUrl } from '../lib/qr';
import { fullName, initials, formatDate } from '../lib/hooks';
import { Users, Plus, Pencil, Trash2, Search, QrCode, Download } from 'lucide-react';

const empty: Omit<Rider, 'id' | 'created_at'> = {
  first_name: '', last_name: '', photo_url: null, sex: 'M', birth_date: null,
  category_id: null, license_number: '', club_id: null, nationality: '', email: '', phone: '',
};

export default function Riders() {
  const { role } = useAuth();
  const readOnly = isReadOnly(role);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [qrRider, setQrRider] = useState<Rider | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [r, c, cat] = await Promise.all([
      supabase.from('riders').select('*').order('last_name'),
      supabase.from('clubs').select('id, name').order('name'),
      supabase.from('categories').select('id, name').order('name'),
    ]);
    if (r.error) setError(r.error.message);
    setRiders((r.data as Rider[]) ?? []);
    setClubs((c.data as Club[]) ?? []);
    setCats((cat.data as Category[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const clubName = (id: string | null) => clubs.find((c) => c.id === id)?.name ?? '—';
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? '—';

  const filtered = riders.filter((r) =>
    fullName(r.first_name, r.last_name).toLowerCase().includes(query.toLowerCase()) ||
    (r.license_number ?? '').toLowerCase().includes(query.toLowerCase())
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) await supabase.from('riders').update(form).eq('id', editId);
    else await supabase.from('riders').insert(form);
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce coureur ?')) return;
    await supabase.from('riders').delete().eq('id', id);
    load();
  };

  const edit = (r: Rider) => {
    setEditId(r.id);
    setForm({ ...r });
    setOpen(true);
  };

  const add = () => { setEditId(null); setForm(empty); setOpen(true); };

  const qrPayload = (r: Rider) =>
    `RIDER:${r.id}|${r.license_number ?? ''}|${fullName(r.first_name, r.last_name)}`;

  return (
    <div>
      <PageHeader
        title="Coureurs"
        subtitle={`${riders.length} coureur(s) enregistré(s)`}
        action={!readOnly && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Nouveau coureur</button>}
      />

      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par nom ou licence..." className="input pl-10" />
      </div>

      {loading ? <Spinner /> : error ? <ErrorState message={error} /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Aucun coureur" description="Ajoutez votre premier coureur." action={!readOnly && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-left text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Coureur</th>
                  <th className="px-4 py-3 font-medium">Catégorie</th>
                  <th className="px-4 py-3 font-medium">Club</th>
                  <th className="px-4 py-3 font-medium">Licence</th>
                  <th className="px-4 py-3 font-medium">Naissance</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-600/20 text-primary-700 dark:text-primary-300 grid place-items-center text-xs font-semibold overflow-hidden">
                          {r.photo_url ? <img src={r.photo_url} alt="" className="w-full h-full object-cover" /> : initials(r.first_name, r.last_name)}
                        </div>
                        <div>
                          <div className="font-medium">{fullName(r.first_name, r.last_name)}</div>
                          <div className="text-xs text-gray-400">{r.sex === 'F' ? 'Femme' : 'Homme'} · {r.nationality ?? '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge color="blue">{catName(r.category_id)}</Badge></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{clubName(r.club_id)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.license_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{formatDate(r.birth_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setQrRider(r)} className="btn-ghost !p-1.5" title="QR Code"><QrCode className="w-4 h-4" /></button>
                        {!readOnly && <button onClick={() => edit(r)} className="btn-ghost !p-1.5"><Pencil className="w-4 h-4" /></button>}
                        {!readOnly && <button onClick={() => remove(r.id)} className="btn-ghost !p-1.5 hover:text-error-500"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Modifier le coureur' : 'Nouveau coureur'} size="lg">
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Prénom *</label><input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input" /></div>
          <div><label className="label">Nom *</label><input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input" /></div>
          <div><label className="label">Sexe</label><select value={form.sex ?? 'M'} onChange={(e) => setForm({ ...form, sex: e.target.value as 'M' | 'F' })} className="input"><option value="M">Homme</option><option value="F">Femme</option></select></div>
          <div><label className="label">Date de naissance</label><input type="date" value={form.birth_date ?? ''} onChange={(e) => setForm({ ...form, birth_date: e.target.value || null })} className="input" /></div>
          <div><label className="label">Catégorie</label><select value={form.category_id ?? ''} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })} className="input"><option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">Club</label><select value={form.club_id ?? ''} onChange={(e) => setForm({ ...form, club_id: e.target.value || null })} className="input"><option value="">—</option>{clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">N° de licence</label><input value={form.license_number ?? ''} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className="input" /></div>
          <div><label className="label">Nationalité</label><input value={form.nationality ?? ''} onChange={(e) => setForm({ ...form, nationality: e.target.value })} className="input" /></div>
          <div><label className="label">Email</label><input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></div>
          <div><label className="label">Téléphone</label><input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Photo (URL)</label><input value={form.photo_url ?? ''} onChange={(e) => setForm({ ...form, photo_url: e.target.value || null })} className="input" /></div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">{editId ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!qrRider} onClose={() => setQrRider(null)} title="QR Code du coureur">
        {qrRider && (
          <div className="text-center">
            <div className="inline-block p-4 bg-white rounded-2xl border border-gray-200">
              <img src={qrSvgDataUrl(qrPayload(qrRider), 6)} alt="QR" className="w-48 h-48" />
            </div>
            <div className="mt-4">
              <div className="font-semibold">{fullName(qrRider.first_name, qrRider.last_name)}</div>
              <div className="text-sm text-gray-400 font-mono">{qrRider.license_number ?? '—'}</div>
            </div>
            <a href={qrSvgDataUrl(qrPayload(qrRider), 8)} download={`qr-${qrRider.license_number ?? qrRider.id}.svg`} className="btn-secondary mt-4 inline-flex">
              <Download className="w-4 h-4" /> Télécharger
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
}
