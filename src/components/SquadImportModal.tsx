import React, { useEffect, useMemo, useState } from 'react';
import { Platoon, GuarnicaoEmServicoRow, E193ImportEntry, EscalaAuditoriaEntry } from '../types';
import { parseE193RosterText } from '../services/e193Parser';
import { determinarCgPorIntervalo, EscalaCandidate } from '../services/commandHierarchyService';
import {
  fetchGuarnicoesEmServico,
  importEscalaE193Rpc,
  editarCgManualRpc,
  fetchEscalasAuditoria,
  fetchEscalaCompletaDoDia,
  EscalaDiaRow,
} from '../services/supabaseDataService';
import {
  X,
  Truck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Clock,
  History,
  Pencil,
  Plus,
  Trash2,
  RefreshCw,
  Award,
} from 'lucide-react';

interface SquadImportModalProps {
  // Mantidos por compatibilidade com quem chama o componente (App.tsx),
  // mas a fonte de verdade da composição/CG passou a ser sempre
  // v_guarnicao_em_servico, consultada internamente por este componente.
  squads?: any[];
  users?: any[];
  currentSquads?: any[];
  currentUsers?: any[];
  platoons?: Platoon[];
  onClose: () => void;
  onImportSuccess?: () => void;
  onSquadsUpdated?: (squads: any[], users: any[], platoons: any[]) => void;
}

type TabKey = 'ESCALA' | 'IMPORTAR' | 'HISTORICO';

