import React, { useState, useMemo } from 'react';
import { Occurrence, Platoon, Squad } from '../types';
import { getHoursPending } from '../services/storageService';
import { 
  Printer, 
  X, 
  FileText, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  ShieldAlert, 
  Filter,
  Layers,
  Award,
  TreePine,
  Download,
  Info
} from 'lucide-react';

interface DetailedReportPrintModalProps {
  occurrences: Occurrence[];
  platoons: Platoon[];
  squads: Squad[];
  onClose: () => void;
}

export const DetailedReportPrintModal: React.FC<DetailedReportPrintModalProps> = ({
  occurrences,
  platoons,
  squads,
  onClose
}) => {
  // Period filter: 24h, 7d, 30d, or Custom Date Range
  const [periodPreset, setPeriodPreset] = useState<'24H' | '7D' | '30D' | 'CUSTOM' | 'TODOS'>('24H');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedPlatoon, setSelectedPlatoon] = useState<string>('TODOS');
  const [selectedSquad, setSelectedSquad] = useState<string>('TODOS');

  // Filter Occurrences according to the desired period and filters
  const filteredList = useMemo(() => {
    const now = Date.now();
    return occurrences.filter(occ => {
      const occTime = new Date(occ.createdAt).getTime();

      if (periodPreset === '24H') {
        const diffHours = (now - occTime) / (1000 * 60 * 60);
        if (diffHours > 24) return false;
      } else if (periodPreset === '7D') {
        const diffDays = (now - occTime) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (periodPreset === '30D') {
        const diffDays = (now - occTime) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      } else if (periodPreset === 'CUSTOM') {
        if (startDate) {
          const startMs = new Date(`${startDate}T00:00:00`).getTime();
          if (occTime < startMs) return false;
        }
        if (endDate) {
          const endMs = new Date(`${endDate}T23:59:59`).getTime();
          if (occTime > endMs) return false;
        }
      }

      if (selectedPlatoon !== 'TODOS' && occ.platoonId !== selectedPlatoon) {
        return false;
      }

      if (selectedSquad !== 'TODOS' && occ.assignedSquadId !== selectedSquad) {
        return false;
      }

      return true;
    });
  }, [occurrences, periodPreset, startDate, endDate, selectedPlatoon, selectedSquad]);

  // Breakdowns
  const concluidas = useMemo(() => {
    return filteredList.filter(o => o.status === 'CONCLUIDA');
  }, [filteredList]);

  const pendentes = useMemo(() => {
    return filteredList.filter(o => o.status === 'PENDENTE' || o.status === 'ABERTA');
  }, [filteredList]);

  const emAtendimento = useMemo(() => {
    return filteredList.filter(o => o.status === 'EM_ATENDIMENTO');
  }, [filteredList]);

  const carriedOver = useMemo(() => {
    return filteredList.filter(o => o.isCarriedOver);
  }, [filteredList]);

  // Calculation of average resolution time
  const avgResolutionHours = useMemo(() => {
    if (concluidas.length === 0) return 0;
    let sumMinutes = 0;
    concluidas.forEach(o => {
      const start = new Date(o.createdAt).getTime();
      const end = o.lastAttendanceAt ? new Date(o.lastAttendanceAt).getTime() : new Date(o.updatedAt).getTime();
      const diff = Math.max(10, Math.floor((end - start) / (1000 * 60)));
      sumMinutes += diff;
    });
    return (sumMinutes / concluidas.length / 60).toFixed(1);
  }, [concluidas]);

  const handlePrint = () => {
    window.print();
  };

  const getPeriodLabel = () => {
    if (periodPreset === '24H') return 'Últimas 24 Horas (Plantão Atual)';
    if (periodPreset === '7D') return 'Últimos 7 Dias';
    if (periodPreset === '30D') return 'Últimos 30 Dias (Mensal)';
    if (periodPreset === 'CUSTOM') return `Período Personalizado: de ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`;
    return 'Histórico Completo Consolidado';
  };

  return (
    <div className="fixed inset-0 z-[1650] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-5xl bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col text-slate-800 print:border-none print:shadow-none print:max-h-full print:bg-white print:text-black">
        
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-red-800 text-white border-b border-red-900 flex flex-wrap items-center justify-between gap-3 print:bg-slate-100 print:border-slate-300 print:text-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-red-800 flex items-center justify-center font-bold shadow">
              <Printer className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base sm:text-lg print:text-black">
                Relatório Operacional Detalhado (Corte & Vistoria de Árvores)
              </h2>
              <p className="text-xs text-red-100 font-medium print:text-slate-600">
                4º Batalhão de Bombeiro Militar • Santa Maria / RS • Visão Clara do Executado e Pendências
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-red-900 text-xs font-extrabold rounded-lg flex items-center gap-2 shadow border border-red-200 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-red-700" />
              <span>Imprimir Relatório</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-red-200 hover:text-white hover:bg-red-700/80 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Bar (Hidden on Print) */}
        <div className="bg-slate-100 border-b border-slate-200 p-4 space-y-3 print:hidden text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <Filter className="w-4 h-4 text-slate-500" />
              <span>Configurar Período do Relatório:</span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => setPeriodPreset('24H')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  periodPreset === '24H' ? 'bg-red-800 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                24 Horas
              </button>
              <button
                type="button"
                onClick={() => setPeriodPreset('7D')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  periodPreset === '7D' ? 'bg-red-800 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                7 Dias
              </button>
              <button
                type="button"
                onClick={() => setPeriodPreset('30D')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  periodPreset === '30D' ? 'bg-red-800 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                30 Dias
              </button>
              <button
                type="button"
                onClick={() => setPeriodPreset('CUSTOM')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  periodPreset === 'CUSTOM' ? 'bg-red-800 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Personalizado
              </button>
              <button
                type="button"
                onClick={() => setPeriodPreset('TODOS')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  periodPreset === 'TODOS' ? 'bg-red-800 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          {/* Custom Date Inputs if CUSTOM is active */}
          {periodPreset === 'CUSTOM' && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">De:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-mono"
                />
              </div>
            </div>
          )}

          {/* Unit / Squad filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Pelotão:</span>
              <select
                value={selectedPlatoon}
                onChange={(e) => setSelectedPlatoon(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-medium"
              >
                <option value="TODOS">Todos os Pelotões</option>
                {platoons.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Viatura / Guarnição:</span>
              <select
                value={selectedSquad}
                onChange={(e) => setSelectedSquad(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 font-medium"
              >
                <option value="TODOS">Todas as Guarnições</option>
                {squads.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.callSign})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 bg-white font-sans text-xs leading-relaxed print:p-0 print:space-y-4">
          
          {/* Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
            <div className="text-[13px] font-black text-slate-900 uppercase tracking-wide">
              ESTADO DO RIO GRANDE DO SUL • SECRETARIA DA SEGURANÇA PÚBLICA
            </div>
            <div className="text-xs font-extrabold text-red-900 uppercase">
              CORPO DE BOMBEIROS MILITAR • 4º BATALHÃO DE BOMBEIRO MILITAR
            </div>
            <div className="text-sm font-black text-slate-900 mt-1 uppercase tracking-wider">
              RELATÓRIO GERENCIAL E OPERACIONAL DE CORTE E VISTORIA DE ÁRVORES
            </div>
            <div className="text-[11px] text-slate-600 font-medium pt-1">
              Período de Avaliação: <strong className="text-slate-900">{getPeriodLabel()}</strong> • Emitido em {new Date().toLocaleString('pt-BR')}
            </div>
          </div>

          {/* EXECUTIVE SUMMARY DASHBOARD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total no Período</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{filteredList.length}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Ocorrências Registradas</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Concluídas / Feitas</span>
              <span className="text-2xl font-black text-emerald-800 font-mono">{concluidas.length}</span>
              <span className="text-[10px] text-emerald-700 block mt-0.5">
                {filteredList.length > 0 ? `${Math.round((concluidas.length / filteredList.length) * 100)}% de Eficácia` : '0%'}
              </span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-center">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Pendentes Ativas</span>
              <span className="text-2xl font-black text-amber-900 font-mono">{pendentes.length}</span>
              <span className="text-[10px] text-amber-800 block mt-0.5">Exigem Desdobramento</span>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-300 rounded-xl text-center">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">Tempo Médio Solução</span>
              <span className="text-2xl font-black text-blue-900 font-mono">{avgResolutionHours}h</span>
              <span className="text-[10px] text-blue-700 block mt-0.5">Média de Resolução</span>
            </div>
          </div>

          {/* 1. SEÇÃO DE PENDÊNCIAS E OCORRÊNCIAS EM ABERTO (O QUE FALTA FAZER) */}
          <div className="space-y-3">
            <div className="bg-amber-900 text-white px-3 py-1.5 rounded-md font-extrabold uppercase tracking-wider text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                <span>1. Ocorrências Pendentes & Em Atendimento ({pendentes.length + emAtendimento.length})</span>
              </div>
              <span className="text-[11px] text-amber-200 font-normal">Ações em aberto / Requerem continuidade</span>
            </div>

            {pendentes.length === 0 && emAtendimento.length === 0 ? (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 text-center font-bold">
                ✓ Nenhuma ocorrência pendente no período selecionado. Todas as árvores foram atendidas e finalizadas.
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...emAtendimento, ...pendentes].map((occ, idx) => {
                  const hours = getHoursPending(occ);
                  const squad = squads.find(s => s.id === occ.assignedSquadId);
                  const lastAtt = occ.attendances.length > 0 ? occ.attendances[occ.attendances.length - 1] : null;

                  return (
                    <div 
                      key={occ.id} 
                      className="p-3 bg-amber-50/50 border border-amber-300 rounded-xl text-xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-1">
                        <div className="flex items-center gap-2 font-mono">
                          <strong className="text-red-900 font-black text-sm bg-white px-1.5 py-0.5 rounded border border-amber-300">
                            {occ.protocol}
                          </strong>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            occ.status === 'EM_ATENDIMENTO' 
                              ? 'bg-blue-600 text-white' 
                              : hours >= 24 ? 'bg-red-700 text-white' : 'bg-amber-600 text-white'
                          }`}>
                            {occ.status === 'EM_ATENDIMENTO' ? 'EM ATENDIMENTO' : `PENDENTE HÁ ${hours}H`}
                          </span>
                          {occ.isCarriedOver && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold text-[9px] border border-amber-400">
                              Transitadas de Turno
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-600 font-medium">
                          VTR Empenhada: <strong className="text-slate-900">{squad?.name || 'Não informada'}</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                        <div>
                          <strong>📍 Localização:</strong> {occ.address} - {occ.neighborhood}, {occ.city}
                          {occ.referencePoint && <span className="text-slate-500 block text-[11px]">Ref: {occ.referencePoint}</span>}
                        </div>
                        <div>
                          <strong>Solicitante:</strong> {occ.solicitorName} ({occ.solicitorPhone})
                        </div>
                      </div>

                      <div className="text-slate-800 bg-white p-2 rounded border border-amber-200">
                        <strong>Natureza de Despacho (e-193):</strong> {occ.dispatchNature || occ.type}
                        <p className="mt-0.5 text-slate-600 italic">{occ.description}</p>
                      </div>

                      {/* Motivo da Pendência */}
                      {lastAtt?.unresolvedReason && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-900">
                          <strong className="block text-[11px] text-red-950 uppercase">
                            Motivo do Desdobramento / Não Conclusão (POP):
                          </strong>
                          <span className="font-bold">{lastAtt.unresolvedReason.replace(/_/g, ' ')}</span>
                          {lastAtt.unresolvedDetails && (
                            <p className="mt-0.5 text-[11px] text-red-800">{lastAtt.unresolvedDetails}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. SEÇÃO DE OCORRÊNCIAS CONCLUÍDAS (O QUE FOI FEITO) */}
          <div className="space-y-3 pt-2">
            <div className="bg-emerald-900 text-white px-3 py-1.5 rounded-md font-extrabold uppercase tracking-wider text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>2. Ocorrências Concluídas com Sucesso ({concluidas.length})</span>
              </div>
              <span className="text-[11px] text-emerald-200 font-normal">Serviço executado e desobstrução finalizada</span>
            </div>

            {concluidas.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-center italic">
                Nenhuma ocorrência foi concluída no período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2">Protocolo</th>
                      <th className="p-2">Data/Hora</th>
                      <th className="p-2">Endereço & Solicitante</th>
                      <th className="p-2">VTR / Cmt</th>
                      <th className="p-2">Serviço Realizado (POP)</th>
                      <th className="p-2 text-center">Tempo Resolução</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {concluidas.map((occ) => {
                      const createdDate = new Date(occ.createdAt);
                      const squad = squads.find(s => s.id === occ.assignedSquadId);
                      const lastAtt = occ.attendances.length > 0 ? occ.attendances[occ.attendances.length - 1] : null;
                      
                      let resTime = '-';
                      if (occ.lastAttendanceAt) {
                        const diff = (new Date(occ.lastAttendanceAt).getTime() - createdDate.getTime()) / (1000 * 60 * 60);
                        resTime = `${diff.toFixed(1)}h`;
                      }

                      return (
                        <tr key={occ.id} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-red-900 align-top whitespace-nowrap">
                            {occ.protocol}
                          </td>
                          <td className="p-2 text-slate-600 align-top whitespace-nowrap">
                            <div>{createdDate.toLocaleDateString('pt-BR')}</div>
                            <div className="text-[10px] font-mono">{createdDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="p-2 align-top max-w-[220px]">
                            <div className="font-bold text-slate-900">{occ.address}</div>
                            <div className="text-slate-500 text-[11px]">{occ.neighborhood}, {occ.city}</div>
                            <div className="text-slate-500 text-[10px]">Sol: {occ.solicitorName}</div>
                          </td>
                          <td className="p-2 align-top whitespace-nowrap">
                            <div className="font-bold text-slate-800">{squad?.callSign || squad?.name}</div>
                            <div className="text-slate-500 text-[10px]">{squad?.commanderName || 'Comandante de Guarnição'}</div>
                          </td>
                          <td className="p-2 align-top text-slate-700">
                            <div className="font-semibold text-slate-900">{occ.dispatchNature || occ.type}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                              {lastAtt?.actionTaken || occ.description}
                            </div>
                            {lastAtt?.equipmentUsed && lastAtt.equipmentUsed.length > 0 && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Equipamentos: {lastAtt.equipmentUsed.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-center align-top font-mono font-bold text-emerald-800 whitespace-nowrap">
                            {resTime}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assinaturas / Fechamento Oficial */}
          <div className="pt-8 border-t border-slate-300 text-center space-y-4 print:pt-4">
            <div className="text-xs text-slate-600">
              Relatório emitido pelo Sistema de Gestão Operacional de Corte e Vistoria de Vegetais • 4º BBM
            </div>
            <div className="flex justify-around text-xs text-slate-600 pt-6">
              <div className="border-t border-slate-400 w-52 text-center pt-1 font-mono text-[11px]">
                Oficial de Operações / Serviço
              </div>
              <div className="border-t border-slate-400 w-52 text-center pt-1 font-mono text-[11px]">
                Comando do 4º BBM
              </div>
            </div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500 font-medium">
            Total filtrado: <strong>{filteredList.length} ocorrência(s)</strong> ({concluidas.length} concluídas, {pendentes.length} pendentes)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar em PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
