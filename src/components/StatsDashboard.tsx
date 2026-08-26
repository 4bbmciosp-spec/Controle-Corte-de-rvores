import React from 'react';
import { Occurrence, User } from '../types';
import { getHoursPending } from '../services/storageService';
import { 
  Clock, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Flame, 
  Layers,
  ArrowRight,
  Archive
} from 'lucide-react';

interface StatsDashboardProps {
  occurrences: Occurrence[];
  currentUser: User;
  activeStatusFilter: string;
  onFilterStatus: (status: string) => void;
  onOpenShiftHandover: () => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  occurrences,
  currentUser,
  activeStatusFilter,
  onFilterStatus,
  onOpenShiftHandover,
}) => {
  const total = occurrences.length;
  const pendentesList = occurrences.filter(o => o.status === 'PENDENTE' || o.status === 'ABERTA');
  const emAtendimentoList = occurrences.filter(o => o.status === 'EM_ATENDIMENTO');
  const concluidasList = occurrences.filter(o => o.status === 'CONCLUIDA');

  // Pendentes críticas (> 12h ou transitadas)
  const pendentesOver12h = pendentesList.filter(o => getHoursPending(o) >= 12).length;
  const pendentesCarriedOver = pendentesList.filter(o => o.isCarriedOver).length;

  return (
    <div className="space-y-3.5">
      {/* Shift Handover Banner for Quick Oversight */}
      {pendentesCarriedOver > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm text-amber-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-200/80 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-700 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <span>Passagem de Serviço: {pendentesCarriedOver} Árvore(s) Pendente(s) do Turno Anterior</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-200 text-amber-900 font-mono font-bold border border-amber-300">
                  Prioridade de Turno
                </span>
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Ocorrências não finalizadas nas últimas 24h. O Comandante de Guarnição e de Pelotão devem acompanhar o desdobramento para que nenhuma árvore fique esquecida.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenShiftHandover}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Ver Relatório de Passagem</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Counter Cards Grid - As 3 Classificações Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
        
        {/* 1. Classificação: PENDENTE */}
        <div
          className="p-4 rounded-xl border border-l-4 border-l-amber-500 bg-white border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>1. Pendentes ({pendentesList.length})</span>
            </span>
            {pendentesOver12h > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-100 text-red-800 border border-red-200">
                {pendentesOver12h} &gt;12h
              </span>
            )}
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber-700 font-mono">{pendentesList.length}</div>
            <div className="text-xs text-slate-500 mt-1">
              Aguardando atendimento ou desdobramento de turno
            </div>
          </div>
        </div>

        {/* 2. Classificação: EM ATENDIMENTO */}
        <div
          className="p-4 rounded-xl border border-l-4 border-l-blue-500 bg-white border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-blue-800 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>2. Em Atendimento ({emAtendimentoList.length})</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-blue-700 font-mono">{emAtendimentoList.length}</div>
            <div className="text-xs text-slate-500 mt-1">
              Guarnição BM empenhada / operando no local
            </div>
          </div>
        </div>

        {/* 3. Classificação: CONCLUÍDA (ARQUIVO) */}
        <div
          className="p-4 rounded-xl border border-l-4 border-l-emerald-500 bg-white border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <Archive className="w-4 h-4 text-emerald-600" />
              <span>3. Concluídas / Arquivo ({concluidasList.length})</span>
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-700 font-mono">{concluidasList.length}</div>
            <div className="text-xs text-slate-500 mt-1">
              Finalizadas e migradas automaticamente para o Arquivo
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
