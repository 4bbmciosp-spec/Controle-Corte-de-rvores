import React from 'react';
import { Occurrence, User, Squad, Platoon } from '../types';
import { getHoursPending } from '../services/storageService';
import { 
  X, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  FileText, 
  Calendar,
  ChevronRight,
  Truck,
  ArrowRight
} from 'lucide-react';

interface ShiftHandoverModalProps {
  occurrences: Occurrence[];
  currentUser: User;
  squads: Squad[];
  platoons: Platoon[];
  onClose: () => void;
  onSelectOccurrence: (occ: Occurrence) => void;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  occurrences,
  currentUser,
  squads,
  platoons,
  onClose,
  onSelectOccurrence,
}) => {
  const pendingOccurrences = occurrences.filter(o => o.status === 'PENDENTE');
  const carriedOverOccurrences = occurrences.filter(o => o.isCarriedOver && o.status !== 'CONCLUIDA');
  const concludedInShift = occurrences.filter(o => o.status === 'CONCLUIDA');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col text-slate-800 print:border-none print:shadow-none print:max-h-full print:bg-white print:text-black">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-red-800 text-white border-b border-red-900 flex flex-wrap items-center justify-between gap-3 print:bg-slate-100 print:border-slate-300 print:text-black">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base sm:text-lg print:text-black">
                Ata de Passagem de Serviço de 24 Horas
              </h2>
              <p className="text-xs text-red-100 font-medium print:text-slate-600">
                Corpo de Bombeiros Militar do Rio Grande do Sul • Controle de Desdobramento Operacional
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-red-700/80 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-red-600 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Relatório</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-red-100 hover:text-white hover:bg-red-700/80 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-800 bg-slate-50 print:bg-white print:text-black">
          
          {/* Header Summary Box */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                Turno de Serviço:
              </span>
              <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                Escala 24 Horas (08:00h às 08:00h do dia seguinte)
              </div>
              <div className="text-xs text-slate-600 mt-0.5 font-medium">
                Data do Relatório: {new Date().toLocaleDateString('pt-BR')} • Oficial/Graduado de Dia: <strong className="text-slate-900">{currentUser.rank} {currentUser.name}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-center">
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg shadow-sm">
                <div className="text-xl font-black text-amber-900">{carriedOverOccurrences.length}</div>
                <div className="text-[10px] text-amber-800 font-bold">Pendentes Transitadas</div>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg shadow-sm">
                <div className="text-xl font-black text-emerald-900">{concludedInShift.length}</div>
                <div className="text-[10px] text-emerald-800 font-bold">Concluídas no Período</div>
              </div>
            </div>
          </div>

          {/* LISTA PRIORITÁRIA DE OCORRÊNCIAS NÃO CONCLUÍDAS HERDADAS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold uppercase tracking-wider text-xs border-b border-slate-200 pb-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>1. Ocorrências Transitadas do Turno Anterior (Ainda em Aberto / Prioridade Máxima)</span>
            </div>

            {carriedOverOccurrences.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border-2 border-dashed border-slate-300 text-center text-slate-500 shadow-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                <p className="font-bold text-slate-800">Nenhuma ocorrência pendente deixada para trás!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Todas as ocorrências anteriores foram devidamente concluídas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {carriedOverOccurrences.map((occ) => {
                  const hours = getHoursPending(occ);
                  const lastAtt = occ.attendances[occ.attendances.length - 1];
                  const squad = squads.find(s => s.id === occ.assignedSquadId);

                  return (
                    <div
                      key={occ.id}
                      className="p-4 bg-white border border-amber-300 rounded-xl space-y-2.5 shadow-sm hover:border-amber-500 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-red-800 text-sm bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {occ.protocol}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white shadow-sm">
                            Pendente há {hours}h
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-600">
                          Guarnição Empenhada: <strong className="text-slate-900">{squad?.name}</strong>
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-red-600" />
                          <span>{occ.address} - {occ.neighborhood}, {occ.city}</span>
                        </div>
                        <p className="text-slate-700 text-xs mt-1 leading-relaxed">
                          {occ.description}
                        </p>
                      </div>

                      {/* Motivo do último atendimento */}
                      {lastAtt && (
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs space-y-1">
                          <div className="font-bold text-amber-900">
                            Última Atuação ({lastAtt.squadName} - {new Date(lastAtt.finishedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}):
                          </div>
                          <div className="text-amber-950 font-semibold">
                            Motivo de Não Conclusão: {lastAtt.unresolvedReason?.replace(/_/g, ' ')}
                          </div>
                          {lastAtt.unresolvedDetails && (
                            <p className="text-slate-700 text-[11px]">
                              "{lastAtt.unresolvedDetails}"
                            </p>
                          )}
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between print:hidden border-t border-slate-100">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Total de tentativas registradas: {occ.attendances.length}
                        </span>
                        <button
                          onClick={() => {
                            onClose();
                            onSelectOccurrence(occ);
                          }}
                          className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                        >
                          <span>Assumir / Ver Linha do Tempo</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LISTA DE CONCLUÍDAS */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold uppercase tracking-wider text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>2. Ocorrências Concluídas no Período ({concludedInShift.length})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {concludedInShift.map((occ) => (
                <div key={occ.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-sm">
                  <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                    <span>{occ.protocol}</span>
                    <span className="text-emerald-700 text-[11px] font-extrabold">✓ Concluída</span>
                  </div>
                  <div className="text-slate-600 text-[11px] mt-1 truncate">
                    {occ.address} - {occ.neighborhood}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden">
          <span className="font-medium">Quartel Geral do CBMRS • Gestão Integrada de Ocorrências</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 text-slate-800 font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            Fechar Relatório
          </button>
        </div>

      </div>
    </div>
  );
};
