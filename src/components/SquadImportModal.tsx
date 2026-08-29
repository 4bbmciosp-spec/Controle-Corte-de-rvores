import React, { useState } from 'react';
import { Squad, User, Platoon, SquadMember } from '../types';
import { 
  parseAndRegisterE193Roster,
  addSquadMember,
  updateSquadMember,
  removeSquadMember,
  addNewSquad,
  removeSquad,
  setSquadCommander
} from '../services/storageService';
import { 
  X, 
  Truck, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  UserCheck, 
  RefreshCw,
  Shield,
  Layers,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Award,
  Users,
  ArrowRightLeft,
  ChevronDown
} from 'lucide-react';

interface SquadImportModalProps {
  currentSquads?: Squad[];
  squads?: Squad[];
  currentUsers?: User[];
  users?: User[];
  platoons?: Platoon[];
  onClose: () => void;
  onImportSuccess?: () => void;
  onSquadsUpdated?: (squads: Squad[], users: User[], platoons: Platoon[]) => void;
}

const COMMON_RANKS = ['SD', 'CB', '3º SGT', '2º SGT', '1º SGT', 'SUBTEN', '2º TEN', '1º TEN', 'CAP QOEM', 'MAJ'];

const COMMON_ROLES = [
  'COMANDANTE DE GUARNIÇÃO',
  'COV / OPERADOR / CONDUTOR',
  'CHEFE DE LINHA DIREITA',
  'CHEFE DE LINHA ESQUERDA',
  'AUXILIAR DE LINHA DIREITA',
  'AUXILIAR DE LINHA ESQUERDA',
  'CINOTÉCNICO',
  'MERGULHADOR',
  'OPERADOR COBOM',
  'SOCORRISTA / RESGATISTA'
];