function todayIso(): string {
  return new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export const SquadImportModal: React.FC<SquadImportModalProps> = ({
  platoons = [],
  onClose,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('ESCALA');
  const [guarnicoes, setGuarnicoes] = useState<GuarnicaoEmServicoRow[]>([]);
  const [loadingEscala, setLoadingEscala] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Importação e-193
  const [rawText, setRawText] = useState('');
  const [previewEntries, setPreviewEntries] = useState<E193ImportEntry[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Submodal: alterar CG manualmente
  const [cgEditSquadId, setCgEditSquadId] = useState<string | null>(null);

  // Submodal: incluir/editar/remover posto manualmente na escala do dia
  const [manualEditTarget, setManualEditTarget] = useState<{
    squadId: string | null;
    callSign: string;
    platoonId: string;
  } | null>(null);

  // Histórico / auditoria
  const [auditoria, setAuditoria] = useState<EscalaAuditoriaEntry[]>([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);

  const loadEscala = async () => {
    setLoadingEscala(true);
    setErrorMsg('');
    try {
      const rows = await fetchGuarnicoesEmServico();
      setGuarnicoes(rows);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao carregar a escala ativa.');
    } finally {
      setLoadingEscala(false);
    }
  };

  useEffect(() => {
    loadEscala();
  }, []);

  useEffect(() => {
    if (activeTab === 'HISTORICO') {
      setLoadingAuditoria(true);
      fetchEscalasAuditoria()
        .then(setAuditoria)
        .catch(err => setErrorMsg(err?.message || 'Falha ao carregar histórico.'))
        .finally(() => setLoadingAuditoria(false));
    }
  }, [activeTab]);

  const guarnicoesPorSquad = useMemo(() => {
    const map = new Map<string, GuarnicaoEmServicoRow[]>();
    guarnicoes.forEach(g => {
      const list = map.get(g.squad_id) || [];
      list.push(g);
      map.set(g.squad_id, list);
    });
    return map;
  }, [guarnicoes]);

  // ---------- Preview da importação e-193 ----------
  const previewBySquad = useMemo(() => {
    const map = new Map<string, E193ImportEntry[]>();
    (previewEntries || []).forEach(e => {
      const list = map.get(e.call_sign) || [];
      list.push(e);
      map.set(e.call_sign, list);
    });
    return map;
  }, [previewEntries]);

  // Estimativa client-side de quem será o CG, só para o COBOM conferir antes de
  // confirmar. A decisão DEFINITIVA é sempre recalculada no servidor por
  // fn_calcular_cg_guarnicao logo após a importação — nunca o contrário.
  const estimatedCgByCallSign = useMemo(() => {
    const result = new Map<string, string>(); // call_sign -> matrícula estimada como CG
    previewBySquad.forEach((entries, callSign) => {
      const candidatos: EscalaCandidate[] = entries.map(e => ({
        militarId: e.matricula,
        matricula: e.matricula,
        postoGraduacao: e.posto_graduacao,
        nomeGuerra: e.nome_guerra,
        funcao: e.funcao_na_guarnicao,
        inicioTurno: e.inicio_turno,
        fimTurno: e.fim_turno,
      }));
      const det = determinarCgPorIntervalo(candidatos);
      for (const [militarId, res] of det.entries()) {
        if (res.isCg) {
          result.set(callSign, militarId);
          break;
        }
      }
    });
    return result;
  }, [previewBySquad]);

  const handleAnalyze = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!rawText.trim()) {
      setErrorMsg('Cole o texto copiado do e-193 antes de analisar.');
      return;
    }
    const entries = parseE193RosterText(rawText);
    if (entries.length === 0) {
      setErrorMsg(
        'Nenhum militar foi identificado no texto colado. Verifique se as colunas ' +
        '(matrícula, posto/nome, função, carga horária, início, fim) vieram separadas por TAB.'
      );
      setPreviewEntries(null);
      return;
    }
    setPreviewEntries(entries);
  };

  const handleConfirmImport = async () => {
    if (!previewEntries || previewEntries.length === 0) return;
    setIsImporting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const result = await importEscalaE193Rpc(previewEntries);
      setSuccessMsg(
        `Escala importada com sucesso: ${result.linhas_importadas} registro(s) de escala gravados, ` +
        `${result.militares_criados} militar(es) novo(s) cadastrado(s) automaticamente, ` +
        `${result.guarnicoes_afetadas} guarnição(ões) com o Comandante de Guarnição recalculado pelo servidor.`
      );
      setPreviewEntries(null);
      setRawText('');
      await loadEscala();
      setActiveTab('ESCALA');
      onImportSuccess?.();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Falha ao gravar a escala importada no Supabase.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-800">

        {/* Header */}
        <div className="px-5 py-3.5 bg-red-800 text-white border-b border-red-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow">
              <Truck className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">Escala de Serviço (e-193)</h3>
              <p className="text-xs text-red-100 font-medium">
                Fonte de verdade: escalas_servico — Comandante de Guarnição sempre calculado pelo servidor
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-red-100 hover:text-white hover:bg-red-700/80 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 bg-slate-100 border-b border-slate-200 shrink-0">
          {([
            { key: 'ESCALA', label: 'Guarnições em Serviço', icon: Layers },
            { key: 'IMPORTAR', label: 'Importar / Colar e-193', icon: FileText },
            { key: 'HISTORICO', label: 'Histórico / Auditoria', icon: History },
          ] as { key: TabKey; label: string; icon: any }[]).map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === t.key
                  ? 'bg-white text-red-800 border-t-2 border-t-red-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Feedback */}
        {successMsg && (
          <div className="mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-lg flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold whitespace-pre-line">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer">✕</button>
          </div>
        )}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3.5 bg-red-50 border-2 border-red-400 text-red-900 text-xs rounded-lg flex items-start justify-between gap-3 shadow-sm shrink-0">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-950">Falha:</div>
                <div className="font-medium text-red-900 mt-0.5 whitespace-pre-line leading-relaxed">{errorMsg}</div>
              </div>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-red-700 hover:text-red-900 text-xs font-bold cursor-pointer shrink-0">✕</button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ---------------- TAB: ESCALA ATIVA ---------------- */}
          {activeTab === 'ESCALA' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">
                  Mostrando quem está de serviço <strong>agora</strong>, direto de <code className="bg-slate-100 px-1 rounded">v_guarnicao_em_servico</code>.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManualEditTarget({ squadId: null, callSign: '', platoonId: platoons[0]?.id || '' })}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Incluir Posto Avulso
                  </button>
                  <button
                    type="button"
                    onClick={loadEscala}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
                    title="Atualizar"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingEscala ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingEscala && <p className="text-sm text-slate-500 py-6 text-center">Carregando escala...</p>}

              {!loadingEscala && guarnicoesPorSquad.size === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Nenhuma guarnição em serviço neste momento. Importe a escala do e-193 na aba ao lado.
                </div>
              )}

              <div className="space-y-4">
                {Array.from(guarnicoesPorSquad.entries()).map(([squadId, rows]) => {
                  const first = rows[0];
                  const cgRow = rows.find(r => r.is_cg);
                  return (
                    <div key={squadId} className="border border-slate-300 rounded-lg overflow-hidden">
                      <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-red-700" /> {first.call_sign}
                            <span className="text-[10px] font-bold text-slate-500">{first.platoon_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            CG: <strong>{cgRow ? `${cgRow.posto_graduacao} ${cgRow.nome_guerra}` : 'Não definido'}</strong>
                            {cgRow?.cg_definido_explicitamente && (
                              <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">MANUAL</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCgEditSquadId(squadId)}
                            className="px-2.5 py-1 bg-white border border-slate-300 hover:border-red-400 hover:text-red-700 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" /> Alterar CG
                          </button>
                          <button
                            type="button"
                            onClick={() => setManualEditTarget({ squadId, callSign: first.call_sign, platoonId: first.platoon_id })}
                            className="px-2.5 py-1 bg-white border border-slate-300 hover:border-red-400 hover:text-red-700 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" /> Editar Escala do Dia
                          </button>
                        </div>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200">
                            <th className="text-left font-semibold px-4 py-1.5">Militar</th>
                            <th className="text-left font-semibold px-4 py-1.5">Função</th>
                            <th className="text-left font-semibold px-4 py-1.5">Turno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(r => (
                            <tr key={r.militar_id} className={`border-b border-slate-100 last:border-0 ${r.is_cg ? 'bg-amber-50/60' : ''}`}>
                              <td className="px-4 py-1.5 font-semibold text-slate-700">
                                {r.posto_graduacao} {r.nome_guerra}
                                {r.is_cg && <Shield className="w-3 h-3 text-amber-600 inline ml-1.5" />}
                              </td>
                              <td className="px-4 py-1.5 text-slate-600">{r.funcao_na_guarnicao}</td>
                              <td className="px-4 py-1.5 text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatDateTime(r.inicio_turno)} — {formatDateTime(r.fim_turno)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------------- TAB: IMPORTAR E-193 ---------------- */}
          {activeTab === 'IMPORTAR' && (
            <div>
              {!previewEntries && (
                <>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Cole abaixo o texto exportado do e-193 (colunas separadas por TAB):
                  </label>
                  <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    rows={14}
                    placeholder={'Ex:\n4º BBM / 1ª CIA / 2º PEL BS / P. PINHEIRO MACHADO\nABT-1496\n3177360\t1º SGT SILVA\tCOMANDANTE DE GUARNIÇÃO\t24\t29/08/2026 08:00\t30/08/2026 08:00\n...'}
                    className="w-full border border-slate-300 rounded-lg p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className="mt-3 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> Analisar Texto
                  </button>
                </>
              )}

              {previewEntries && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-slate-700">
                      Pré-visualização: {previewEntries.length} registro(s) em {previewBySquad.size} viatura(s)
                    </p>
                    <button
                      type="button"
                      onClick={() => setPreviewEntries(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      ← Colar outro texto
                    </button>
                  </div>

                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    ⚠️ O Comandante de Guarnição destacado abaixo é uma <strong>estimativa</strong> para conferência.
                    A definição final é sempre recalculada pelo servidor (função/antiguidade) no momento da gravação.
                  </p>

                  <div className="space-y-3">
                    {Array.from(previewBySquad.entries()).map(([callSign, entries]) => {
                      const estimatedCg = estimatedCgByCallSign.get(callSign);
                      return (
                        <div key={callSign} className="border border-slate-300 rounded-lg overflow-hidden">
                          <div className="bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-800 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-red-700" /> {callSign}
                            <span className="text-[10px] font-bold text-slate-500">{entries[0]?.platoon_name}</span>
                          </div>
                          <table className="w-full text-xs">
                            <tbody>
                              {entries.map((e, idx) => (
                                <tr key={idx} className={`border-b border-slate-100 last:border-0 ${e.matricula === estimatedCg ? 'bg-amber-50/60' : ''}`}>
                                  <td className="px-4 py-1.5 font-semibold text-slate-700">
                                    {e.posto_graduacao} {e.nome_guerra}
                                    {e.matricula === estimatedCg && <Shield className="w-3 h-3 text-amber-600 inline ml-1.5" />}
                                  </td>
                                  <td className="px-4 py-1.5 text-slate-600">{e.funcao_na_guarnicao}</td>
                                  <td className="px-4 py-1.5 text-slate-500">{e.carga_horaria_horas}h</td>
                                  <td className="px-4 py-1.5 text-slate-500">{formatDateTime(e.inicio_turno)} — {formatDateTime(e.fim_turno)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-3">
                    Ao confirmar, a escala de <strong>cada VTR listada acima, para o(s) dia(s) correspondente(s)</strong>, será substituída pelos registros acima.
                  </p>

                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={handleConfirmImport}
                    className="mt-3 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> {isImporting ? 'Gravando no Supabase...' : 'Confirmar Importação'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ---------------- TAB: HISTÓRICO ---------------- */}
          {activeTab === 'HISTORICO' && (
            <div>
              {loadingAuditoria && <p className="text-sm text-slate-500 py-6 text-center">Carregando histórico...</p>}
              {!loadingAuditoria && auditoria.length === 0 && (
                <p className="text-sm text-slate-500 py-6 text-center">Nenhuma alteração registrada ainda.</p>
              )}
              {!loadingAuditoria && auditoria.length > 0 && (
                <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100">
                    <tr className="text-slate-500">
                      <th className="text-left font-semibold px-3 py-2">Quando</th>
                      <th className="text-left font-semibold px-3 py-2">Campo</th>
                      <th className="text-left font-semibold px-3 py-2">De</th>
                      <th className="text-left font-semibold px-3 py-2">Para</th>
                      <th className="text-left font-semibold px-3 py-2">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoria.map(a => (
                      <tr key={a.id} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 text-slate-500">{formatDateTime(a.alterado_em)}</td>
                        <td className="px-3 py-1.5 font-semibold text-slate-700">{a.campo}</td>
                        <td className="px-3 py-1.5 text-slate-500">{a.valor_anterior || '—'}</td>
                        <td className="px-3 py-1.5 text-slate-700 font-medium">{a.valor_novo || '—'}</td>
                        <td className="px-3 py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            a.origem === 'EDICAO_MANUAL' ? 'bg-amber-100 text-amber-800' :
                            a.origem === 'IMPORT_E193' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>{a.origem}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submodal: alterar CG manualmente */}
      {cgEditSquadId && (
        <CgEditModal
          squadId={cgEditSquadId}
          rows={guarnicoesPorSquad.get(cgEditSquadId) || []}
          onClose={() => setCgEditSquadId(null)}
          onSaved={async () => {
            setCgEditSquadId(null);
            await loadEscala();
          }}
          onError={setErrorMsg}
        />
      )}

      {/* Submodal: incluir/editar/remover posto na escala do dia */}
      {manualEditTarget && (
        <ManualEscalaEditModal
          target={manualEditTarget}
          platoons={platoons}
          onClose={() => setManualEditTarget(null)}
          onSaved={async () => {
            setManualEditTarget(null);
            await loadEscala();
            onImportSuccess?.();
          }}
          onError={setErrorMsg}
        />
      )}
    </div>
  );
};

// ============================================================
// Submodal: Alterar Comandante de Guarnição manualmente
// ============================================================
function CgEditModal({
  squadId,
  rows,
  onClose,
  onSaved,
  onError,
}: {
  squadId: string;
  rows: GuarnicaoEmServicoRow[];
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [selectedMilitarId, setSelectedMilitarId] = useState(rows.find(r => r.is_cg)?.militar_id || '');
  const [saving, setSaving] = useState(false);
  const referenceEscalaId = rows[0]?.escala_id;

  const handleSave = async () => {
    if (!selectedMilitarId || !referenceEscalaId) return;
    setSaving(true);
    try {
      await editarCgManualRpc(referenceEscalaId, selectedMilitarId);
      onSaved();
    } catch (err: any) {
      onError(err?.message || 'Falha ao alterar o Comandante de Guarnição.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1600] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600" /> Alterar Comandante de Guarnição
          </h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Exclusivo para o perfil COBOM. Esta alteração fica registrada na auditoria como <strong>EDICAO_MANUAL</strong> e passa a valer para o restante do dia, até nova importação do e-193.
        </p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {rows.map(r => (
            <label
              key={r.militar_id}
              className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer text-sm ${
                selectedMilitarId === r.militar_id ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                checked={selectedMilitarId === r.militar_id}
                onChange={() => setSelectedMilitarId(r.militar_id)}
              />
              <span className="font-semibold">{r.posto_graduacao} {r.nome_guerra}</span>
              <span className="text-[11px] text-slate-500 ml-auto">{r.funcao_na_guarnicao}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedMilitarId}
            className="px-4 py-1.5 text-xs font-bold text-white bg-red-800 hover:bg-red-700 disabled:opacity-60 rounded-lg cursor-pointer"
          >
            {saving ? 'Salvando...' : 'Confirmar Alteração'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Submodal: Incluir / editar / remover posto na escala do DIA
// (lê a escala completa do dia antes de reenviar, para não apagar
// os demais militares — fn_import_escala_e193 substitui a VTR/dia inteira)
// ============================================================
function ManualEscalaEditModal({
  target,
  platoons,
  onClose,
  onSaved,
  onError,
}: {
  target: { squadId: string | null; callSign: string; platoonId: string };
  platoons: Platoon[];
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [callSign, setCallSign] = useState(target.callSign);
  const [platoonId, setPlatoonId] = useState(target.platoonId);
  const [dia] = useState(todayIso());
  const [rows, setRows] = useState<EscalaDiaRow[]>([]);
  const [loading, setLoading] = useState(!!target.squadId);
  const [saving, setSaving] = useState(false);

  const [novaMatricula, setNovaMatricula] = useState('');
  const [novoPosto, setNovoPosto] = useState('SD');
  const [novoNome, setNovoNome] = useState('');
  const [novaFuncao, setNovaFuncao] = useState('COMBATENTE');
  const [novaCarga, setNovaCarga] = useState(24);
  const [novoInicio, setNovoInicio] = useState(`${dia}T08:00`);
  const [novoFim, setNovoFim] = useState(`${dia}T08:00`);

  useEffect(() => {
    if (!target.squadId) return;
    fetchEscalaCompletaDoDia(target.squadId, dia)
      .then(setRows)
      .catch(err => onError(err?.message || 'Falha ao carregar escala do dia.'))
      .finally(() => setLoading(false));
  }, [target.squadId]);

  const platoon = platoons.find(p => p.id === platoonId);

  const handleRemove = (escalaId: string) => {
    if (rows.length <= 1) {
      onError(
        'Não é possível remover o último militar da VTR neste dia por aqui — isso deixaria a ' +
        'guarnição sem nenhum registro de escala. Ajuste diretamente com o suporte técnico, ou ' +
        'inclua um substituto antes de remover este.'
      );
      return;
    }
    setRows(rows.filter(r => r.escala_id !== escalaId));
  };

  const handleAddNew = () => {
    if (!novaMatricula.trim() || !novoNome.trim()) {
      onError('Informe ao menos matrícula e nome de guerra do militar a incluir.');
      return;
    }
    setRows([...rows, {
      escala_id: `novo-${Date.now()}`,
      militar_id: '',
      matricula: novaMatricula.trim(),
      posto_graduacao: novoPosto,
      nome_guerra: novoNome.trim().toUpperCase(),
      funcao_na_guarnicao: novaFuncao,
      carga_horaria_horas: novaCarga,
      inicio_turno: `${novoInicio}:00-03:00`,
      fim_turno: `${novoFim}:00-03:00`,
      is_cg: false,
    }]);
    setNovaMatricula('');
    setNovoNome('');
  };

  const handleSave = async () => {
    if (!callSign.trim()) {
      onError('Informe o prefixo da viatura (ex: ABT-1496).');
      return;
    }
    if (rows.length === 0) {
      onError('Inclua ao menos um militar antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      const entries: E193ImportEntry[] = rows.map(r => ({
        platoon_name: platoon?.name || '1º PEL',
        platoon_bbm: platoon?.bbm || '4º BBM',
        platoon_headquarters: platoon?.headquarters || 'Santa Maria',
        call_sign: callSign.trim().toUpperCase(),
        matricula: r.matricula,
        posto_graduacao: r.posto_graduacao,
        nome_guerra: r.nome_guerra,
        funcao_na_guarnicao: r.funcao_na_guarnicao,
        carga_horaria_horas: r.carga_horaria_horas,
        inicio_turno: r.inicio_turno,
        fim_turno: r.fim_turno,
      }));
      await importEscalaE193Rpc(entries);
      onSaved();
    } catch (err: any) {
      onError(err?.message || 'Falha ao salvar a escala editada.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1600] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-extrabold text-slate-800">Editar Escala do Dia — {dia}</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500">Prefixo da VTR</label>
            <input value={callSign} onChange={e => setCallSign(e.target.value)} className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm" placeholder="ABT-1496" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500">Pelotão</label>
            <select value={platoonId} onChange={e => setPlatoonId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm">
              {platoons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {loading && <p className="text-sm text-slate-500 py-4 text-center">Carregando escala atual do dia...</p>}

        {!loading && (
          <>
            <table className="w-full text-xs mb-3">
              <thead>
                <tr className="text-slate-500 border-b">
                  <th className="text-left py-1.5">Militar</th>
                  <th className="text-left py-1.5">Função</th>
                  <th className="text-left py-1.5">Turno</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.escala_id} className="border-b border-slate-100">
                    <td className="py-1.5 font-semibold">{r.posto_graduacao} {r.nome_guerra}</td>
                    <td className="py-1.5 text-slate-600">{r.funcao_na_guarnicao}</td>
                    <td className="py-1.5 text-slate-500">{r.carga_horaria_horas}h</td>
                    <td className="py-1.5 text-right">
                      <button onClick={() => handleRemove(r.escala_id)} className="text-red-500 hover:text-red-700 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-slate-400 py-3">Nenhum militar nesta escala ainda.</td></tr>
                )}
              </tbody>
            </table>

            <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
              <p className="text-[11px] font-bold text-slate-600">Incluir novo posto</p>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Matrícula" value={novaMatricula} onChange={e => setNovaMatricula(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs" />
                <select value={novoPosto} onChange={e => setNovoPosto(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs">
                  {['SD', 'CB', '3º SGT', '2º SGT', '1º SGT', 'SUBTEN', '2º TEN', '1º TEN', 'CAP', 'MAJ'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input placeholder="Nome de guerra" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs col-span-2" />
                <input placeholder="Função (ex: COMANDANTE DE GUARNIÇÃO)" value={novaFuncao} onChange={e => setNovaFuncao(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs col-span-2" />
                <select value={novaCarga} onChange={e => setNovaCarga(Number(e.target.value))} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs">
                  {[6, 8, 12, 24].map(h => <option key={h} value={h}>{h}h</option>)}
                </select>
                <div />
                <div>
                  <label className="text-[10px] text-slate-500">Início do turno</label>
                  <input type="datetime-local" value={novoInicio} onChange={e => setNovoInicio(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs w-full" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Fim do turno</label>
                  <input type="datetime-local" value={novoFim} onChange={e => setNovoFim(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs w-full" />
                </div>
              </div>
              <button onClick={handleAddNew} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Adicionar à lista
              </button>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 rounded-lg cursor-pointer"
          >
            {saving ? 'Salvando...' : 'Salvar Escala do Dia'}
          </button>
        </div>
      </div>
    </div>
  );
}
