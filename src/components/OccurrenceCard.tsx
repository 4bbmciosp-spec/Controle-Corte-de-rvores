import React from 'react';
import { Occurrence, User, Squad } from '../types';
import { getHoursPending } from '../services/storageService';
import { 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  Camera, 
  Play, 
  CheckCheck, 
  ChevronRight, 
  ShieldAlert,
  Flame,
  TreePine
} from 'lucide-react';

interface OccurrenceCardProps {
  occurrence: Occurrence;
  currentUser: User;
  squads: Squad[];
  onSelect: (occ: Occurrence) => void;
  onOpenAttendanceForm: (occ: Occurrence) => void;
  onStartAttendance: (occ: Occurrence) => void;
}

export const OccurrenceCard: React.FC<OccurrenceCardProps> = ({
  occurrence,
  currentUser,
  squads,
  onSelect,
  onOpenAttendanceForm,
  onStartAttendance,
}) => {
  const hoursPending = getHoursPending(occurrence);
  const assignedSquad = squads.find(s => s.id === occurrence.assignedSquadId);
  const totalPhotos = (occurrence.initialPhotos?.length || 0) + 
    occurrence.attendances.reduce((acc, att) => acc + (att.photos?.length || 0), 0);

  const isCarriedOver = occurrence.isCarriedOver && occurrence.status !== 'CONCLUIDA';
  const isCriticalPending = occurrence.status === 'PENDENTE' && hoursPending >= 24;

  const isGuarnicao = currentUser.role === 'GUARNICAO';
  const isAssignedToCurrentSquad = currentUser.squadId === occurrence.assignedSquadId;

  const getStatusDisplay = () => {
    switch (occurrence.status) {
      case 'CONCLUIDA':
        return {
          bg: 'bg-emerald-100 border-emerald-300 text-emerald-800',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-700" />,
          label: 'Concluída'
        };
      case 'EM_ATENDIMENTO':
        return {
          bg: 'bg-blue-100 border-blue-300 text-blue-800',
          icon: <Truck className="w-3 h-3 text-blue-700" />,
          label: 'Em Atendimento'
        };
      case 'PENDENTE':
        return {
          bg: isCriticalPending 
            ? 'bg-red-100 border-red-300 text-red-900 font-bold' 
            : 'bg-amber-100 border-amber-300 text-amber-900 font-bold',
          icon: <AlertTriangle className={`w-3 h-3 ${isCriticalPending ? 'text-red-700' : 'text-amber-700'}`} />,
          label: `Pendente (${hoursPending}h)`
        };
      case 'ABERTA':
      default:
        return {
          bg: 'bg-orange-100 border-orange-300 text-orange-800',
          icon: <Clock className="w-3 h-3 text-orange-700" />,
          label: 'Aberta'
        };
    }
  };

  const statusInfo = getStatusDisplay();

  const getUrgencyTag = () => {
    switch (occurrence.urgency) {
      case 'CRITICA':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white">Crítica</span>;
      case 'ALTA':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">Alta</span>;
      case 'MEDIA':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">Média</span>;
      case 'BAIXA':
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">Baixa</span>;
    }
  };

  const getCardBorder = () => {
    if (isCriticalPending) return 'border-l-4 border-l-red-600 border-red-300 ring-1 ring-red-300/40 bg-white';
    if (isCarriedOver) return 'border-l-4 border-l-amber-500 border-amber-300 ring-1 ring-amber-300/40 bg-white';
    if (occurrence.status === 'EM_ATENDIMENTO') return 'border-l-4 border-l-blue-500 border-slate-200 bg-white';
    if (occurrence.status === 'CONCLUIDA') return 'border-l-4 border-l-emerald-500 border-slate-200 bg-white';
    return 'border-l-4 border-l-orange-500 border-slate-200 bg-white';
  };

  return (
    <div 
      className={`group relative border rounded-xl p-3.5 sm:p-4 transition-all shadow-sm hover:shadow-md hover:border-slate-300 flex flex-col justify-between ${getCardBorder()}`}
    >
      <div>
        {/* Card Top: Badges and Protocol */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-extrabold text-slate-900 text-sm tracking-tight">
              {occurrence.protocol}
            </span>
            {getUrgencyTag()}
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${statusInfo.bg}`}>
              {statusInfo.icon}
              <span>{statusInfo.label}</span>
            </span>
          </div>
        </div>

        {/* Natureza de Despacho Oficial */}
        <div className="mb-2">
          <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
            <TreePine className="w-3.5 h-3.5 text-red-700 shrink-0" />
            <span className="line-clamp-1">{occurrence.dispatchNature || occurrence.type}</span>
          </span>
        </div>

        {/* ALERTA VISUAL: Transitada de Turno Anterior */}
        {isCarriedOver && (
          <div className="mb-2.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-between gap-2 text-[11px] text-amber-900">
            <span className="flex items-center gap-1 font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              Transitada de Turno Anterior ({hoursPending}h)
            </span>
            <span className="font-mono text-[10px] text-amber-800 font-bold">
              {occurrence.attendances.length} atendimento(s)
            </span>
          </div>
        )}

        {/* Endereço & Descrição */}
        <div className="space-y-1 mb-2.5">
          <div className="flex items-start gap-1.5 text-slate-900 text-xs font-bold leading-snug">
            <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{occurrence.address} - {occurrence.neighborhood}, {occurrence.city}</span>
          </div>
          <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed pl-5 bg-slate-50 p-1.5 rounded border border-slate-200/80">
            {occurrence.description}
          </p>
        </div>

        {/* Informações Operacionais: Guarnição Empenhada, Fotos, Horário */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-red-700" />
            <span className="text-slate-800 font-bold">
              {assignedSquad ? `${assignedSquad.callSign} (${assignedSquad.commanderName})` : 'Guarnição Pendente'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {occurrence.initialRequestDate && (
              <span className="text-slate-500 font-medium text-[10px] flex items-center gap-1" title="Data da 1ª Solicitação">
                <Clock className="w-2.5 h-2.5 text-red-600" />
                <span>1ª Sol: {new Date(occurrence.initialRequestDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {new Date(occurrence.initialRequestDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            )}
            {totalPhotos > 0 && (
              <span className="flex items-center gap-1 text-slate-600 font-mono text-[10px]">
                <Camera className="w-3 h-3 text-red-600" />
                <span>{totalPhotos}</span>
              </span>
            )}
            <span className="text-slate-400 font-mono text-[10px]">
              {new Date(occurrence.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="pt-3 mt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => onSelect(occurrence)}
          className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
        >
          <span>Ver Detalhes & Histórico</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* Botão de Ação Rápida para Guarnição em Campo */}
        {isGuarnicao && occurrence.status === 'ABERTA' && (
          <button
            onClick={() => onStartAttendance(occurrence)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
          >
            <Play className="w-3 h-3" />
            <span>Iniciar</span>
          </button>
        )}

        {isGuarnicao && occurrence.status !== 'CONCLUIDA' && occurrence.status !== 'ABERTA' && (
          <button
            onClick={() => onOpenAttendanceForm(occurrence)}
            className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Finalizar</span>
          </button>
        )}
      </div>
    </div>
  );
};