export const SquadImportModal: React.FC<SquadImportModalProps> = ({
  currentSquads,
  squads,
  currentUsers,
  users,
  platoons = [],
  onClose,
  onImportSuccess,
  onSquadsUpdated,
}) => {
  const [activeSquadsList, setActiveSquadsList] = useState<Squad[]>(currentSquads || squads || []);
  const [activeUsersList, setActiveUsersList] = useState<User[]>(currentUsers || users || []);
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState<'VIEW_ROSTER' | 'PASTE'>('VIEW_ROSTER');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sub-modals for manual management
  const [editingMember, setEditingMember] = useState<{
    squadId: string;
    originalSquadId: string;
    originalReg: string;
    isNew: boolean;
    registrationNumber: string;
    rank: string;
    warName: string;
    roleInSquad: string;
    shiftHours: number;
    shiftStart: string;
    shiftEnd: string;
    isCommander: boolean;
  } | null>(null);

  const [isAddingSquad, setIsAddingSquad] = useState(false);
  const [newSquadCallSign, setNewSquadCallSign] = useState('');
  const [newSquadPlatoonId, setNewSquadPlatoonId] = useState(platoons[0]?.id || '');
  const [newSquadCommander, setNewSquadCommander] = useState('A Definir');
  const [newSquadShift, setNewSquadShift] = useState('Turno 24h (08:00 às 08:00)');

  const notifyUpdated = (updatedSquads: Squad[], updatedUsers: User[]) => {
    setActiveSquadsList(updatedSquads);
    setActiveUsersList(updatedUsers);
    if (onSquadsUpdated) {
      onSquadsUpdated(updatedSquads, updatedUsers, platoons);
    }
  };

  const handleProcessImport = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!rawText.trim()) {
      setErrorMsg('Por favor, cole os dados das guarnições do sistema e-193.');
      return;
    }

    try {
      const result = parseAndRegisterE193Roster(rawText, activeSquadsList, platoons);
      notifyUpdated(result.squads, result.users);
      if (onImportSuccess) {
        onImportSuccess();
      }
      setSuccessMsg(`Sucesso! ${result.squads.length} guarnições e ${result.users.length} militares processados do e-193.`);
      setActiveTab('VIEW_ROSTER');
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao processar dados do e-193. Verifique a formatação.');
    }
  };

  // Open Edit/Add Member Form
  const handleOpenAddMember = (squadId: string) => {
    setEditingMember({
      squadId,
      originalSquadId: squadId,
      originalReg: '',
      isNew: true,
      registrationNumber: `FUN-0${Math.floor(Math.random() * 90) + 10}`,
      rank: 'SD',
      warName: 'Operador de Linha',
      roleInSquad: 'CHEFE DE LINHA DIREITA',
      shiftHours: 24,
      shiftStart: '08:00',
      shiftEnd: '08:00',
      isCommander: false
    });
  };

  const handleOpenEditMember = (squadId: string, member: SquadMember, currentSquadCommander: string) => {
    setEditingMember({
      squadId,
      originalSquadId: squadId,
      originalReg: member.registrationNumber,
      isNew: false,
      registrationNumber: member.registrationNumber,
      rank: 'SD',
      warName: member.roleInSquad,
      roleInSquad: member.roleInSquad,
      shiftHours: member.shiftHours || 24,
      shiftStart: member.shiftStart || '08:00',
      shiftEnd: member.shiftEnd || '08:00',
      isCommander: member.roleInSquad.toUpperCase().includes('COMANDANTE') || member.name === currentSquadCommander
    });
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const roleTitle = editingMember.roleInSquad.trim();
    const newMemberObj: SquadMember = {
      registrationNumber: editingMember.registrationNumber.trim() || 'FUN-01',
      name: roleTitle,
      roleInSquad: roleTitle,
      shiftHours: editingMember.shiftHours,
      shiftStart: editingMember.shiftStart,
      shiftEnd: editingMember.shiftEnd
    };

    try {
      let updatedSquads: Squad[];
      // If transferring to a different squad or changing registration
      if (!editingMember.isNew && editingMember.originalSquadId !== editingMember.squadId) {
        const withoutOld = removeSquadMember(activeSquadsList, editingMember.originalSquadId, editingMember.originalReg);
        updatedSquads = addSquadMember(withoutOld, editingMember.squadId, newMemberObj, editingMember.isCommander);
      } else if (editingMember.isNew) {
        updatedSquads = addSquadMember(activeSquadsList, editingMember.squadId, newMemberObj, editingMember.isCommander);
      } else {
        updatedSquads = updateSquadMember(
          activeSquadsList,
          editingMember.squadId, 
          editingMember.originalReg, 
          newMemberObj, 
          editingMember.isCommander
        );
      }

      notifyUpdated(updatedSquads, activeUsersList);
      setEditingMember(null);
      setSuccessMsg(`Posto operacional ${roleTitle} atualizado na viatura com sucesso.`);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar dados do posto.');
    }
  };

  const handleDeleteMember = (squadId: string, reg: string, name: string) => {
    if (confirm(`Deseja remover o posto ${name} (${reg}) da viatura?`)) {
      const updatedSquads = removeSquadMember(activeSquadsList, squadId, reg);
      notifyUpdated(updatedSquads, activeUsersList);
      setSuccessMsg(`Posto operacional removido da escala.`);
    }
  };

  const handleSetCommander = (squadId: string, commanderName: string) => {
    const updatedSquads = setSquadCommander(activeSquadsList, squadId, commanderName);
    notifyUpdated(updatedSquads, activeUsersList);
    setSuccessMsg(`Comando da guarnição atualizado.`);
  };

  const handleSaveNewSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSquadCallSign.trim()) {
      alert('Informe o prefixo da viatura (ex: ABT-1999).');
      return;
    }

    const plat = platoons.find(p => p.id === newSquadPlatoonId);
    const unitText = plat ? `4º BBM / 1ª CIA / ${plat.name.split('-')[0].trim()}` : '4º BBM - Santa Maria';
    const squadId = `squad-${newSquadCallSign.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const newSquadObj: Squad = {
      id: squadId,
      name: `${newSquadCallSign.trim().toUpperCase()} (${plat?.name?.split('-')[0]?.trim() || 'Guarnição'})`,
      callSign: newSquadCallSign.trim().toUpperCase(),
      unitText,
      platoonId: newSquadPlatoonId,
      commanderName: newSquadCommander || 'A Definir',
      currentShift: newSquadShift,
      status: 'DISPONIVEL',
      activeMembersCount: 0,
      members: []
    };

    const updatedSquads = addNewSquad(activeSquadsList, newSquadObj);
    notifyUpdated(updatedSquads, activeUsersList);
    setIsAddingSquad(false);
    setNewSquadCallSign('');
    setSuccessMsg(`Viatura ${newSquadObj.callSign} cadastrada no ${plat?.name}.`);
  };

  const handleDeleteSquad = (squadId: string, callSign: string) => {
    if (confirm(`Deseja remover a viatura ${callSign} da escala do dia?`)) {
      const updatedSquads = removeSquad(activeSquadsList, squadId);
      notifyUpdated(updatedSquads, activeUsersList);
      setSuccessMsg(`Viatura ${callSign} removida.`);
    }
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-800">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-red-800 text-white border-b border-red-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-red-800 shadow font-black">
              <Truck className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg">
                  Gestão da Escala de Guarnições (e-193)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] bg-red-950 text-red-200 font-mono font-bold border border-red-700">
                  4º BBM - Santa Maria
                </span>
              </div>
              <p className="text-xs text-red-100 font-medium">
                Vínculo obrigatório: Pelotão (PelBM) ➔ Viatura (VTR) ➔ Militares & Comandantes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-red-100 hover:text-white hover:bg-red-700/80 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between px-5 pt-3 bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('VIEW_ROSTER')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'VIEW_ROSTER'
                  ? 'bg-white text-red-800 border-t-2 border-t-red-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Guarnições e Efetivo ({activeSquadsList.length} VTRs)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PASTE')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'PASTE'
                  ? 'bg-white text-red-800 border-t-2 border-t-red-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Importar / Colar Escala e-193</span>
            </button>
          </div>

          {activeTab === 'VIEW_ROSTER' && (
            <button
              type="button"
              onClick={() => setIsAddingSquad(true)}
              className="mb-1 px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nova Viatura (VTR)</span>
            </button>
          )}
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer">OK</button>
          </div>
        )}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-300 text-red-900 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
          
          {activeTab === 'PASTE' ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-900">Como funciona o Importador e-193:</div>
                  <p className="mt-0.5 text-amber-800">
                    Basta copiar o texto da escala diária de viaturas gerada no sistema e-193. O algoritmo identifica automaticamente a hierarquia: <strong>Pelotão (PelBM) ➔ Viatura (VTR) ➔ Militares com Matrícula, Posto/Nome, Função e Turno</strong>.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold text-xs mb-1.5">
                  Cole os dados brutos da escala e-193 aqui:
                </label>
                <textarea
                  rows={13}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Cole aqui o texto do e-193..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 font-mono text-xs focus:ring-2 focus:ring-red-600 focus:border-red-600 shadow-inner"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('VIEW_ROSTER')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleProcessImport}
                  className="px-5 py-2.5 bg-red-800 hover:bg-red-700 rounded-lg text-xs font-extrabold text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Processar Escala e-193</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Escala Ativa do Dia — 4º Batalhão de Bombeiro Militar (Santa Maria)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Viaturas e militares em serviço. Você pode ajustar militares, trocar comandantes ou realizar permutas extraordinárias.
                  </p>
                </div>
              </div>

              {/* Grid de Viaturas e Militares */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeSquadsList.map((squad) => {
                  const plat = platoons.find(p => p.id === squad.platoonId);
                  return (
                    <div 
                      key={squad.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Header da VTR */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg bg-red-700 text-white flex items-center justify-center font-mono font-black text-xs shadow">
                              {squad.callSign.slice(0, 3)}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                                <span>{squad.callSign}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {squad.members?.length || squad.activeMembersCount} militar(es)
                                </span>
                              </div>
                              <div className="text-[11px] font-semibold text-slate-600">
                                {plat?.name || squad.unitText || 'Pelotão BM'}
                              </div>
                              {squad.unitText && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {squad.unitText}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                              squad.status === 'EM_OCORRENCIA'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {squad.status === 'EM_OCORRENCIA' ? 'EM ATENDIMENTO' : 'DISPONÍVEL'}
                            </span>
                            <button
                              onClick={() => handleDeleteSquad(squad.id, squad.callSign)}
                              className="text-slate-400 hover:text-red-600 p-1 text-[11px] transition-colors cursor-pointer"
                              title="Remover viatura da escala"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Comandante da Guarnição */}
                        <div className="mt-2.5 flex items-center justify-between bg-amber-50/70 p-2 rounded-lg border border-amber-200/80 text-xs">
                          <div className="flex items-center gap-1.5 text-amber-950 font-medium">
                            <Award className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>Comando da VTR:</span>
                            <strong className="font-bold text-slate-900">Comandante de Guarnição</strong>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{squad.currentShift}</span>
                        </div>

                        {/* Lista de Postos e Funções na Guarnição */}
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-red-600" />
                              Composição da Guarnição:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenAddMember(squad.id)}
                              className="text-red-700 hover:text-red-900 hover:underline flex items-center gap-0.5 lowercase text-[10px] font-bold cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              Adicionar posto
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {squad.members && squad.members.length > 0 ? (
                              squad.members.map((m, idx) => {
                                const isCmt = m.roleInSquad.toUpperCase().includes('COMANDANTE') || m.name === squad.commanderName;
                                return (
                                  <div 
                                    key={idx} 
                                    className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 p-2 rounded-lg border border-slate-200 text-xs transition-colors"
                                  >
                                    <div>
                                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                        <span>{m.roleInSquad}</span>
                                        {isCmt && (
                                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold">
                                            Cmt
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        Posto Operacional • Cód: {m.registrationNumber}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                                        {m.shiftHours}h
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditMember(squad.id, m, squad.commanderName)}
                                        className="p-1 text-slate-500 hover:text-blue-700 rounded transition-colors cursor-pointer"
                                        title="Editar posto ou transferir de viatura"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMember(squad.id, m.registrationNumber, m.roleInSquad)}
                                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                        title="Remover posto da viatura"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="py-3 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                Nenhum posto vinculado a esta viatura.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações da Guarnição */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleOpenAddMember(squad.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-red-600" />
                          <span>Incluir Posto / Função</span>
                        </button>

                        <div className="text-[10px] text-slate-500">
                          {squad.members?.length || 0} posto(s) ativo(s)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* SUB-MODAL: ADICIONAR / EDITAR POSTO OPERACIONAL */}
        {editingMember && (
          <div className="fixed inset-0 z-[1600] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden">
              <div className="px-4 py-3 bg-red-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" />
                  <h4 className="font-extrabold text-sm">
                    {editingMember.isNew ? 'Adicionar Posto na Escala' : 'Editar Posto / Transferência de VTR'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="p-1 text-red-100 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMember} className="p-4 space-y-3 text-xs bg-slate-50">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Viatura (VTR) Destino *</label>
                  <select
                    value={editingMember.squadId}
                    onChange={(e) => setEditingMember({ ...editingMember, squadId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-bold focus:ring-1 focus:ring-red-600"
                  >
                    {activeSquadsList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.callSign} — {s.unitText || s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Função Operacional na Guarnição *</label>
                  <select
                    value={editingMember.roleInSquad}
                    onChange={(e) => setEditingMember({ ...editingMember, roleInSquad: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-semibold"
                  >
                    {COMMON_ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Código / Matrícula do Posto</label>
                    <input
                      type="text"
                      value={editingMember.registrationNumber}
                      onChange={(e) => setEditingMember({ ...editingMember, registrationNumber: e.target.value })}
                      placeholder="Ex: FUN-01 ou MAT-2693"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Duração do Turno</label>
                    <select
                      value={editingMember.shiftHours}
                      onChange={(e) => setEditingMember({ ...editingMember, shiftHours: parseInt(e.target.value, 10) })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900"
                    >
                      <option value={24}>24 Horas</option>
                      <option value={12}>12 Horas</option>
                      <option value={8}>8 Horas</option>
                      <option value={6}>6 Horas</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={editingMember.isCommander}
                      onChange={(e) => setEditingMember({ ...editingMember, isCommander: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded"
                    />
                    <span>Comandante da VTR</span>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm cursor-pointer"
                  >
                    Salvar Posto na Guarnição
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUB-MODAL: ADICIONAR NOVA VIATURA */}
        {isAddingSquad && (
          <div className="fixed inset-0 z-[1600] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden">
              <div className="px-4 py-3 bg-red-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  <h4 className="font-extrabold text-sm">Cadastrar Nova Viatura no Plantão</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingSquad(false)}
                  className="p-1 text-red-100 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNewSquad} className="p-4 space-y-3 text-xs bg-slate-50">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Prefixo da Viatura (CallSign) *</label>
                  <input
                    type="text"
                    value={newSquadCallSign}
                    onChange={(e) => setNewSquadCallSign(e.target.value)}
                    placeholder="Ex: ABT-1999, ABS-0520, AR-112"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-bold uppercase font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Pelotão de Bombeiro Militar (PelBM) *</label>
                  <select
                    value={newSquadPlatoonId}
                    onChange={(e) => setNewSquadPlatoonId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-medium"
                  >
                    {platoons.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Comandante Inicial da Guarnição</label>
                  <input
                    type="text"
                    value={newSquadCommander}
                    onChange={(e) => setNewSquadCommander(e.target.value)}
                    placeholder="Ex: 1º SGT BRUM ou A Definir"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Descrição do Turno</label>
                  <input
                    type="text"
                    value={newSquadShift}
                    onChange={(e) => setNewSquadShift(e.target.value)}
                    placeholder="Ex: Turno 24h (08:00 às 08:00)"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingSquad(false)}
                    className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm cursor-pointer"
                  >
                    Cadastrar Viatura
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-red-700" />
            <span>Corpo de Bombeiros Militar do Rio Grande do Sul - 4º BBM Santa Maria</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
