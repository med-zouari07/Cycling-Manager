import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isReadOnly, isAdmin } from '../lib/supabase';
import type { Club, ClubAnnualDocument } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { formatDate, formatDateTime } from '../lib/hooks';
import { Building2, Plus, Pencil, Trash2, Search, FileText, Upload, X, Download, FileCheck, Check, FileX } from 'lucide-react';

const empty: Omit<Club, 'id' | 'created_at'> = {
  name: '', logo_url: null, manager: '', address: '', phone: '', email: '', city: '', country: '',
};

const CURRENT_SEASON = '2026';

async function uploadAnnualDoc(file: File, clubId: string, season: string): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop() ?? 'pdf';
  const path = `annual/${clubId}/${season}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from('documents').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

const DOC_STATUS: Record<string, { label: string; color: 'yellow' | 'green' | 'red' }> = {
  pending: { label: 'En attente', color: 'yellow' },
  approved: { label: 'Approuvé', color: 'green' },
  rejected: { label: 'Rejeté', color: 'red' },
};

export default function Clubs() {
  const { role, user } = useAuth();
  const readOnly = isReadOnly(role);
  const admin = isAdmin(role);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [annualDocs, setAnnualDocs] = useState<ClubAnnualDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [tab, setTab] = useState<'directory' | 'annual'>('directory');

  // annual doc upload
  const [uploadClubId, setUploadClubId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSeason, setUploadSeason] = useState(CURRENT_SEASON);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [cl, ad] = await Promise.all([
      supabase.from('clubs').select('*').order('name'),
      supabase.from('club_annual_documents').select('*'),
    ]);
    if (cl.error) setError(cl.error.message);
    setClubs((cl.data as Club[]) ?? []);
    setAnnualDocs((ad.data as ClubAnnualDocument[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = clubs.filter((c) =>
    [c.name, c.city, c.country, c.manager].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase())
  );

  // For associations: only show their own annual docs; for admin: all
  const visibleAnnualDocs = admin
    ? annualDocs
    : annualDocs.filter((d) => clubs.some((c) => c.id === d.club_id && c.user_id === user?.id));

  const clubName = (id: string) => clubs.find((c) => c.id === id)?.name ?? '—';

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

  const startUpload = (clubId: string) => {
    setUploadClubId(clubId);
    setUploadFile(null);
    setUploadError(null);
    setUploadSeason(CURRENT_SEASON);
  };

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadClubId || !uploadFile) return;
    setUploading(true);
    setUploadError(null);
    const res = await uploadAnnualDoc(uploadFile, uploadClubId, uploadSeason);
    if (res.error) { setUploadError(res.error); setUploading(false); return; }
    const { error: insError } = await supabase.from('club_annual_documents').upsert({
      club_id: uploadClubId,
      season: uploadSeason,
      document_url: res.url,
      status: 'pending',
    }, { onConflict: 'club_id,season' });
    setUploading(false);
    if (insError) { setUploadError(insError.message); return; }
    setUploadClubId(null);
    setUploadFile(null);
    load();
  };

  const reviewDoc = async (id: string, status: 'approved' | 'rejected', note?: string) => {
    await supabase.from('club_annual_documents').update({ status, admin_note: note ?? null }).eq('id', id);
    load();
  };

  const removeDoc = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    await supabase.from('club_annual_documents').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Clubs"
        subtitle={`${clubs.length} club(s) enregistré(s)`}
        action={!readOnly && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Nouveau club</button>}
      />

      <div className="flex gap-2 mb-5 border-b border-gray-200 dark:border-slate-800 overflow-x-auto">
        {([['directory', 'Annuaire des clubs', Building2], ['annual', 'Documents annuels', FileCheck]] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <Icon className="w-4 h-4 inline mr-1.5" />{label}
          </button>
        ))}
      </div>

      {tab === 'directory' && (
        <>
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
        </>
      )}

      {tab === 'annual' && (
        <>
          {loading ? <Spinner /> : (
            <>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                {admin
                  ? 'Chaque association téléverse son document d\'inscription annuelle. Vous pouvez approuver ou rejeter chaque soumission.'
                  : 'Téléversez le document d\'inscription annuelle de votre association. L\'administrateur le validera.'}
              </p>

              {visibleAnnualDocs.length === 0 ? (
                <EmptyState icon={FileCheck} title="Aucun document annuel" description={admin ? 'Les associations téléverseront leurs documents ici.' : 'Téléversez votre document d\'inscription annuelle.'} />
              ) : (
                <div className="space-y-3">
                  {visibleAnnualDocs.map((d) => {
                    const club = clubs.find((c) => c.id === d.club_id);
                    const canUpload = !readOnly && (admin || club?.user_id === user?.id);
                    return (
                      <div key={d.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-accent-50 dark:bg-accent-500/10 text-accent-600 grid place-items-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{admin ? clubName(d.club_id) : 'Mon document'}</h3>
                            <Badge color="blue">Saison {d.season}</Badge>
                            <Badge color={DOC_STATUS[d.status].color}>{DOC_STATUS[d.status].label}</Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">Soumis le {formatDateTime(d.created_at)}</p>
                          {d.admin_note && d.status !== 'pending' && (
                            <p className="text-xs mt-1 text-gray-500 dark:text-slate-400">Note admin : {d.admin_note}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a href={d.document_url} target="_blank" rel="noreferrer" className="btn-ghost !py-2 !px-3 text-sm">
                            <Download className="w-4 h-4" /> Voir
                          </a>
                          {canUpload && (
                            <button onClick={() => startUpload(d.club_id)} className="btn-ghost !py-2 !px-3 text-sm">Remplacer</button>
                          )}
                          {canUpload && !admin && (
                            <button onClick={() => removeDoc(d.id)} className="btn-ghost !p-2 hover:text-error-500"><Trash2 className="w-4 h-4" /></button>
                          )}
                          {admin && d.status === 'pending' && (
                            <>
                              <button onClick={() => reviewDoc(d.id, 'approved')} className="btn-ghost !p-2 text-success-600" title="Approuver"><Check className="w-4 h-4" /></button>
                              <button onClick={() => { const note = prompt('Motif du rejet :'); if (note !== null) reviewDoc(d.id, 'rejected', note); }} className="btn-ghost !p-2 text-error-500" title="Rejeter"><FileX className="w-4 h-4" /></button>
                            </>
                          )}
                          {admin && d.status !== 'pending' && (
                            <button onClick={() => reviewDoc(d.id, 'pending')} className="btn-ghost !py-2 !px-3 text-xs">Réinitialiser</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload button for associations with a club but no current-year doc */}
              {!readOnly && !admin && (() => {
                const myClub = clubs.find((c) => c.user_id === user?.id);
                const hasCurrent = myClub && visibleAnnualDocs.some((d) => d.club_id === myClub.id && d.season === CURRENT_SEASON);
                if (!myClub || hasCurrent) return null;
                return (
                  <div className="mt-4">
                    <button onClick={() => startUpload(myClub.id)} className="btn-primary"><Upload className="w-4 h-4" /> Téléverser le document {CURRENT_SEASON}</button>
                  </div>
                );
              })()}

              {/* Upload modal */}
              <Modal open={!!uploadClubId} onClose={() => { setUploadClubId(null); setUploadFile(null); setUploadError(null); }} title="Document d'inscription annuelle" size="md">
                <form onSubmit={submitUpload} className="space-y-4">
                  <div>
                    <label className="label">Saison *</label>
                    <input required value={uploadSeason} onChange={(e) => setUploadSeason(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Document (PDF ou image) *</label>
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-4 text-center hover:border-primary-400 transition">
                      {uploadFile ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-primary-600">
                          <FileText className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">{uploadFile.name}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setUploadFile(null); }} className="text-error-500"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-sm text-gray-400">
                          <Upload className="w-5 h-5" />
                          <span>Choisir un fichier</span>
                        </div>
                      )}
                    </button>
                  </div>
                  {uploadError && <div className="rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-200 px-4 py-3 text-sm text-error-700">{uploadError}</div>}
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => { setUploadClubId(null); setUploadFile(null); setUploadError(null); }} className="btn-secondary">Annuler</button>
                    <button type="submit" disabled={uploading || !uploadFile} className="btn-primary disabled:opacity-50">{uploading ? 'Téléversement...' : 'Soumettre'}</button>
                  </div>
                </form>
              </Modal>
            </>
          )}
        </>
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
