import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isAdmin, isReadOnly } from '../lib/supabase';
import type { Race, Stage, Category, Registration, Rider, Result } from '../lib/types';
import { PageHeader, EmptyState, Spinner, Badge } from '../components/ui';
import { fullName, formatDate } from '../lib/hooks';
import { getActiveScale, pointsForPosition } from '../lib/points';
import { BarChart3, Flag, ChevronRight, Save, Loader2, FileDown, Upload, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type Status = 'finished' | 'DNF' | 'DNS' | 'DSQ';

interface Row {
  rider_id: string;
  name: string;
  bib: number | null;
  position: string;
  finish_time: string;
  status: Status;
  result_id: string | null;
}

export default function Results() {
  const { role } = useAuth();
  const admin = isAdmin(role);
  const readOnly = isReadOnly(role);
  const [stages, setStages] = useState<Stage[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedRace, setSelectedRace] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState<{ position: number; points: number }[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<Row[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [s, r, c] = await Promise.all([
        supabase.from('stages').select('*').order('stage_date', { ascending: false }),
        supabase.from('races').select('*'),
        supabase.from('categories').select('id, name'),
      ]);
      setStages((s.data as Stage[]) ?? []);
      setRaces((r.data as Race[]) ?? []);
      setCats((c.data as Category[]) ?? []);
      setScale(await getActiveScale());
      setLoading(false);
    })();
  }, []);

  const stageRaces = races.filter((r) => r.stage_id === selectedStage);
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? '—';
  const stageName = (id: string) => stages.find((s) => s.id === id)?.name ?? '—';
  const stageDate = (id: string) => formatDate(stages.find((s) => s.id === id)?.stage_date ?? null);

  const loadRace = async (raceId: string) => {
    setSelectedRace(raceId);
    const [rg, rs] = await Promise.all([
      supabase.from('registrations').select('*').eq('race_id', raceId).eq('status', 'validated'),
      supabase.from('results').select('*').eq('race_id', raceId),
    ]);
    const riderIds = Array.from(new Set([...(rg.data ?? []).map((x) => (x as Registration).rider_id)]));
    let riders: Rider[] = [];
    if (riderIds.length) {
      const { data: rd } = await supabase.from('riders').select('*').in('id', riderIds);
      riders = (rd as Rider[]) ?? [];
    }
    const results = (rs.data as Result[]) ?? [];
    const newRows: Row[] = (rg.data as Registration[] ?? []).map((reg) => {
      const r = riders.find((x) => x.id === reg.rider_id);
      const res = results.find((x) => x.rider_id === reg.rider_id);
      return {
        rider_id: reg.rider_id,
        name: r ? fullName(r.first_name, r.last_name) : '—',
        bib: reg.bib_number,
        position: res?.position?.toString() ?? '',
        finish_time: res?.finish_time ?? '',
        status: (res?.status ?? 'finished') as Status,
        result_id: res?.id ?? null,
      };
    });
    newRows.sort((a, b) => (a.bib ?? 999) - (b.bib ?? 999));
    setRows(newRows);
  };

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    if (!selectedRace) return;
    setSaving(true);
    const upserts = rows.map((r) => {
      const pos = r.status === 'finished' && r.position ? Number(r.position) : null;
      const points = pointsForPosition(pos, r.status, scale);
      const payload = {
        race_id: selectedRace,
        rider_id: r.rider_id,
        position: pos,
        finish_time: r.finish_time ? r.finish_time : null,
        gap: null,
        status: r.status,
        points,
      };
      if (r.result_id) {
        return supabase.from('results').update({ ...payload }).eq('id', r.result_id);
      }
      return supabase.from('results').insert(payload);
    });
    await Promise.all(upserts);
    await loadRace(selectedRace);
    setSaving(false);
  };

  // --- PDF Export ---
  const exportPDF = () => {
    if (!selectedRace) return;
    const race = races.find((r) => r.id === selectedRace);
    const stage = stages.find((s) => s.id === race?.stage_id);
    const catLabel = catName(race?.category_id ?? '');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Classement — Fédération Tunisienne de Cyclisme', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Manche: ${stage?.name ?? '—'}`, 14, 32);
    doc.text(`Date: ${stageDate(race?.stage_id ?? '')}`, 14, 38);
    doc.text(`Catégorie: ${catLabel}`, 14, 44);
    doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 14, 50);

    const sorted = [...rows].sort((a, b) => {
      if (a.status !== 'finished' && b.status === 'finished') return 1;
      if (a.status === 'finished' && b.status !== 'finished') return -1;
      const pa = a.position ? Number(a.position) : 9999;
      const pb = b.position ? Number(b.position) : 9999;
      return pa - pb;
    });

    autoTable(doc, {
      startY: 56,
      head: [['Pos.', 'Dossard', 'Coureur', 'Temps', 'Statut', 'Pts']],
      body: sorted.map((r) => [
        r.status === 'finished' ? (r.position || '—') : r.status,
        r.bib ?? '—',
        r.name,
        r.finish_time || '—',
        r.status === 'finished' ? 'Finish' : r.status,
        pointsForPosition(r.status === 'finished' && r.position ? Number(r.position) : null, r.status, scale),
      ]),
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`classement-${stage?.name ?? 'course'}-${catLabel}.pdf`);
  };

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

      const parsed: Row[] = data.map((d) => {
        const bib = Number(d['Dossard'] ?? d['dossard'] ?? d['Bib'] ?? d['bib'] ?? '');
        const matchingRow = rows.find((r) => r.bib === bib);
        const statusRaw = String(d['Statut'] ?? d['statut'] ?? d['Status'] ?? d['status'] ?? 'finished').toLowerCase();
        const status: Status =
          statusRaw === 'dnf' ? 'DNF' :
          statusRaw === 'dns' ? 'DNS' :
          statusRaw === 'dsq' ? 'DSQ' : 'finished';
        return {
          rider_id: matchingRow?.rider_id ?? '',
          name: String(d['Coureur'] ?? d['coureur'] ?? d['Nom'] ?? d['nom'] ?? matchingRow?.name ?? '—'),
          bib: isNaN(bib) ? null : bib,
          position: String(d['Position'] ?? d['position'] ?? d['Pos'] ?? d['pos'] ?? ''),
          finish_time: String(d['Temps'] ?? d['temps'] ?? d['Time'] ?? d['time'] ?? ''),
          status,
          result_id: matchingRow?.result_id ?? null,
        };
      });

      // Only keep rows that match a validated rider by bib
      const matched = parsed.filter((p) => rows.some((r) => r.bib === p.bib));
      if (matched.length === 0) {
        setImportError('Aucun dossard du fichier ne correspond aux partants validés. Vérifiez la colonne "Dossard".');
        return;
      }

      setImportData(matched);
    } catch {
      setImportError('Impossible de lire le fichier. Utilisez un fichier Excel (.xlsx) valide.');
    }
  };

  const applyImport = async () => {
    if (!importData || !selectedRace) return;
    setSaving(true);
    const upserts = importData.map((r) => {
      const pos = r.status === 'finished' && r.position ? Number(r.position) : null;
      const points = pointsForPosition(pos, r.status, scale);
      const payload = {
        race_id: selectedRace,
        rider_id: r.rider_id,
        position: pos,
        finish_time: r.finish_time || null,
        gap: null,
        status: r.status,
        points,
      };
      if (r.result_id) {
        return supabase.from('results').update({ ...payload }).eq('id', r.result_id);
      }
      return supabase.from('results').insert(payload);
    });
    await Promise.all(upserts);
    setImportOpen(false);
    setImportData(null);
    setSaving(false);
    await loadRace(selectedRace);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Résultats" subtitle="Saisie rapide des résultats et calcul automatique des points" />

      {!selectedStage ? (
        stages.length === 0 ? <EmptyState icon={Flag} title="Aucune manche" /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stages.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedStage(s.id); setSelectedRace(null); setRows([]); }}
                className="card p-5 text-left hover:shadow-card-hover transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-600/10 text-primary-600 grid place-items-center"><Flag className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0"><h3 className="font-semibold truncate">{s.name}</h3><p className="text-xs text-gray-400">{formatDate(s.stage_date)}</p></div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500" />
                </div>
              </button>
            ))}
          </div>
        )
      ) : !selectedRace ? (
        <div>
          <button onClick={() => setSelectedStage(null)} className="btn-ghost mb-4"><ChevronRight className="w-4 h-4 rotate-180" /> Retour</button>
          {stageRaces.length === 0 ? <EmptyState icon={BarChart3} title="Aucune course" description="Ajoutez des courses à cette manche." /> : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stageRaces.map((r) => (
                <button key={r.id} onClick={() => loadRace(r.id)} className="card p-5 text-left hover:shadow-card-hover transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-accent-50 dark:bg-accent-500/10 text-accent-600 grid place-items-center"><BarChart3 className="w-5 h-5" /></div>
                    <div className="flex-1"><h3 className="font-semibold">{catName(r.category_id)}</h3><p className="text-xs text-gray-400">Saisie des résultats</p></div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <button onClick={() => { setSelectedRace(null); setRows([]); }} className="btn-ghost !p-2"><ChevronRight className="w-4 h-4 rotate-180" /></button>
            <div>
              <h2 className="text-xl font-bold">{catName(races.find((r) => r.id === selectedRace)?.category_id ?? '')}</h2>
              <p className="text-sm text-gray-400">{stageName(races.find((r) => r.id === selectedRace)?.stage_id ?? '')} · {rows.length} partant(s)</p>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={exportPDF} disabled={rows.length === 0} className="btn-secondary">
                <FileDown className="w-4 h-4" /> PDF
              </button>
              {admin && (
                <>
                  <button onClick={() => { setImportOpen(true); setImportData(null); setImportError(null); }} className="btn-secondary">
                    <Upload className="w-4 h-4" /> Importer Excel
                  </button>
                  <button onClick={save} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
                  </button>
                </>
              )}
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={BarChart3} title="Aucun partant validé" description="Validez des inscriptions pour cette course." />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/50 text-left text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-3 py-3 font-medium w-14">Dossard</th>
                      <th className="px-3 py-3 font-medium">Coureur</th>
                      <th className="px-3 py-3 font-medium w-20">Position</th>
                      <th className="px-3 py-3 font-medium w-32">Temps (HH:MM:SS)</th>
                      <th className="px-3 py-3 font-medium w-28">Statut</th>
                      <th className="px-3 py-3 font-medium w-16">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {rows.map((r, i) => {
                      const pts = pointsForPosition(r.status === 'finished' && r.position ? Number(r.position) : null, r.status, scale);
                      return (
                        <tr key={r.rider_id} className="table-row-hover">
                          <td className="px-3 py-2 font-mono font-semibold text-primary-600">{r.bib ?? '—'}</td>
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2">
                            <input type="number" min="1" value={r.position} disabled={readOnly || !admin || r.status !== 'finished'} onChange={(e) => updateRow(i, { position: e.target.value })} className="input !py-1.5 !px-2 text-sm w-16" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" value={r.finish_time} disabled={readOnly || !admin || r.status !== 'finished'} onChange={(e) => updateRow(i, { finish_time: e.target.value })} placeholder="01:23:45" className="input !py-1.5 !px-2 text-sm font-mono w-28" />
                          </td>
                          <td className="px-3 py-2">
                            <select value={r.status} disabled={readOnly || !admin} onChange={(e) => updateRow(i, { status: e.target.value as Status })} className="input !py-1.5 !px-2 text-sm">
                              <option value="finished">Finish</option>
                              <option value="DNF">DNF</option>
                              <option value="DNS">DNS</option>
                              <option value="DSQ">DSQ</option>
                            </select>
                          </td>
                          <td className="px-3 py-2"><Badge color="blue">{pts}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Excel Import Modal */}
          {importOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="card p-6 w-full max-w-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Importer les résultats depuis Excel</h3>
                  <button onClick={() => setImportOpen(false)} className="btn-ghost !p-1.5"><X className="w-5 h-5" /></button>
                </div>

                {!importData ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Le fichier Excel doit contenir une colonne <strong>Dossard</strong> au minimum.
                      Colonnes reconnues: Dossard, Position, Temps, Statut (finished/DNF/DNS/DSQ), Coureur.
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                      className="hidden"
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
                      {importData.length} résultat(s) prêt(s) à être importés. Vérifiez puis cliquez sur Appliquer.
                    </div>
                    <div className="max-h-60 overflow-y-auto card overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800/50 text-left text-xs uppercase text-gray-400">
                          <tr><th className="px-3 py-2">Dossard</th><th className="px-3 py-2">Coureur</th><th className="px-3 py-2">Pos.</th><th className="px-3 py-2">Temps</th><th className="px-3 py-2">Statut</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                          {importData.map((r, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-mono">{r.bib ?? '—'}</td>
                              <td className="px-3 py-2">{r.name}</td>
                              <td className="px-3 py-2">{r.position || '—'}</td>
                              <td className="px-3 py-2 font-mono text-xs">{r.finish_time || '—'}</td>
                              <td className="px-3 py-2">{r.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setImportData(null); setImportError(null); }} className="btn-secondary">Annuler</button>
                      <button onClick={applyImport} disabled={saving} className="btn-primary">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Appliquer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
