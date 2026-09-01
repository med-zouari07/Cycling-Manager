import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { isReadOnly } from '../lib/supabase';
import type { Race, Stage, Category, Registration, Rider, Result } from '../lib/types';
import { PageHeader, EmptyState, Spinner, Badge } from '../components/ui';
import { fullName } from '../lib/hooks';
import { getActiveScale, pointsForPosition } from '../lib/points';
import { BarChart3, Flag, ChevronRight, Save, Loader2 } from 'lucide-react';

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
    // reload to capture ids
    await loadRace(selectedRace);
    setSaving(false);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Résultats" subtitle="Saisie rapide des résultats et calcul automatique des points" />

      {!selectedStage ? (
        stages.length === 0 ? <EmptyState icon={Flag} title="Aucune manche" /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stages.map((s) => (
              <button key={s.id} onClick={() => { setSelectedStage(s.id); setSelectedRace(null); setRows([]); }} className="card p-5 text-left hover:shadow-card-hover transition group">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-600/10 text-primary-600 grid place-items-center"><Flag className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0"><h3 className="font-semibold truncate">{s.name}</h3><p className="text-xs text-gray-400">{stageRaces.length} course(s)</p></div>
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
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => { setSelectedRace(null); setRows([]); }} className="btn-ghost !p-2"><ChevronRight className="w-4 h-4 rotate-180" /></button>
            <div><h2 className="text-xl font-bold">{catName(races.find((r) => r.id === selectedRace)?.category_id ?? '')}</h2><p className="text-sm text-gray-400">{rows.length} partant(s)</p></div>
            {!readOnly && (
              <button onClick={save} disabled={saving} className="btn-primary ml-auto">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
              </button>
            )}
          </div>

          {rows.length === 0 ? <EmptyState icon={BarChart3} title="Aucun partant validé" description="Validez des inscriptions pour cette course." /> : (
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
                            <input type="number" min="1" value={r.position} disabled={readOnly || r.status !== 'finished'} onChange={(e) => updateRow(i, { position: e.target.value })} className="input !py-1.5 !px-2 text-sm w-16" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" value={r.finish_time} disabled={readOnly || r.status !== 'finished'} onChange={(e) => updateRow(i, { finish_time: e.target.value })} placeholder="01:23:45" className="input !py-1.5 !px-2 text-sm font-mono w-28" />
                          </td>
                          <td className="px-3 py-2">
                            <select value={r.status} disabled={readOnly} onChange={(e) => updateRow(i, { status: e.target.value as Status })} className="input !py-1.5 !px-2 text-sm">
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
        </div>
      )}
    </div>
  );
}
