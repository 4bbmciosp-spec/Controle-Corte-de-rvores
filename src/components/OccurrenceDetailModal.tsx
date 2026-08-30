import React, { useState } from 'react';
import { Occurrence, Squad, User, OccurrencePhoto, Platoon } from '../types';
import { getHoursPending, setSquadInAttendance, recordAttendance } from '../services/storageService';
import { PhotoViewerModal } from './PhotoViewerModal';
import { 
  X, 
  MapPin, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  User as UserIcon, 
  FileText, 
  ExternalLink, 
  Printer, 
  Wrench, 
  Navigation, 
  ShieldAlert, 
  Play, 
  Edit3, 
  Trash2,
  CheckCheck,
  ChevronRight,
  Sparkles,
  Camera,
  TreePine,
  Users,
  Award,
  Shield,
  MessageCircle
} from 'lucide-react';

interface OccurrenceDetailModalProps {
  occurrence: Occurrence;
  currentUser: User;
  squads: Squad[];
  platoons: Platoon[];
  onClose: () => void;
  onOpenAttendanceForm: (occ: Occurrence) => void;
  onOpenEditForm: (occ: Occurrence) => void;
  onUpdateOccurrence: (occ: Occurrence) => void;
  onDeleteOccurrence?: (occurrenceId: string) => void;
}

const toWhatsAppLink = (phone: string, occ: Occurrence): string => {
  const digits = (phone || '').replace(/\D/g, '');
  // wa.me exige código do país. Números locais no BR vêm com DDD (10-11 dígitos) mas sem o "55" do país.
  const fullNumber = digits.length <= 11 ? `55${digits}` : digits;
  const generalType = (occ.dispatchNature || '').split(':')[0].trim();
  const message = generalType
    ? `Olá, ${occ.solicitorName}! Aqui é do COBOM CBMRS (193) sobre a ocorrência de ${generalType} na ${occ.address}.`
    : `Olá, ${occ.solicitorName}! Aqui é do COBOM CBMRS (193) sobre a ocorrência na ${occ.address}.`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
};

