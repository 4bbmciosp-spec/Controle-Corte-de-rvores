import React, { useState, useMemo } from 'react';
import { Occurrence, Platoon, Squad, UnresolvedReason } from '../types';
import { getHoursPending } from '../services/storageService';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  ShieldAlert, 
  Filter, 
  Layers, 
  FileSpreadsheet,
  Award,
  TreePine,
  ChevronRight,
  TrendingUp,
  Activity,
  Printer,
  BookOpen
} from 'lucide-react';

interface ReportsDashboardProps {
  occurrences: Occurrence[];
  platoons: Platoon[];
  squads: Squad[];
  onOpenDetailedReport?: () => void;
  onOpenPopViewer?: () => void;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  occurrences,
  platoons,
  squads,
  onOpenDetailedReport,
  onOpenPopViewer,
}) => {
  const [periodFilter, setPeriodFilter] = useState<'24H' | '7D' | '30D' | 'TODOS'>('TODOS');
  const [selectedPlatoon, setSelectedPlatoon] = useState<string>('TODOS');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');

  // Filter occurrences based on period and platoon
  const filteredOccurrences = useMemo(() => {
    const now = Date.now();
    return occurrences.filter(occ => {
      // Period filter
      if (periodFilter === '24H') {
        const diffHours = (now - new Date(occ.createdAt).getTime()) / (1000 * 60 * 60);
        if (diffHours > 24) return false;
      } else if (periodFilter === '7D') {
        const diffDays = (now - new Date(occ.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (periodFilter === '30D') {
        const diffDays = (now - new Date(occ.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }

      // Platoon filter
      if (selectedPlatoon !== 'TODOS' && occ.platoonId !== selectedPlatoon) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'TODOS' && occ.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [occurrences, periodFilter, selectedPlatoon, selectedStatus]);

  // General Metrics
  const totalCount = filteredOccurrences.length;
  const concluidas = filteredOccurrences.filter(o => o.status === 'CONCLUIDA');
  const pendentes = filteredOccurrences.filter(o => o.status === 'PENDENTE');
  const emAtendimento = filteredOccurrences.filter(o => o.status === 'EM_ATENDIMENTO');
  const abertas = filteredOccurrences.filter(o => o.status === 'ABERTA');

  // Tempo Médio de Resolução (para ocorrências Concluídas)
  const averageResolutionTimeHours = useMemo(() => {
    if (concluidas.length === 0) return 0;
    let totalMinutes = 0;
    let count = 0;

    concluidas.forEach(occ => {
      const created = new Date(occ.createdAt).getTime();
      // Use lastAttendanceAt or finishedAt from attendances if available, else updatedAt
      const finished = occ.lastAttendanceAt ? new Date(occ.lastAttendanceAt).getTime() : new Date(occ.updatedAt).getTime();
      const diffMinutes = Math.max(10, Math.floor((finished - created) / (1000 * 60)));
      totalMinutes += diffMinutes;
      count++;
    });

    return count > 0 ? (totalMinutes / count / 60) : 0;
  }, [concluidas]);

  // Frequência dos Motivos de Não Conclusão
  const unresolvedReasonsMap = useMemo(() => {
    const reasons: Record<string, { label: string; count: number; percentage: number }> = {
      'NECESSIDADE_APOIO_CEEE_EQUATORIAL': { label: 'Apoio da Concessionária (CEEE Equatorial / RGE)', count: 0, percentage: 0 },
      'ARVORE_GRANDE_PORTE_GUINDASTE': { label: 'Árvore de Grande Porte (Auto Escada / Guindaste)', count: 0, percentage: 0 },
      'CONDICAO_CLIMATICA_TEMPESTADE': { label: 'Condição Climática Adversa / Tempestade', count: 0, percentage: 0 },
      'FALTA_EQUIPAMENTO_ESPECIFICO': { label: 'Falta de Equipamento Específico', count: 0, percentage: 0 },
      'AUTORIZACAO_AMBIENTAL_PENDENTE': { label: 'Autorização Ambiental / SMA Pendente', count: 0, percentage: 0 },
      'ACESSO_BLOQUEADO_IMPOSSIBILITADO': { label: 'Acesso Bloqueado / Impossibilitado', count: 0, percentage: 0 },
      'OUTRO': { label: 'Outro Motivo Operacional', count: 0, percentage: 0 }
    };

    let totalUnresolvedAttendances = 0;

    filteredOccurrences.forEach(occ => {
      occ.attendances.forEach(att => {
        if (att.statusResult === 'PENDENTE' && att.unresolvedReason) {
          totalUnresolvedAttendances++;
          if (reasons[att.unresolvedReason]) {
            reasons[att.unresolvedReason].count++;
          } else {
            reasons['OUTRO'].count++;
          }
        }
      });
    });

    if (totalUnresolvedAttendances > 0) {
      Object.keys(reasons).forEach(key => {
        reasons[key].percentage = Math.round((reasons[key].count / totalUnresolvedAttendances) * 100);
      });
    }

    return Object.entries(reasons)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOccurrences]);

  // Ranking das Guarnições
  const squadRanking = useMemo(() => {
    const map = new Map<string, { 
      squad: Squad; 
      attendancesCount: number; 
      concludedCount: number; 
      pendingCount: number;
      assignedCount: number;
    }>();

    squads.forEach(s => {
      map.set(s.id, {
        squad: s,
        attendancesCount: 0,
        concludedCount: 0,
        pendingCount: 0,
        assignedCount: 0
      });
    });

    filteredOccurrences.forEach(occ => {
      if (map.has(occ.assignedSquadId)) {
        map.get(occ.assignedSquadId)!.assignedCount++;
      }

      occ.attendances.forEach(att => {
        let entry = map.get(att.squadId);
        if (!entry) {
          // squad might have been added
          const fallbackSquad: Squad = {
            id: att.squadId,
            name: att.squadName,
            callSign: att.callSign,
            platoonId: occ.platoonId,
            commanderName: att.commanderName,
            currentShift: att.shiftInfo,
            status: 'DISPONIVEL',
            activeMembersCount: 1
          };
          entry = { squad: fallbackSquad, attendancesCount: 0, concludedCount: 0, pendingCount: 0, assignedCount: 0 };
          map.set(att.squadId, entry);
        }

        entry.attendancesCount++;
        if (att.statusResult === 'CONCLUIDA') {
          entry.concludedCount++;
        } else {
          entry.pendingCount++;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.attendancesCount !== a.attendancesCount) {
        return b.attendancesCount - a.attendancesCount;
      }
      return b.assignedCount - a.assignedCount;
    });
  }, [filteredOccurrences, squads]);

  // Exportar Relatório CSV
  const handleExportCSV = () => {
    const headers = [
      'Protocolo',
      'Número OC (e-193)',
      'Data de Abertura',
      'Hora de Abertura',
      'Status Operacional',
      'Grau de Urgência',
      'Natureza de Despacho (e-193)',
      'Tipo de Risco',
      'Município',
      'Bairro',
      'Endereço',
      'Ponto de Referência',
      'Solicitante',
      'Telefone Solicitante',
      'Pelotão Responsável',
      'Guarnição Empenhada',
      'Comandante da Guarnição',
      'Veio de Turno Anterior?',
      'Total de Atendimentos',
      'Tempo de Resolução (Horas)',
      'Último Desfecho / Motivo Não Conclusão',
      'Detalhamento do Desfecho'
    ];

    const rows = filteredOccurrences.map(occ => {
      const createdDate = new Date(occ.createdAt);
      const formattedDate = createdDate.toLocaleDateString('pt-BR');
      const formattedTime = createdDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const platoon = platoons.find(p => p.id === occ.platoonId);
      const squad = squads.find(s => s.id === occ.assignedSquadId);

      const lastAtt = occ.attendances.length > 0 ? occ.attendances[occ.attendances.length - 1] : null;
      let resolutionHours = '';
      if (occ.status === 'CONCLUIDA' && occ.lastAttendanceAt) {
        const diff = (new Date(occ.lastAttendanceAt).getTime() - createdDate.getTime()) / (1000 * 60 * 60);
        resolutionHours = diff.toFixed(1);
      }

      const cleanText = (str: string | undefined) => (str || '').replace(/"/g, '""');

      return [
        `"${cleanText(occ.protocol)}"`,
        `"${cleanText(occ.numeroE193)}"`,
        `"${formattedDate}"`,
        `"${formattedTime}"`,
        `"${cleanText(occ.status)}"`,
        `"${cleanText(occ.urgency)}"`,
        `"${cleanText(occ.dispatchNature || occ.type)}"`,
        `"${cleanText(occ.treeRisk)}"`,
        `"${cleanText(occ.city)}"`,
        `"${cleanText(occ.neighborhood)}"`,
        `"${cleanText(occ.address)}"`,
        `"${cleanText(occ.referencePoint)}"`,
        `"${cleanText(occ.solicitorName)}"`,
        `"${cleanText(occ.solicitorPhone)}"`,
        `"${cleanText(platoon?.name || occ.platoonId)}"`,
        `"${cleanText(squad?.name || occ.assignedSquadId)}"`,
        `"${cleanText(squad?.commanderName || '')}"`,
        `"${occ.isCarriedOver ? 'SIM' : 'NÃO'}"`,
        occ.attendances.length,
        `"${resolutionHours}"`,
        `"${cleanText(lastAtt?.unresolvedReason || lastAtt?.statusResult || '')}"`,
        `"${cleanText(lastAtt?.unresolvedDetails || lastAtt?.actionTaken || occ.description)}"`
      ].join(';');
    });

    // Add UTF-8 BOM for direct compatibility with Microsoft Excel in Portuguese
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CBMRS_Relatorio_Estatistico_4BBM_Santa_Maria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      
      {/* Top Bar: Title & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4 text-red-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Relatórios e Estatísticas Operacionais do Pelotão
              </h2>
              <p className="text-xs text-slate-500">
                4º BBM - Santa Maria | Análise de desempenho de corte, vistoria e desobstrução de árvores
              </p>
            </div>
          </div>
        </div>

        {/* Action: Export CSV */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Relatório CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-red-600" />
          <span>Filtros do Relatório:</span>
        </div>

        {/* Period Selector */}
        <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-300">
          <button
            onClick={() => setPeriodFilter('24H')}
            className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
              periodFilter === '24H' ? 'bg-red-800 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Últimas 24h
          </button>
          <button
            onClick={() => setPeriodFilter('7D')}
            className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
              periodFilter === '7D' ? 'bg-red-800 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => setPeriodFilter('30D')}
            className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
              periodFilter === '30D' ? 'bg-red-800 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Últimos 30 dias
          </button>
          <button
            onClick={() => setPeriodFilter('TODOS')}
            className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
              periodFilter === 'TODOS' ? 'bg-red-800 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos os Registros
          </button>
        </div>

        {/* Pelotão Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Pelotão:</span>
          <select
            value={selectedPlatoon}
            onChange={(e) => setSelectedPlatoon(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:ring-1 focus:ring-red-600"
          >
            <option value="TODOS">Todos os Pelotões (4º BBM)</option>
            {platoons.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Status Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:ring-1 focus:ring-red-600"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ABERTA">Abertas</option>
            <option value="EM_ATENDIMENTO">Em Atendimento</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="CONCLUIDA">Concluídas</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total de Ocorrências */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total no Período</span>
            <Layers className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Concluídas: <strong className="text-emerald-700">{concluidas.length}</strong></span>
            <span>Pendentes: <strong className="text-amber-700">{pendentes.length}</strong></span>
          </div>
        </div>

        {/* Tempo Médio de Resolução */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tempo Médio Resolução</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-blue-900 font-mono">
            {averageResolutionTimeHours > 0 ? `${averageResolutionTimeHours.toFixed(1)}h` : 'N/D'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 pt-1 border-t border-slate-100">
            Calculado sobre {concluidas.length} ocorrência(s) finalizada(s)
          </div>
        </div>

        {/* Taxa de Eficácia Operacional */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Taxa de Conclusão</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-800 font-mono">
            {totalCount > 0 ? `${Math.round((concluidas.length / totalCount) * 100)}%` : '0%'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 pt-1 border-t border-slate-100">
            {concluidas.length} de {totalCount} ocorrências finalizadas
          </div>
        </div>

        {/* Ocorrências com Transição de Turno */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pendências de Turno</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-700 font-mono">
            {pendentes.filter(o => o.isCarriedOver).length}
          </div>
          <div className="text-[11px] text-amber-800 font-semibold mt-1 pt-1 border-t border-slate-100">
            Árvores mantidas para o próximo turno
          </div>
        </div>

      </div>

      {/* Two Column Layout: Frequência de Motivos vs Ranking das Guarnições */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* 1. FREQUÊNCIA DOS MOTIVOS DE 'NÃO CONCLUÍDA' */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                Frequência dos Motivos de "Não Concluída"
              </h3>
            </div>
            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded font-mono">
              {unresolvedReasonsMap.reduce((acc, r) => acc + r.count, 0)} registros
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Principais gargalos operacionais que impediram a finalização do corte ou vistoria no turno inicial:
          </p>

          <div className="space-y-3 pt-1">
            {unresolvedReasonsMap.map((reason) => (
              <div key={reason.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{reason.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{reason.count}</span>
                    <span className="text-[11px] text-slate-500 font-mono">({reason.percentage}%)</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(reason.percentage, reason.count > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. RANKING DAS GUARNIÇÕES (ATENDIMENTOS E DESFECHOS) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-red-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                Ranking de Atendimentos das Guarnições (4º BBM)
              </h3>
            </div>
            <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded font-mono">
              e-193 Santa Maria
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Viaturas e guarnições com maior volume de intervenções e cortes realizados:
          </p>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {squadRanking.map((item, index) => (
              <div 
                key={item.squad.id}
                className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs ${
                    index === 0 ? 'bg-amber-400 text-amber-950 font-black shadow-sm' :
                    index === 1 ? 'bg-slate-300 text-slate-800' :
                    index === 2 ? 'bg-amber-700 text-white' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span>{item.squad.callSign}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({item.squad.commanderName})
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">
                      {item.squad.unitText || item.squad.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="font-mono font-extrabold text-slate-900 text-sm">
                      {item.attendancesCount}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
                      Atendimentos
                    </div>
                  </div>

                  <div className="border-l border-slate-200 pl-2">
                    <div className="font-mono font-bold text-emerald-700 text-xs">
                      {item.concludedCount} concl.
                    </div>
                    <div className="font-mono text-amber-700 text-[10px]">
                      {item.pendingCount} pend.
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Ocorrências Consolidadas do Período */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <TreePine className="w-4 h-4 text-slate-700" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              Listagem Consolidada para Auditoria ({filteredOccurrences.length} ocorrências)
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <th className="p-2 font-bold">Protocolo</th>
                <th className="p-2 font-bold">Nº e-193</th>
                <th className="p-2 font-bold">Data</th>
                <th className="p-2 font-bold">Endereço / Bairro</th>
                <th className="p-2 font-bold">Natureza do Despacho</th>
                <th className="p-2 font-bold">Guarnição Empenhada</th>
                <th className="p-2 font-bold">Status</th>
                <th className="p-2 font-bold">Atendimentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOccurrences.map(occ => {
                const squad = squads.find(s => s.id === occ.assignedSquadId);
                return (
                  <tr key={occ.id} className="hover:bg-slate-50">
                    <td className="p-2 font-mono font-bold text-red-900">{occ.protocol}</td>
                    <td className="p-2 font-mono text-amber-800">{occ.numeroE193 || '—'}</td>
                    <td className="p-2 text-slate-500 whitespace-nowrap">
                      {new Date(occ.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-2">
                      <div className="font-semibold text-slate-900">{occ.address}</div>
                      <div className="text-[10px] text-slate-500">{occ.neighborhood}, {occ.city}</div>
                    </td>
                    <td className="p-2 text-slate-800">
                      {occ.dispatchNature || occ.type}
                    </td>
                    <td className="p-2 font-medium text-slate-700">
                      {squad?.name || occ.assignedSquadId}
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        occ.status === 'CONCLUIDA' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        occ.status === 'EM_ATENDIMENTO' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        occ.status === 'PENDENTE' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-orange-100 text-orange-800 border border-orange-200'
                      }`}>
                        {occ.status}
                      </span>
                    </td>
                    <td className="p-2 text-slate-600 font-mono text-center">
                      {occ.attendances.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
