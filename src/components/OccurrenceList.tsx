import React, { useState, useMemo } from 'react';
import { Occurrence, User, Squad, Platoon, OccurrenceStatus, OccurrenceUrgency } from '../types';
import { OccurrenceCard } from './OccurrenceCard';
import { MapView } from './MapView';
import { getHoursPending } from '../services/storageService';
import { 
  Search, 
  Filter, 
  Map, 
  Grid, 
  Layers, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Truck, 
  X,
  Calendar,
  Sparkles,
  Archive,
  ArrowUpDown,
  Flame,
  CheckCheck
} from 'lucide-react';

interface OccurrenceListProps {
  occurrences: Occurrence[];
  currentUser: User;
  squads: Squad[];
  platoons: Platoon[];
  onSelectOccurrence: (occ: Occurrence) => void;
  onOpenAttendanceForm: (occ: Occurrence) => void;
  onStartAttendance: (occ: Occurrence) => void;
  onEditOccurrence?: (occ: Occurrence) => void;
  onDeleteOccurrence?: (occurrenceId: string) => void;
}

// Calculate criticality score from highest to lowest
export const getCriticalityScore = (occ: Occurrence): number => {
  let score = 0;

  // 1. Urgência
  switch (occ.urgency) {
    case 'CRITICA':
      score += 1000;
      break;
    case 'ALTA':
      score += 700;
      break;
    case 'MEDIA':
      score += 400;
      break;
    case 'BAIXA':
    default:
      score += 100;
      break;
  }

  // 2. Risco / Severidade da árvore
  switch (occ.treeRisk) {
    case 'QUEDA_SOBRE_RESIDENCIA':
      score += 300;
      break;
    case 'GALHO_SOBRE_FIACAO_ENERGIZADA':
      score += 250;
      break;
    case 'QUEDA_SOBRE_VIA_PUBLICA':
      score += 200;
      break;
    case 'RAIZ_EXPOSTA_INSTAVEL':
      score += 170;
      break;
    case 'ARVORE_OCA_PODRE':
      score += 150;
      break;
    case 'VISTORIA_PREVENTIVA_SOLICITADA':
      score += 80;
      break;
    default:
      score += 50;
      break;
  }

  // 3. Status boost (Em atendimento tem ação imediata)
  if (occ.status === 'EM_ATENDIMENTO') {
    score += 120;
  }

  // 4. Transitada de turno / Horas pendentes (mais tempo pendente aumenta prioridade para não esquecer)
  if (occ.isCarriedOver) {
    score += 150;
  }
  const hours = getHoursPending(occ);
  score += Math.min(hours * 5, 200);

  return score;
};

