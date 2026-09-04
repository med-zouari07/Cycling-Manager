import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isReadOnly } from '../lib/supabase';
import type { Rider, Club, Category } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { qrSvgDataUrl } from '../lib/qr';
import { fullName, initials, formatDate } from '../lib/hooks';
import { Users, Plus, Pencil, Trash2, Search, QrCode, Download, Upload, X, FileDown, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const empty: Omit<Rider, 'id' | 'created_at'> = {
  first_name: '', last_name: '', photo_url: null, sex: 'M', birth_date: null,
  category_id: null, license_number: '', club_id: null, nationality: '', email: '', phone: '',
  bib_number: null,
};

interface ImportRow {
  first_name: string;
  last_name: string;
  sex: string;
  birth_date: string | null;
  category_name: string;
  license_number: string;
  nationality: string;
  email: string;
  phone: string;
  bib_number: string;
}

export default function Riders() {
  const { role, user } = useAuth();
  const readOnly = isReadOnly(role);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [myClub, setMyClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [qrRider, setQrRider] = useState<Rider | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<ImportRow[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

    if (user) {
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

  const clubName = (id: string | null) => clubs.find((c) => c.id === id)?.name ?? '—';
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? '—';
  const catIdByName = (name: string) => cats.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ?? null;

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

  // --- Excel Import ---
  const handleFile = async (file: File) => {
    setImportError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (data.length === 0) {
        setImportError('Le fichier est vide.');
        return;
      }

      const get = (row: Record<string, unknown>, ...keys: string[]): string => {
        for (const k of keys) {
          for (const key of Object.keys(row)) {
            if (key.toLowerCase().trim() === k.toLowerCase().trim()) {
              return String(row[key] ?? '').trim();
            }
          }
        }
        return '';
      };

      const parsed: ImportRow[] = data.map((row) => ({
        first_name: get(row, 'Prénom', 'Prenom', 'First Name', 'first_name', 'firstname'),
        last_name: get(row, 'Nom', 'Last Name', 'last_name', 'lastname'),
        sex: get(row, 'Sexe', 'Sex', 'sex') || 'M',
        birth_date: get(row, 'Naissance', 'Date de naissance', 'Birth Date', 'birth_date', 'birthdate') || null,
        category_name: get(row, 'Catégorie', 'Categorie', 'Category', 'category'),
        license_number: get(row, 'Licence', 'N° licence', 'License', 'license_number'),
        nationality: get(row, 'Nationalité', 'Nationalite', 'Nationality', 'nationality'),
        email: get(row, 'Email', 'E-mail', 'email'),
        phone: get(row, 'Téléphone', 'Telephone', 'Tel', 'Phone', 'phone'),
        bib_number: get(row, 'Dossard', 'Dossard N°', 'Bib', 'bib_number', 'bib'),
      }));

      const valid = parsed.filter((p) => p.first_name && p.last_name);
      if (valid.length === 0) {
        setImportError('Aucune ligne valide trouvée. Les colonnes "Prénom" et "Nom" sont obligatoires.');
        return;
      }

      setImportData(valid);
    } catch {
      setImportError('Impossible de lire le fichier. Utilisez un fichier Excel (.xlsx) valide.');
    }
  };

  const applyImport = async () => {
    if (!importData) return;
    setImporting(true);
    const clubId = myClub?.id ?? null;

    const rows = importData.map((r) => ({
      first_name: r.first_name,
      last_name: r.last_name,
      sex: (r.sex.toUpperCase().startsWith('F') ? 'F' : 'M') as 'M' | 'F',
      birth_date: r.birth_date || null,
      category_id: r.category_name ? catIdByName(r.category_name) : null,
      license_number: r.license_number || '',
      nationality: r.nationality || '',
      email: r.email || '',
      phone: r.phone || '',
      photo_url: null,
      club_id: clubId,
      bib_number: r.bib_number ? Number(r.bib_number) : null,
    }));

    const { error: insertError } = await supabase.from('riders').insert(rows);
    if (insertError) {
      setImportError(insertError.message);
      setImporting(false);
      return;
    }

    setImportOpen(false);
    setImportData(null);
    setImporting(false);
    load();
  };

  // --- Excel Template Download ---
  const downloadTemplate = () => {
    const template = [
      { Prénom: 'Mohamed', Nom: 'Ben Ali', Sexe: 'M', Naissance: '1998-05-15', Catégorie: 'Elite Homme', Licence: 'TN-00123', Nationalité: 'Tunisienne', Email: 'm.benali@example.com', Téléphone: '+216 22 333 444', Dossard: '1' },
      { Prénom: 'Fatima', Nom: 'Trabelsi', Sexe: 'F', Naissance: '2000-03-22', Catégorie: 'Elite Femme', Licence: 'TN-00124', Nationalité: 'Tunisienne', Email: 'f.trabelsi@example.com', Téléphone: '+216 55 666 777', Dossard: '2' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Coureurs');
    XLSX.writeFile(wb, 'modele-coureurs.xlsx');
  };

  return (
    <div>
      <PageHeader
        title="Coureurs"
        subtitle={`${riders.length} coureur(s) enregistré(s)`}
        action={!readOnly && (
          <div className="flex gap-2">
            <button onClick={() => { setImportOpen(true); setImportData(null); setImportError(null); }} className="btn-secondary">
              <Upload className="w-4 h-4" /> Importer Excel
            </button>
            <button onClick={add} className="btn-primary">
              <Plus className="w-4 h-4" /> Nouveau coureur
            </button>
          </div>
        )}
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
                  <th className="px-4 py-3 font-medium">Dossard</th>
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
                    <td className="px-4 py-3 font-mono font-semibold text-primary-600">{r.bib_number ?? '—'}</td>
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
          <div><label className="label">Dossard</label><input type="number" value={form.bib_number ?? ''} onChange={(e) => setForm({ ...form, bib_number: e.target.value ? Number(e.target.value) : null })} className="input" /></div>
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

      {/* Excel Import Modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importer des coureurs depuis Excel" size="lg">
        {!importData ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Importez plusieurs coureurs en une seule fois depuis un fichier Excel (.xlsx).
              Les colonnes reconnues sont: <strong>Prénom</strong>, <strong>Nom</strong>, Dossard, Sexe, Naissance,
              Catégorie, Licence, Nationalité, Email, Téléphone.
              Les colonnes "Prénom" et "Nom" sont obligatoires.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={downloadTemplate} className="btn-secondary">
                <FileDown className="w-4 h-4" /> Télécharger le modèle
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="sr-only"
            />
            <button onClick={() => fileRef.current?.click()} className="btn-primary w-full">
              <Upload className="w-4 h-4" /> Choisir un fichier Excel
            </button>
            {importError && (
              <div className="text-sm text-error-500 bg-error-50 dark:bg-error-500/10 rounded-lg p-3">{importError}</div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 dark:text-slate-400">
              {importData.length} coureur(s) prêt(s) à être importés. Vérifiez puis cliquez sur Importer.
            </div>
            <div className="max-h-72 overflow-y-auto card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/50 text-left text-xs uppercase text-gray-400 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Prénom</th>
                    <th className="px-3 py-2">Nom</th>
                    <th className="px-3 py-2">Dossard</th>
                    <th className="px-3 py-2">Sexe</th>
                    <th className="px-3 py-2">Cat.</th>
                    <th className="px-3 py-2">Licence</th>
                    <th className="px-3 py-2">Nationalité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {importData.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">{r.first_name}</td>
                      <td className="px-3 py-2">{r.last_name}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-primary-600">{r.bib_number || '—'}</td>
                      <td className="px-3 py-2">{r.sex}</td>
                      <td className="px-3 py-2 text-gray-400">{r.category_name || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.license_number || '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{r.nationality || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setImportData(null); setImportError(null); }} className="btn-secondary">Annuler</button>
              <button onClick={applyImport} disabled={importing} className="btn-primary">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importer {importData.length} coureur(s)
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
