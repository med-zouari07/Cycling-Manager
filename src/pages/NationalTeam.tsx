import { useEffect, useState, useRef } from 'react';
import { supabase, isAdmin } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { NationalTeamAthlete, NationalTeamDocument, Category } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { fullName, formatDate } from '../lib/hooks';
import {
  Plus, Trash2, Pencil, FileText, Upload, X, FileImage,
  Download, Users, Award,
} from 'lucide-react';

async function uploadDocument(file: File, path: string): Promise<{ url: string | null; error: string | null }> {
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from('documents').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

const CURRENT_SEASON = '2026';


export default function NationalTeam() {
  const { role } = useAuth();
  const admin = isAdmin(role);
  const [athletes, setAthletes] = useState<NationalTeamAthlete[]>([]);
  const [docs, setDocs] = useState<NationalTeamDocument[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', sex: '', birth_date: '',
    category_id: '', nationality: '', license_number: '',
  });
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // document management modal
  const [docAthlete, setDocAthlete] = useState<NationalTeamAthlete | null>(null);
  const [docLabel, setDocLabel] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [a, d, c] = await Promise.all([
      supabase.from('national_team_athletes').select('*').order('last_name'),
      supabase.from('national_team_documents').select('*'),
      supabase.from('categories').select('id, name').order('name'),
    ]);
    if (a.error) setError(a.error.message);
    setAthletes((a.data as NationalTeamAthlete[]) ?? []);
    setDocs((d.data as NationalTeamDocument[]) ?? []);
    setCats((c.data as Category[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? 'Sans catégorie';
  const athleteDocs = (id: string) => docs.filter((d) => d.athlete_id === id);

  // Group athletes by category
  const categories = cats.filter((c) => athletes.some((a) => a.category_id === c.id));
  const uncategorized = athletes.filter((a) => !a.category_id);
  const grouped = [
    ...categories.map((c) => ({ cat: c, list: athletes.filter((a) => a.category_id === c.id) })),
    ...(uncategorized.length > 0 ? [{ cat: { id: '_none', name: 'Sans catégorie', description: null, created_at: '' } as Category, list: uncategorized }] : []),
  ];

  const visibleList = selectedCat
    ? athletes.filter((a) => a.category_id === selectedCat || (selectedCat === '_none' && !a.category_id))
    : athletes;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let passportUrl: string | null = null;
    if (passportFile) {
      const ext = passportFile.name.split('.').pop() ?? 'pdf';
      const res = await uploadDocument(passportFile, `passports/${Date.now()}.${ext}`);
      passportUrl = res.url;
      if (res.error) { setError(res.error); setSaving(false); return; }
    }
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      sex: (form.sex as 'M' | 'F') || null,
      birth_date: form.birth_date || null,
      category_id: form.category_id || null,
      nationality: form.nationality || null,
      license_number: form.license_number || null,
      ...(passportUrl ? { passport_url: passportUrl } : {}),
    };
    if (editId) {
      await supabase.from('national_team_athletes').update(payload).eq('id', editId);
    } else {
      await supabase.from('national_team_athletes').insert(payload);
    }
    setSaving(false);
    setOpen(false);
    setPassportFile(null);
    resetForm();
    load();
  };

  const resetForm = () => {
    setEditId(null);
    setForm({ first_name: '', last_name: '', sex: '', birth_date: '', category_id: '', nationality: '', license_number: '' });
  };

  const edit = (a: NationalTeamAthlete) => {
    setEditId(a.id);
    setForm({
      first_name: a.first_name, last_name: a.last_name, sex: a.sex ?? '', birth_date: a.birth_date ?? '',
      category_id: a.category_id ?? '', nationality: a.nationalality ?? '', license_number: a.license_number ?? '',
    });
    setOpen(true);
  };

  const add = () => { resetForm(); setOpen(true); };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cet athlète et ses documents ?')) return;
    await supabase.from('national_team_athletes').delete().eq('id', id);
    load();
  };

  const addDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docAthlete || !docFile || !docLabel) return;
    setDocSaving(true);
    setDocError(null);
    const ext = docFile.name.split('.').pop() ?? 'pdf';
    const path = `national-team/${docAthlete.id}/${Date.now()}-${docLabel.replace(/\s+/g, '-')}.${ext}`;
    const res = await uploadDocument(docFile, path);
    if (res.error) { setDocError(res.error); setDocSaving(false); return; }
    await supabase.from('national_team_documents').insert({
      athlete_id: docAthlete.id,
      label: docLabel,
      file_url: res.url,
    });
    setDocSaving(false);
    setDocFile(null);
    setDocLabel('');
    load();
  };

  const removeDoc = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    await supabase.from('national_team_documents').delete().eq('id', id);
    load();
  };

  const replacePassport = async (athlete: NationalTeamAthlete, file: File) => {
    const ext = file.name.split('.').pop() ?? 'pdf';
    const res = await uploadDocument(file, `passports/${athlete.id}.${ext}`);
    if (res.error) { setError(res.error); return; }
    await supabase.from('national_team_athletes').update({ passport_url: res.url }).eq('id', athlete.id);
    load();
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Équipe Nationale"
        subtitle={`${athletes.length} athlète(s) · passeports et documents par catégorie`}
        action={admin && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter un athlète</button>}
      />

      {/* Category filter pills */}
      {grouped.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCat(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCat === null ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
          >
            Tous ({athletes.length})
          </button>
          {grouped.map((g) => (
            <button
              key={g.cat.id}
              onClick={() => setSelectedCat(g.cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCat === g.cat.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
            >
              {g.cat.name} ({g.list.length})
            </button>
          ))}
        </div>
      )}

      {visibleList.length === 0 ? (
        <EmptyState icon={Award} title="Aucun athlète" description={admin ? 'Ajoutez les athlètes de l\'équipe nationale par catégorie.' : 'Les athlètes seront ajoutés par l\'administrateur.'} action={admin && <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>} />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {visibleList.map((a) => (
            <div key={a.id} className="card overflow-hidden">
              <div className="flex items-start gap-4 p-5">
                <div className="w-14 h-14 rounded-xl bg-primary-50 dark:bg-primary-600/10 text-primary-600 grid place-items-center overflow-hidden shrink-0">
                  {a.photo_url ? <img src={a.photo_url} alt="" className="w-full h-full object-cover" /> : <Users className="w-7 h-7" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{fullName(a.first_name, a.last_name)}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Badge color="blue">{catName(a.category_id)}</Badge>
                    {a.sex && <Badge>{a.sex === 'M' ? 'Homme' : 'Femme'}</Badge>}
                    {a.nationality && <Badge>{a.nationality}</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {a.birth_date ? `Né(e) ${formatDate(a.birth_date)}` : '—'}
                    {a.license_number ? ` · Licence ${a.license_number}` : ''}
                  </p>
                </div>
                {admin && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => edit(a)} className="btn-ghost !p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(a.id)} className="btn-ghost !p-1.5 hover:text-error-500" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              {/* Passport */}
              <div className="px-5 pb-3">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-slate-300">Passeport / Visa</span>
                  </div>
                  {a.passport_url ? (
                    <a href={a.passport_url} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                      <Download className="w-4 h-4" /> Voir
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">Non fourni</span>
                  )}
                </div>
                {admin && (
                  <div className="mt-1.5">
                    <input ref={passportInputRef} type="file" accept="image/*,application/pdf" className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) replacePassport(a, f); }} />
                    <button onClick={() => passportInputRef.current?.click()} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                      {a.passport_url ? 'Remplacer le passeport' : 'Téléverser le passeport'}
                    </button>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="border-t border-gray-100 dark:border-slate-800 px-5 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase text-gray-400">Documents</span>
                  {admin && (
                    <button onClick={() => { setDocAthlete(a); setDocError(null); }} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  )}
                </div>
                {athleteDocs(a.id).length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun document.</p>
                ) : (
                  <div className="space-y-1.5">
                    {athleteDocs(a.id).map((d) => (
                      <div key={d.id} className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-slate-800/50 px-3 py-2">
                        <FileImage className="w-4 h-4 text-gray-400 shrink-0" />
                        <a href={d.file_url} target="_blank" rel="noreferrer" className="text-sm text-gray-700 dark:text-slate-300 hover:text-primary-600 truncate flex-1">{d.label}</a>
                        {admin && <button onClick={() => removeDoc(d.id)} className="btn-ghost !p-1 hover:text-error-500"><X className="w-3.5 h-3.5" /></button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit athlete modal */}
      <Modal open={open} onClose={() => { setOpen(false); setPassportFile(null); resetForm(); }} title={editId ? 'Modifier l\'athlète' : 'Nouvel athlète'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Prénom *</label><input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input" /></div>
            <div><label className="label">Nom *</label><input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input" /></div>
            <div><label className="label">Sexe</label><select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} className="input"><option value="">—</option><option value="M">Homme</option><option value="F">Femme</option></select></div>
            <div><label className="label">Date de naissance</label><input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="input" /></div>
            <div><label className="label">Catégorie</label><select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input"><option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label">Nationalité</label><input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} className="input" /></div>
            <div><label className="label">Numéro de licence</label><input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className="input" /></div>
          </div>
          {!editId && (
            <div>
              <label className="label flex items-center gap-1.5"><FileText className="w-4 h-4 text-gray-400" /> Passeport / Visa</label>
              <input ref={passportInputRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setPassportFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => passportInputRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-4 text-center hover:border-primary-400 transition">
                {passportFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-primary-600">
                    <FileText className="w-4 h-4" />
                    <span className="truncate max-w-[200px]">{passportFile.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setPassportFile(null); }} className="text-error-500"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-sm text-gray-400">
                    <Upload className="w-5 h-5" />
                    <span>Téléverser un passeport (optionnel)</span>
                  </div>
                )}
              </button>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setOpen(false); setPassportFile(null); resetForm(); }} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Enregistrement...' : editId ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </Modal>

      {/* Add document modal */}
      <Modal open={!!docAthlete} onClose={() => { setDocAthlete(null); setDocFile(null); setDocLabel(''); setDocError(null); }} title={`Document — ${docAthlete ? fullName(docAthlete.first_name, docAthlete.last_name) : ''}`} size="md">
        <form onSubmit={addDoc} className="space-y-4">
          <div><label className="label">Nom du document *</label><input required value={docLabel} onChange={(e) => setDocLabel(e.target.value)} placeholder="Certificat médical, licence, etc." className="input" /></div>
          <div>
            <label className="label">Fichier *</label>
            <input ref={docInputRef} type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => docInputRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-4 text-center hover:border-primary-400 transition">
              {docFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-primary-600">
                  <FileText className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{docFile.name}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setDocFile(null); }} className="text-error-500"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-sm text-gray-400">
                  <Upload className="w-5 h-5" />
                  <span>Choisir un fichier</span>
                </div>
              )}
            </button>
          </div>
          {docError && <div className="rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-200 px-4 py-3 text-sm text-error-700">{docError}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setDocAthlete(null); setDocFile(null); setDocLabel(''); setDocError(null); }} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={docSaving || !docFile || !docLabel} className="btn-primary disabled:opacity-50">{docSaving ? 'Enregistrement...' : 'Ajouter'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