export const OccurrenceList: React.FC<OccurrenceListProps> = ({
  occurrences,
  currentUser,
  squads,
  platoons,
  onSelectOccurrence,
  onOpenAttendanceForm,
  onStartAttendance,
  onEditOccurrence,
  onDeleteOccurrence,
}) => {
  // Main Tab: 'ACTIVE' (Em Aberto / Operacionais) vs 'ARCHIVE' (Concluídas / Arquivadas)
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');

  // Views: 'GRID' or 'MAP'
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP'>('GRID');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubStatus, setSelectedSubStatus] = useState<string>('TODOS'); // 'TODOS' | 'PENDENTE' | 'EM_ATENDIMENTO'
  const [selectedUrgency, setSelectedUrgency] = useState<string>('TODOS');
  const [selectedPlatoon, setSelectedPlatoon] = useState<string>('TODOS');
  const [selectedSquad, setSelectedSquad] = useState<string>('TODOS');
  const [onlyCarriedOver, setOnlyCarriedOver] = useState(false);
  const [onlyMySquad, setOnlyMySquad] = useState(currentUser.role === 'GUARNICAO');

  // Counts for tabs
  const activeCount = useMemo(() => {
    return occurrences.filter(o => o.status !== 'CONCLUIDA').length;
  }, [occurrences]);

  const archiveCount = useMemo(() => {
    return occurrences.filter(o => o.status === 'CONCLUIDA').length;
  }, [occurrences]);

  const filteredOccurrences = useMemo(() => {
    const list = occurrences.filter((occ) => {
      // 1. Tab check: ACTIVE vs ARCHIVE
      if (activeTab === 'ACTIVE') {
        if (occ.status === 'CONCLUIDA') return false;
      } else {
        if (occ.status !== 'CONCLUIDA') return false;
      }

      // 2. Search query (protocol, address, neighborhood, city, description, solicitor)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesProtocol = occ.protocol.toLowerCase().includes(query);
        const matchesAddress = occ.address.toLowerCase().includes(query);
        const matchesNeighborhood = occ.neighborhood.toLowerCase().includes(query);
        const matchesCity = occ.city.toLowerCase().includes(query);
        const matchesDesc = occ.description.toLowerCase().includes(query);
        const matchesSolicitor = occ.solicitorName.toLowerCase().includes(query);
        if (!matchesProtocol && !matchesAddress && !matchesNeighborhood && !matchesCity && !matchesDesc && !matchesSolicitor) {
          return false;
        }
      }

      // 3. Sub-Status (Pendente vs Em Atendimento)
      if (activeTab === 'ACTIVE' && selectedSubStatus !== 'TODOS') {
        if (selectedSubStatus === 'PENDENTE' && occ.status !== 'PENDENTE' && occ.status !== 'ABERTA') {
          return false;
        }
        if (selectedSubStatus === 'EM_ATENDIMENTO' && occ.status !== 'EM_ATENDIMENTO') {
          return false;
        }
      }

      // 4. Urgency
      if (selectedUrgency !== 'TODOS' && occ.urgency !== selectedUrgency) {
        return false;
      }

      // 5. Platoon
      if (selectedPlatoon !== 'TODOS' && occ.platoonId !== selectedPlatoon) {
        return false;
      }

      // 6. Squad
      if (selectedSquad !== 'TODOS' && occ.assignedSquadId !== selectedSquad) {
        return false;
      }

      // 7. Only Carried Over from previous shifts
      if (onlyCarriedOver && (!occ.isCarriedOver || occ.status === 'CONCLUIDA')) {
        return false;
      }

      // 8. Only My Squad (for Squad Commander)
      if (onlyMySquad && currentUser.squadId && occ.assignedSquadId !== currentUser.squadId) {
        return false;
      }

      return true;
    });

    // Sort order
    if (activeTab === 'ACTIVE') {
      // Sort strictly by Criticality (highest to lowest)
      return list.sort((a, b) => {
        const scoreA = getCriticalityScore(a);
        const scoreB = getCriticalityScore(b);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        // Fallback: older first (FIFO)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    } else {
      // ARCHIVE: sorted by most recently updated/concluded first
      return list.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.lastAttendanceAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.lastAttendanceAt || b.createdAt).getTime();
        return timeB - timeA;
      });
    }
  }, [
    occurrences,
    activeTab,
    searchQuery,
    selectedSubStatus,
    selectedUrgency,
    selectedPlatoon,
    selectedSquad,
    onlyCarriedOver,
    onlyMySquad,
    currentUser
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSubStatus('TODOS');
    setSelectedUrgency('TODOS');
    setSelectedPlatoon('TODOS');
    setSelectedSquad('TODOS');
    setOnlyCarriedOver(false);
    setOnlyMySquad(false);
  };

  const hasActiveFilters = 
    searchQuery !== '' || 
    selectedSubStatus !== 'TODOS' || 
    selectedUrgency !== 'TODOS' || 
    selectedPlatoon !== 'TODOS' || 
    selectedSquad !== 'TODOS' || 
    onlyCarriedOver || 
    onlyMySquad;

  return (
    <div className="space-y-4">
      
      {/* 1. Primary Grid Navigation: Ocorrências Ativas vs Arquivo / Concluídas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          {/* Tab 1: Ocorrências Ativas */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('ACTIVE');
              setSelectedSubStatus('TODOS');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
              activeTab === 'ACTIVE'
                ? 'bg-red-800 text-white ring-2 ring-red-800/30'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <Flame className={`w-4 h-4 ${activeTab === 'ACTIVE' ? 'text-amber-300' : 'text-red-700'}`} />
            <span>Ocorrências em Aberto / Operacionais</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-extrabold ${
              activeTab === 'ACTIVE' ? 'bg-red-950 text-amber-300' : 'bg-slate-100 text-slate-800'
            }`}>
              {activeCount}
            </span>
          </button>

          {/* Tab 2: Arquivo / Concluídas */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('ARCHIVE');
              setSelectedSubStatus('TODOS');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
              activeTab === 'ARCHIVE'
                ? 'bg-emerald-800 text-white ring-2 ring-emerald-800/30'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <Archive className={`w-4 h-4 ${activeTab === 'ARCHIVE' ? 'text-emerald-200' : 'text-emerald-700'}`} />
            <span>Arquivo / Concluídas</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-extrabold ${
              activeTab === 'ARCHIVE' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-100 text-slate-800'
            }`}>
              {archiveCount}
            </span>
          </button>
        </div>

        {/* View Mode Toggle: Grid vs Map */}
        <div className="flex items-center bg-white rounded-xl p-1 border border-slate-300 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('GRID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'GRID' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Visualização em Lista / Grade"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grade</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('MAP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'MAP' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Visualização em Mapa Tático"
          >
            <Map className="w-3.5 h-3.5" />
            <span>Mapa Tático</span>
          </button>
        </div>
      </div>

      {/* 2. Controls Bar: Search, Sub-filters, View Toggle */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-sm">
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por protocolo (ex: 00482), rua, bairro ou solicitante..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Sub-Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {activeTab === 'ACTIVE' && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedSubStatus('TODOS')}
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                    selectedSubStatus === 'TODOS'
                      ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Todas Ativas ({activeCount})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSubStatus(selectedSubStatus === 'PENDENTE' ? 'TODOS' : 'PENDENTE')}
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    selectedSubStatus === 'PENDENTE'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Pendentes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSubStatus(selectedSubStatus === 'EM_ATENDIMENTO' ? 'TODOS' : 'EM_ATENDIMENTO')}
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    selectedSubStatus === 'EM_ATENDIMENTO'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                      : 'bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Em Atendimento</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOnlyCarriedOver(!onlyCarriedOver)}
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    onlyCarriedOver
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm ring-1 ring-amber-400/40'
                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  <span>Transitadas de Turno</span>
                </button>
              </>
            )}

            {currentUser.role === 'GUARNICAO' && (
              <button
                type="button"
                onClick={() => setOnlyMySquad(!onlyMySquad)}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  onlyMySquad
                    ? 'bg-blue-100 border-blue-400 text-blue-900 shadow-sm ring-1 ring-blue-400/40'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-blue-700" />
                <span>Minha Guarnição</span>
              </button>
            )}
          </div>

        </div>

        {/* Secondary Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtros:</span>
          </div>

          {/* Urgência Selector */}
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-red-600 focus:border-red-600 font-medium"
          >
            <option value="TODOS">Todas as Urgências</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>

          {/* Pelotão Selector */}
          <select
            value={selectedPlatoon}
            onChange={(e) => setSelectedPlatoon(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-red-600 focus:border-red-600 font-medium"
          >
            <option value="TODOS">Todos os Pelotões</option>
            {platoons.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Guarnição Selector */}
          <select
            value={selectedSquad}
            onChange={(e) => setSelectedSquad(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-red-600 focus:border-red-600 font-medium"
          >
            <option value="TODOS">Todas as Guarnições</option>
            {squads.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-red-700 hover:text-red-800 font-bold underline cursor-pointer ml-auto"
            >
              Limpar Filtros
            </button>
          )}
        </div>

      </div>

      {/* Context Information & Sorting Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-2">
          {activeTab === 'ACTIVE' ? (
            <span className="flex items-center gap-1.5 font-bold text-slate-800 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
              <ArrowUpDown className="w-3.5 h-3.5 text-red-700" />
              <span>Ordenação: <strong>Criticidade Maior para Menor</strong> (Urgência, Risco de Queda, Horas Pendentes)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Arquivo Histórico: <strong>Ocorrências Concluídas</strong> (Mais recentes primeiro)</span>
            </span>
          )}
        </div>

        <div>
          Mostrando <strong className="text-slate-900 font-bold">{filteredOccurrences.length}</strong> ocorrência(s)
        </div>
      </div>

      {/* Main Content: Map or Grid */}
      {viewMode === 'MAP' ? (
        <MapView
          occurrences={filteredOccurrences}
          onSelectOccurrence={onSelectOccurrence}
        />
      ) : (
        <>
          {filteredOccurrences.length === 0 ? (
            <div className="py-14 text-center bg-white border border-dashed border-slate-300 rounded-xl p-6 shadow-sm">
              <Search className="w-9 h-9 mx-auto text-slate-400 mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">
                {activeTab === 'ACTIVE' ? 'Nenhuma ocorrência ativa encontrada' : 'Nenhuma ocorrência arquivada encontrada'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {activeTab === 'ACTIVE' 
                  ? 'Todas as ocorrências podem ter sido concluídas ou não há chamados correspondentes aos filtros.'
                  : 'Nenhuma ocorrência concluída corresponde aos filtros de busca aplicados.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-3 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredOccurrences.map((occ) => (
                <OccurrenceCard
                  key={occ.id}
                  occurrence={occ}
                  currentUser={currentUser}
                  squads={squads}
                  onSelect={onSelectOccurrence}
                  onOpenAttendanceForm={onOpenAttendanceForm}
                  onStartAttendance={onStartAttendance}
                  onEdit={onEditOccurrence}
                  onDelete={onDeleteOccurrence}
                />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
};
