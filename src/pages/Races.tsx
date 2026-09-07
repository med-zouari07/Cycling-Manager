import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isAdmin } from '../lib/supabase';
import type { Stage, Race, Category, Registration, Rider, Result } from '../lib/types';
import { PageHeader, Modal, EmptyState, Spinner, ErrorState, Badge } from '../components/ui';
import { fullName, formatDate, formatInterval } from '../lib/hooks';
import { navigate } from '../lib/router';
import { Bike, Plus, Trash2, Flag, ChevronRight, ClipboardList, BarChart3, Image as ImageIcon, MapPin, Upload, X, FileImage } from 'lucide-react';

async function uploadRaceMedia(file: File, raceId: string, kind: 'circuit' | 'poster'): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${raceId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('race-media').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from('race-media').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export default function Races() {
  const { role } = useAuth();
  const admin = isAdmin(role);
  const [stages, setStages] = useState<Stage[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category_id: '', bib_start: '1', map_embed_url: '' });
  const [circuitPhoto, setCircuitPhoto] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const circuitInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [s, c, r] = await Promise.all([
      supabase.from('stages').select('*').order('stage_date', { ascending: false }),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('races').select('*'),
    ]);
    if (s.error) setError(s.error.message);
    setStages((s.data as Stage[]) ?? []);
    setCats((c.data as Category[]) ?? []);
    setRaces((r.data as Race[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '—';
  const stageRaces = races.filter((r) => r.stage_id === selectedStage);
  const selected = stages.find((s) => s.id === selectedStage);

  const createRace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStage || !form.category_id) return;
    setUploading(true);

    // Insert race first to get the ID
    const { data: newRace, error: insError } = await supabase
      .from('races')
      .insert({
        stage_id: selectedStage,
        category_id: form.category_id,
        bib_start: Number(form.bib_start) || 1,
        map_embed_url: form.map_embed_url || null,
        is_global: true,
      })
      .select()
      .single();

    if (insError || !newRace) {
      setUploading(false);
      setError(insError?.message ?? 'Erreur lors de la création');
      return;
    }

    const raceId = newRace.id;
    let circuitPhotoUrl: string | null = null;
    let posterUrl: string | null = null;
    let uploadError: string | null = null;

    if (circuitPhoto) {
      const res = await uploadRaceMedia(circuitPhoto, raceId, 'circuit');
      circuitPhotoUrl = res.url;
      if (res.error) uploadError = `Photo circuit: ${res.error}`;
    }
    if (posterFile) {
      const res = await uploadRaceMedia(posterFile, raceId, 'poster');
      posterUrl = res.url;
      if (res.error) uploadError = `${uploadError ? uploadError + ' · ' : ''}Affiche: ${res.error}`;
    }

    if (circuitPhotoUrl || posterUrl) {
      await supabase
        .from('races')
        .update({
          ...(circuitPhotoUrl ? { circuit_photo_url: circuitPhotoUrl } : {}),
          ...(posterUrl ? { poster_url: posterUrl } : {}),
        })
        .eq('id', raceId);
    }

    setUploading(false);

    if (uploadError) {
      setError(uploadError);
    } else {
      setOpen(false);
      setForm({ category_id: '', bib_start: '1', map_embed_url: '' });
      setCircuitPhoto(null);
      setPosterFile(null);
      setError(null);
    }
    load();
  };

  const removeRace = async (id: string) => {
    if (!confirm('Supprimer cette course et ses inscriptions/résultats ?')) return;
    await supabase.from('races').delete().eq('id', id);
    load();
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader title="Courses" subtitle="Courses par catégorie au sein de chaque manche" />

      {!selectedStage ? (
        stages.length === 0 ? (
          <EmptyState icon={Flag} title="Aucune manche" description="Créez d'abord des manches pour y ajouter des courses." action={<button onClick={() => navigate('stages')} className="btn-primary">Aller aux manches</button>} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stages.map((s) => {
              const count = races.filter((r) => r.stage_id === s.id).length;
              return (
                <button key={s.id} onClick={() => setSelectedStage(s.id)} className="card p-5 text-left hover:shadow-card-hover transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-600/10 text-primary-600 grid place-items-center"><Flag className="w-5 h-5" /></div>
                    <div className="min-w-0 flex-1"><h3 className="font-semibold truncate">{s.name}</h3><p className="text-xs text-gray-400">{formatDate(s.stage_date)} · {s.city ?? '—'}</p></div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition" />
                  </div>
                  <div className="mt-3 flex items-center gap-2"><Badge color="blue">{count} course(s)</Badge><Badge>{s.stage_type}</Badge></div>
                </button>
              );
            })}
          </div>
        )
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setSelectedStage(null)} className="btn-ghost !p-2"><ChevronRight className="w-4 h-4 rotate-180" /></button>
            <div>
              <h2 className="text-xl font-bold">{selected?.name}</h2>
              <p className="text-sm text-gray-400">{formatDate(selected?.stage_date ?? null)} · {selected?.city ?? '—'} · {selected?.stage_type}</p>
            </div>
            {admin && <button onClick={() => setOpen(true)} className="btn-primary ml-auto"><Plus className="w-4 h-4" /> Course</button>}
          </div>

          {stageRaces.length === 0 ? (
            <EmptyState icon={Bike} title="Aucune course" description="Les courses sont créées par l'administrateur." action={admin && <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>} />
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              {stageRaces.map((r) => <RaceCard key={r.id} race={r} catName={catName(r.category_id)} readOnly={!admin} onDelete={() => removeRace(r.id)} onRaceUpdated={load} />)}
            </div>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setCircuitPhoto(null); setPosterFile(null); }} title="Nouvelle course" size="lg">
        <form onSubmit={createRace} className="space-y-4">
          <div><label className="label">Catégorie *</label><select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input"><option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">Dossard de départ</label><input type="number" value={form.bib_start} onChange={(e) => setForm({ ...form, bib_start: e.target.value })} className="input" /></div>

          <div>
            <label className="label flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> Itinéraire de course (Google Maps embed)</label>
            <input
              value={form.map_embed_url}
              onChange={(e) => setForm({ ...form, map_embed_url: e.target.value })}
              placeholder="https://www.google.com/maps/embed?pb=..."
              className="input"
            />
            <p className="text-xs text-gray-400 mt-1">Collez l'URL d'intégration Google Maps (Partager → Intégrer une carte → Copier le code HTML, extrayez l'URL src).</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-gray-400" /> Photo du circuit</label>
              <input
                ref={circuitInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setCircuitPhoto(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => circuitInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-4 text-center hover:border-primary-400 transition"
              >
                {circuitPhoto ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-primary-600">
                    <FileImage className="w-4 h-4" />
                    <span className="truncate max-w-[140px]">{circuitPhoto.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setCircuitPhoto(null); }} className="text-error-500"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-sm text-gray-400">
                    <Upload className="w-5 h-5" />
                    <span>Cliquez pour téléverser</span>
                  </div>
                )}
              </button>
            </div>

            <div>
              <label className="label flex items-center gap-1.5"><FileImage className="w-4 h-4 text-gray-400" /> Affiche de la course</label>
              <input
                ref={posterInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => posterInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-4 text-center hover:border-primary-400 transition"
              >
                {posterFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-primary-600">
                    <FileImage className="w-4 h-4" />
                    <span className="truncate max-w-[140px]">{posterFile.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setPosterFile(null); }} className="text-error-500"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-sm text-gray-400">
                    <Upload className="w-5 h-5" />
                    <span>Cliquez pour téléverser</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setOpen(false); setCircuitPhoto(null); setPosterFile(null); }} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={uploading} className="btn-primary disabled:opacity-50">
              {uploading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function RaceCard({ race, catName, readOnly, onDelete, onRaceUpdated }: { race: Race; catName: string; readOnly: boolean; onDelete: () => void; onRaceUpdated: () => void }) {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [riders, setRiders] = useState<Record<string, Rider>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [tab, setTab] = useState<'info' | 'list' | 'results'>(
    race.circuit_photo_url || race.map_embed_url || race.poster_url ? 'info' : 'list',
  );
  const [editMedia, setEditMedia] = useState(false);
  const [mediaForm, setMediaForm] = useState({
    map_embed_url: race.map_embed_url ?? '',
  });
  const [newCircuitPhoto, setNewCircuitPhoto] = useState<File | null>(null);
  const [newPoster, setNewPoster] = useState<File | null>(null);
  const [savingMedia, setSavingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const editCircuitRef = useRef<HTMLInputElement>(null);
  const editPosterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [rg, rs] = await Promise.all([
        supabase.from('registrations').select('*').eq('race_id', race.id),
        supabase.from('results').select('*').eq('race_id', race.id).order('position', { ascending: true, nullsFirst: false }),
      ]);
      setRegs((rg.data as Registration[]) ?? []);
      setResults((rs.data as Result[]) ?? []);
      const riderIds = Array.from(new Set([...(rg.data ?? []).map((x) => (x as Registration).rider_id), ...(rs.data ?? []).map((x) => (x as Result).rider_id)]));
      if (riderIds.length) {
        const { data: rd } = await supabase.from('riders').select('*').in('id', riderIds);
        const map: Record<string, Rider> = {};
        (rd as Rider[] ?? []).forEach((r) => { map[r.id] = r; });
        setRiders(map);
      }
    })();
  }, [race.id]);

  const validated = regs.filter((r) => r.status === 'validated');
  const riderName = (id: string) => { const r = riders[id]; return r ? fullName(r.first_name, r.last_name) : '—'; };

  const hasMedia = race.circuit_photo_url || race.map_embed_url || race.poster_url;

  const saveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMedia(true);
    setMediaError(null);

    let circuitPhotoUrl: string | null = null;
    let posterUrl: string | null = null;
    let uploadError: string | null = null;

    if (newCircuitPhoto) {
      const res = await uploadRaceMedia(newCircuitPhoto, race.id, 'circuit');
      circuitPhotoUrl = res.url;
      if (res.error) uploadError = `Photo circuit: ${res.error}`;
    }
    if (newPoster) {
      const res = await uploadRaceMedia(newPoster, race.id, 'poster');
      posterUrl = res.url;
      if (res.error) uploadError = `${uploadError ? uploadError + ' · ' : ''}Affiche: ${res.error}`;
    }

    const updatePayload: Record<string, string | null> = {
      map_embed_url: mediaForm.map_embed_url || null,
    };
    if (circuitPhotoUrl) updatePayload.circuit_photo_url = circuitPhotoUrl;
    if (posterUrl) updatePayload.poster_url = posterUrl;

    const { error: updError } = await supabase.from('races').update(updatePayload).eq('id', race.id);

    setSavingMedia(false);

    if (updError) {
      setMediaError(updError.message);
      return;
    }
    if (uploadError) {
      setMediaError(uploadError);
      return;
    }

    setEditMedia(false);
    setNewCircuitPhoto(null);
    setNewPoster(null);
    onRaceUpdated();
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-500/10 text-accent-600 grid place-items-center"><Bike className="w-5 h-5" /></div>
          <div><h3 className="font-semibold">{catName}</h3><p className="text-xs text-gray-400">{validated.length} partant(s) · {results.length} résultat(s)</p></div>
        </div>
        {!readOnly && <button onClick={onDelete} className="btn-ghost !p-1.5 hover:text-error-500"><Trash2 className="w-4 h-4" /></button>}
      </div>

      <div className="flex border-b border-gray-100 dark:border-slate-800">
        <button onClick={() => setTab('info')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === 'info' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400'}`}>
          <ImageIcon className="w-4 h-4 inline mr-1.5" />Annonce
        </button>
        <button onClick={() => setTab('list')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === 'list' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400'}`}><ClipboardList className="w-4 h-4 inline mr-1.5" />Liste de départ</button>
        <button onClick={() => setTab('results')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === 'results' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400'}`}><BarChart3 className="w-4 h-4 inline mr-1.5" />Résultats</button>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {tab === 'info' && (
          <div className="space-y-4">
            {!readOnly && (
              <div className="flex justify-end">
                <button onClick={() => setEditMedia(!editMedia)} className="btn-ghost !py-1.5 !px-3 text-sm">
                  <ImageIcon className="w-4 h-4" /> {editMedia ? 'Annuler' : 'Modifier'}
                </button>
              </div>
            )}

            {editMedia && !readOnly ? (
              <form onSubmit={saveMedia} className="space-y-4">
                <div>
                  <label className="label flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> Itinéraire Google Maps</label>
                  <input
                    value={mediaForm.map_embed_url}
                    onChange={(e) => setMediaForm({ ...mediaForm, map_embed_url: e.target.value })}
                    placeholder="https://www.google.com/maps/embed?pb=..."
                    className="input"
                  />
                  <p className="text-xs text-gray-400 mt-1">Collez l'URL d'intégration Google Maps.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-gray-400" /> Photo du circuit</label>
                    <input ref={editCircuitRef} type="file" accept="image/*" className="sr-only" onChange={(e) => setNewCircuitPhoto(e.target.files?.[0] ?? null)} />
                    <button type="button" onClick={() => editCircuitRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-4 text-center hover:border-primary-400 transition">
                      {newCircuitPhoto ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-primary-600">
                          <FileImage className="w-4 h-4" />
                          <span className="truncate max-w-[120px]">{newCircuitPhoto.name}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setNewCircuitPhoto(null); }} className="text-error-500"><X className="w-4 h-4" /></button>
                        </div>
                      ) : race.circuit_photo_url ? (
                        <div className="flex flex-col items-center gap-1 text-sm text-gray-400">
                          <img src={race.circuit_photo_url} alt="Circuit actuel" className="w-full h-20 object-cover rounded-lg mb-1" />
                          <span>Remplacer</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-sm text-gray-400">
                          <Upload className="w-5 h-5" />
                          <span>Téléverser</span>
                        </div>
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="label flex items-center gap-1.5"><FileImage className="w-4 h-4 text-gray-400" /> Affiche</label>
                    <input ref={editPosterRef} type="file" accept="image/*" className="sr-only" onChange={(e) => setNewPoster(e.target.files?.[0] ?? null)} />
                    <button type="button" onClick={() => editPosterRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 p-4 text-center hover:border-primary-400 transition">
                      {newPoster ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-primary-600">
                          <FileImage className="w-4 h-4" />
                          <span className="truncate max-w-[120px]">{newPoster.name}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setNewPoster(null); }} className="text-error-500"><X className="w-4 h-4" /></button>
                        </div>
                      ) : race.poster_url ? (
                        <div className="flex flex-col items-center gap-1 text-sm text-gray-400">
                          <img src={race.poster_url} alt="Affiche actuelle" className="w-full h-20 object-cover rounded-lg mb-1" />
                          <span>Remplacer</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-sm text-gray-400">
                          <Upload className="w-5 h-5" />
                          <span>Téléverser</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {mediaError && (
                  <div className="rounded-xl bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/30 px-4 py-3 text-sm text-error-700 dark:text-error-400">
                    {mediaError}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setEditMedia(false); setNewCircuitPhoto(null); setNewPoster(null); setMediaError(null); }} className="btn-secondary">Annuler</button>
                  <button type="submit" disabled={savingMedia} className="btn-primary disabled:opacity-50">
                    {savingMedia ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            ) : hasMedia ? (
              <>
                {race.poster_url && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">Affiche</h4>
                    <img src={race.poster_url} alt="Affiche de la course" className="w-full rounded-xl border border-gray-200 dark:border-slate-700" />
                  </div>
                )}
                {race.circuit_photo_url && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">Photo du circuit</h4>
                    <img src={race.circuit_photo_url} alt="Circuit" className="w-full rounded-xl border border-gray-200 dark:border-slate-700" />
                  </div>
                )}
                {race.map_embed_url && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-400 mb-2">Itinéraire</h4>
                    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                      <iframe
                        src={race.map_embed_url}
                        width="100%"
                        height="300"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Itinéraire de la course"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-sm text-gray-400 py-6">
                Aucune annonce publiée pour cette course.
                {!readOnly && <div className="mt-2">Cliquez sur "Modifier" pour ajouter une photo, un itinéraire ou une affiche.</div>}
              </div>
            )}
          </div>
        )}

        {tab === 'list' && (
          validated.length === 0 ? <div className="text-center text-sm text-gray-400 py-6">Aucun partant validé.</div> : (
            <table className="w-full text-sm">
              <tbody>
                {validated.sort((a, b) => (a.bib_number ?? 999) - (b.bib_number ?? 999)).map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-slate-800/50 last:border-0">
                    <td className="py-2 w-12"><span className="font-mono font-semibold text-primary-600">{r.bib_number ?? '—'}</span></td>
                    <td className="py-2">{riderName(r.rider_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'results' && (
          results.length === 0 ? <div className="text-center text-sm text-gray-400 py-6">Aucun résultat saisi.</div> : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 text-left"><tr><th className="py-1 w-10">#</th><th className="py-1">Coureur</th><th className="py-1 w-20">Temps</th><th className="py-1 w-14">Pts</th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-slate-800/50 last:border-0">
                    <td className="py-2 font-semibold">{r.status === 'finished' ? r.position ?? '—' : <Badge color={r.status === 'DNF' ? 'red' : 'yellow'}>{r.status}</Badge>}</td>
                    <td className="py-2">{riderName(r.rider_id)}</td>
                    <td className="py-2 text-gray-500 dark:text-slate-400 font-mono text-xs">{formatInterval(r.finish_time)}</td>
                    <td className="py-2 font-semibold text-primary-600">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