export const OccurrenceDetailModal: React.FC<OccurrenceDetailModalProps> = ({
  occurrence,
  currentUser,
  squads,
  platoons,
  onClose,
  onOpenAttendanceForm,
  onOpenEditForm,
  onUpdateOccurrence,
  onDeleteOccurrence,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<OccurrencePhoto | null>(null);
  const [complementingAttendanceId, setComplementingAttendanceId] = useState<string | null>(null);
  const [complementoTexto, setComplementoTexto] = useState('');
  const [complementoNumeroE193, setComplementoNumeroE193] = useState('');
  const [complementoSaving, setComplementoSaving] = useState(false);
  const [complementoError, setComplementoError] = useState('');

  const hoursPending = getHoursPending(occurrence);
  const assignedSquad = squads.find(s => s.id === occurrence.assignedSquadId);
  const platoon = platoons.find(p => p.id === occurrence.platoonId);

  const isGuarnicao = currentUser.role === 'GUARNICAO';
  const isCobom = currentUser.role === 'COBOM';
  const isPelotao = currentUser.role === 'PELOTAO';

  const isAssignedToCurrentSquad = currentUser.squadId === occurrence.assignedSquadId;
  const isPendingOverdue = occurrence.status === 'PENDENTE' && (hoursPending >= 12 || occurrence.isCarriedOver);

  // Quem gerou o histórico (preenchido_por) pode complementá-lo depois, além do COBOM.
  // NUNCA sobrescreve o registro original — apenas anexa um novo histórico complementar.
  const canComplementAttendance = (att: Occurrence['attendances'][number]) =>
    isCobom || (!!att.preenchidoPorId && att.preenchidoPorId === currentUser.id);

  const handleOpenComplemento = (att: Occurrence['attendances'][number]) => {
    setComplementingAttendanceId(att.id);
    setComplementoTexto('');
    setComplementoNumeroE193('');
    setComplementoError('');
  };

  const handleCancelComplemento = () => {
    setComplementingAttendanceId(null);
    setComplementoError('');
  };

  const handleSaveComplemento = async (att: Occurrence['attendances'][number]) => {
    if (!complementoNumeroE193.trim()) {
      setComplementoError('Informe o número da OC no e-193 correspondente a este complemento.');
      return;
    }
    if (!complementoTexto.trim()) {
      setComplementoError('O histórico complementar não pode ficar vazio.');
      return;
    }
    setComplementoSaving(true);
    setComplementoError('');
    try {
      const nowIso = new Date().toISOString();
      const updated = await recordAttendance(
        occurrence.id,
        {
          // Dados de origem preservados — NÃO editáveis: mesma guarnição/VTR do histórico original
          squadId: att.squadId,
          squadName: att.squadName,
          callSign: att.callSign,
          commanderName: att.commanderName,
          numeroE193: complementoNumeroE193.trim(),
          complementaAtendimentoId: att.id,
          shiftInfo: att.shiftInfo,
          startedAt: att.finishedAt || nowIso,
          finishedAt: nowIso,
          statusResult: att.statusResult,
          actionTaken: complementoTexto.trim(),
          unresolvedReason: att.statusResult === 'PENDENTE' ? att.unresolvedReason : undefined,
          unresolvedDetails: att.statusResult === 'PENDENTE' ? att.unresolvedDetails : undefined,
          equipmentUsed: att.equipmentUsed || [],
          photos: [],
        },
        currentUser
      );
      onUpdateOccurrence(updated);
      setComplementingAttendanceId(null);
    } catch (err: any) {
      setComplementoError(err?.message || 'Falha ao salvar o histórico complementar.');
    } finally {
      setComplementoSaving(false);
    }
  };

  const handleStartAttendance = async () => {
    if (!currentUser.squadId) return;
    try {
      const updated = await setSquadInAttendance(occurrence.id, currentUser.squadId);
      onUpdateOccurrence(updated);
    } catch (err: any) {
      alert(`Erro ao iniciar atendimento no Supabase: ${err?.message || err}`);
    }
  };

  const handleDelete = () => {
    if (confirm(`Atenção COBOM: Deseja realmente excluir permanentemente a ocorrência ${occurrence.protocol}?\n\nEsta ação removerá todos os registros e atendimentos vinculados do banco de dados.`)) {
      if (onDeleteOccurrence) {
        onDeleteOccurrence(occurrence.id);
      }
      onClose();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = () => {
    switch (occurrence.status) {
      case 'CONCLUIDA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Concluída
          </span>
        );
      case 'EM_ATENDIMENTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
            <Truck className="w-3.5 h-3.5 text-blue-700" />
            Em Atendimento no Local
          </span>
        );
      case 'PENDENTE':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${
            hoursPending >= 24
              ? 'bg-red-100 text-red-900 border-red-300 shadow-sm animate-pulse'
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            Pendente / Não Concluída ({hoursPending}h ativa)
          </span>
        );
      case 'ABERTA':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
            <Clock className="w-3.5 h-3.5 text-orange-700" />
            Aberta (Aguardando Deslocamento)
          </span>
        );
    }
  };

  const getUrgencyBadge = () => {
    switch (occurrence.urgency) {
      case 'CRITICA':
        return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-600 text-white">Urgência Crítica</span>;
      case 'ALTA':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500 text-white">Urgência Alta</span>;
      case 'MEDIA':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">Urgência Média</span>;
      case 'BAIXA':
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300">Urgência Baixa</span>;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[1400] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white">
        <div className="relative w-full max-w-4xl bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col text-slate-800 print:border-none print:shadow-none print:max-h-full print:bg-white print:text-black">
          
          {/* Top Header */}
          <div className="px-5 py-3.5 bg-red-800 text-white border-b border-red-900 flex flex-wrap items-center justify-between gap-3 print:bg-slate-100 print:border-slate-300 print:text-black">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-red-800 font-bold font-mono text-sm shadow print:bg-red-100">
                193
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-white text-lg sm:text-xl font-mono tracking-tight print:text-black">
                    {occurrence.protocol}
                  </h2>
                  {getUrgencyBadge()}
                  {occurrence.numeroE193 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold font-mono print:border print:border-amber-400">
                      e-193: {occurrence.numeroE193}
                    </span>
                  )}
                </div>
                <p className="text-xs text-red-100 print:text-slate-600 font-medium">
                  {platoon?.name} • Aberta em {new Date(occurrence.createdAt).toLocaleString('pt-BR')} por {occurrence.openedBy}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              {isCobom && (
                <>
                  <button
                    onClick={() => onOpenEditForm(occurrence)}
                    className="px-2.5 py-1.5 bg-red-900/90 hover:bg-red-950 text-white text-xs font-bold rounded-lg border border-red-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar COBOM</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white text-xs font-bold rounded-lg border border-rose-800/80 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    title="Excluir ocorrência cadastrada incorretamente ou duplicada"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                    <span>Excluir</span>
                  </button>
                </>
              )}

              <button
                onClick={handlePrint}
                className="p-1.5 text-red-100 hover:text-white hover:bg-red-700/80 rounded-lg transition-colors cursor-pointer"
                title="Imprimir Boletim de Ocorrência"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-red-100 hover:text-white hover:bg-red-700/80 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Destaque se herdada de turno anterior */}
          {occurrence.isCarriedOver && occurrence.status !== 'CONCLUIDA' && (
            <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-300 flex flex-wrap items-center justify-between gap-3 text-amber-950 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wide text-amber-900">
                    Ocorrência Transitada de Turno Anterior — Sem Conclusão há {hoursPending} horas!
                  </span>
                  <p className="text-[11px] text-amber-800">
                    Esta árvore necessita de atenção contínua e prioridade no turno atual para evitar esquecimento.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-200 border border-amber-300 text-[11px] font-mono font-bold text-amber-900">
                {occurrence.attendances.length} atendimento(s) anterior(es)
              </span>
            </div>
          )}

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-800 bg-slate-50 print:bg-white print:text-black">
            
            {/* Status & Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-semibold">Situação Atual:</span>
                {getStatusBadge()}
              </div>

              {/* Botões de Ação para a Guarnição em Campo */}
              <div className="flex items-center gap-2 print:hidden">
                {isGuarnicao && occurrence.status === 'ABERTA' && (
                  <button
                    onClick={handleStartAttendance}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Iniciar Deslocamento / Atendimento</span>
                  </button>
                )}

                {isGuarnicao && occurrence.status !== 'CONCLUIDA' && (
                  <button
                    onClick={() => onOpenAttendanceForm(occurrence)}
                    className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Registrar Desfecho (Concluído / Não Concluído)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Grid de Informações Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Coluna 1: Localização e Solicitante */}
              <div className="space-y-4">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    <span>Local da Ocorrência</span>
                  </div>
                  
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{occurrence.address}</div>
                    <div className="text-slate-600 text-xs">{occurrence.neighborhood} • {occurrence.city} (RS)</div>
                    {occurrence.referencePoint && (
                      <div className="text-slate-500 text-[11px] mt-0.5">Ref: {occurrence.referencePoint}</div>
                    )}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${occurrence.latitude},${occurrence.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-[11px] font-semibold transition-colors"
                    >
                      <Navigation className="w-3 h-3 text-red-600" />
                      <span>Traçar Rota GPS</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-500 ml-0.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${occurrence.latitude}, ${occurrence.longitude}`);
                        alert('Coordenadas GPS copiadas!');
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-md text-[11px] font-mono font-bold transition-colors cursor-pointer"
                      title="Copiar coordenadas GPS completas"
                    >
                      <span>{occurrence.latitude.toFixed(6)}, {occurrence.longitude.toFixed(6)}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-red-600" />
                    <span>Dados do Solicitante</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{occurrence.solicitorName}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{occurrence.solicitorPhone}</div>
                      {occurrence.initialRequestDate && (
                        <div className="text-slate-600 font-medium text-[11px] mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-red-600" />
                          <span>1ª Solicitação: <strong>{new Date(occurrence.initialRequestDate).toLocaleString('pt-BR')}</strong></span>
                        </div>
                      )}
                    </div>
                    <a
                      href={toWhatsAppLink(occurrence.solicitorPhone, occurrence)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                      title="Abrir conversa no WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Natureza de Despacho e Guarnição Empenhada */}
              <div className="space-y-4">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1.5">
                    <TreePine className="w-3.5 h-3.5 text-red-600" />
                    <span>Natureza de Despacho (e-193 CBMRS)</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="p-2 bg-red-50/70 border border-red-200 rounded-lg">
                      <span className="text-[10px] text-red-800 font-bold uppercase tracking-wider block">Natureza Oficial:</span>
                      <strong className="text-slate-900 text-xs font-extrabold block mt-0.5">
                        {occurrence.dispatchNature || occurrence.type}
                      </strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Risco Avaliado:</span>
                        <strong className="text-slate-800">{occurrence.treeRisk.replace(/_/g, ' ')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Urgência:</span>
                        <strong className="text-red-700 font-bold">{occurrence.urgency}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-slate-500 block text-[11px] mb-0.5">Descrição do Chamado COBOM:</span>
                    <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                      {occurrence.description}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <div className="flex items-center gap-2 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <Truck className="w-3.5 h-3.5 text-red-600" />
                      <span>Guarnição & Viatura Empenhada</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {assignedSquad?.currentShift || 'Turno do Dia'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-red-800 text-white font-mono font-black text-xs">
                            {assignedSquad?.callSign || 'VTR'}
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {platoon?.name || assignedSquad?.unitText || 'Pelotão BM'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Comandante de Guarnição: <strong className="text-slate-800">{assignedSquad?.commanderName || 'A Definir'}</strong>
                        </div>
                        {assignedSquad?.unitText && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {assignedSquad.unitText}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Militares da Viatura */}
                    {assignedSquad?.members && assignedSquad.members.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Users className="w-3 h-3 text-red-600" />
                          Militares Escalados na Viatura ({assignedSquad.members.length}):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {assignedSquad.members.map((m, idx) => (
                            <div 
                              key={idx} 
                              className="p-1.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-[10px]"
                            >
                              <div>
                                <span className="font-bold text-slate-900">{m.name}</span>
                                <span className="text-slate-400 font-mono ml-1">({m.registrationNumber})</span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded bg-white text-slate-700 font-medium text-[9px] border border-slate-200">
                                {m.roleInSquad}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* FOTOS INICIAIS DO COBOM */}
            {occurrence.initialPhotos.length > 0 && (
              <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <Camera className="w-3.5 h-3.5 text-red-600" />
                  <span>Fotos Iniciais Registradas no Chamado 193 ({occurrence.initialPhotos.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {occurrence.initialPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo)}
                      className="group relative bg-slate-100 border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:border-red-600 transition-all shadow-sm"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || 'Foto inicial'}
                        referrerPolicy="no-referrer"
                        className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                        Ampliar
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LINHA DO TEMPO / HISTÓRICO DE ATENDIMENTOS POR TURNO */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider text-xs">
                  <Calendar className="w-4 h-4 text-red-600" />
                  <span>Linha do Tempo de Atendimentos & Desdobramento por Turno</span>
                </div>
                <span className="text-xs text-slate-500 font-mono font-medium">
                  {occurrence.attendances.length} registro(s) no histórico
                </span>
              </div>

              {occurrence.attendances.length === 0 ? (
                <div className="py-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs shadow-sm">
                  <Truck className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="font-semibold text-slate-700">Nenhum registro de atendimento realizado em campo ainda.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">A guarnição empenhada registrará o desfecho ao chegar no local.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-300">
                  {occurrence.attendances.map((att, idx) => {
                    const isConcluded = att.statusResult === 'CONCLUIDA';
                    return (
                      <div key={att.id} className="relative space-y-3">
                        {/* Dot indicator */}
                        <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center text-[10px] font-bold ${
                          isConcluded ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {idx + 1}
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
                          {/* Top Info da Guarnição */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span>{att.squadName}</span>
                                <span className="font-mono text-xs text-red-700">({att.callSign})</span>
                                {att.complementaAtendimentoId && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-bold">
                                    COMPLEMENTO
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Comandante: <strong className="text-slate-800">{att.commanderName}</strong> • {att.shiftInfo}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                OC e-193: <strong className="font-mono text-slate-800">{att.numeroE193 || 'Não informado'}</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500">
                                {new Date(att.finishedAt).toLocaleString('pt-BR')}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                isConcluded 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}>
                                {isConcluded ? '✅ Concluída' : '⚠️ Não Concluída (Pendente)'}
                              </span>
                              {canComplementAttendance(att) && complementingAttendanceId !== att.id && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenComplemento(att)}
                                  className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer print:hidden"
                                  title="Adicionar histórico complementar (não altera o registro original)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Histórico conforme E-193 */}
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Histórico conforme E-193:
                            </span>
                            <p className="text-slate-800 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-line">
                              {att.actionTaken}
                            </p>
                          </div>

                          {complementingAttendanceId === att.id && (
                            <div className="space-y-2 border-t border-slate-100 pt-3">
                              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                                Adicionar Histórico Complementar (o registro original acima não será alterado):
                              </span>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                  Número da OC no e-193 deste complemento *
                                </label>
                                <input
                                  type="text"
                                  value={complementoNumeroE193}
                                  onChange={(e) => setComplementoNumeroE193(e.target.value)}
                                  placeholder="Ex: 193-2026-04521"
                                  className="w-full text-xs font-mono bg-white p-2 rounded-lg border border-blue-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                  Texto do complemento *
                                </label>
                                <textarea
                                  value={complementoTexto}
                                  onChange={(e) => setComplementoTexto(e.target.value)}
                                  rows={4}
                                  placeholder="Descreva a informação complementar a este histórico..."
                                  className="w-full text-xs bg-white p-2.5 rounded-lg border border-blue-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 leading-relaxed"
                                />
                              </div>
                              {complementoError && (
                                <p className="text-[11px] text-red-700 font-semibold">{complementoError}</p>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={complementoSaving}
                                  onClick={() => handleSaveComplemento(att)}
                                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                >
                                  {complementoSaving ? 'Salvando...' : 'Salvar Complemento'}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelComplemento}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          {/* MOTIVO SE NÃO CONCLUÍDA */}
                          {!isConcluded && (
                            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-1">
                              <div className="text-amber-900 font-bold text-xs flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                                <span>
                                  Motivo da Não Conclusão (Obrigatório): {
                                    att.unresolvedReason === 'NECESSIDADE_APOIO_CEEE_EQUATORIAL'
                                      ? 'Apoio da Cia de Energia Necessário'
                                      : att.unresolvedReason === 'ARVORE_GRANDE_PORTE_GUINDASTE'
                                        ? 'Árvore de Grande Porte / Caminhão Cesto'
                                        : att.unresolvedReason?.replace(/_/g, ' ')
                                  }
                                </span>
                              </div>
                              {att.unresolvedDetails && (
                                <p className="text-amber-950 text-xs pl-5 leading-relaxed">
                                  {att.unresolvedDetails}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Equipamentos Usados */}
                          {att.equipmentUsed && att.equipmentUsed.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mr-1">
                                <Wrench className="w-3 h-3 text-slate-400" />
                                Equipamentos:
                              </span>
                              {att.equipmentUsed.map(eq => (
                                <span key={eq} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] text-slate-700 font-medium">
                                  {eq}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* FOTOS DESTE ATENDIMENTO (ATÉ 3 POR ATENDIMENTO) */}
                          {att.photos && att.photos.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                                Registros Fotográficos Anexados Neste Atendimento ({att.photos.length}/3):
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {att.photos.map((photo) => (
                                  <div
                                    key={photo.id}
                                    onClick={() => setSelectedPhoto(photo)}
                                    className="group relative bg-slate-100 border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:border-red-600 transition-all shadow-sm"
                                  >
                                    <img
                                      src={photo.url}
                                      alt={photo.caption || 'Foto do atendimento'}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-28 object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                                      Ampliar Foto
                                    </div>
                                    {photo.caption && (
                                      <div className="p-1.5 text-[10px] text-slate-700 bg-white border-t border-slate-200 truncate">
                                        {photo.caption}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden">
            <span className="font-mono font-medium">CBMRS • 193 Central de Emergências • 4º BBM Santa Maria</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>

        </div>
      </div>

      {/* Photo Zoom Modal */}
      {selectedPhoto && (
        <PhotoViewerModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </>
  );
};
