import React, { useState } from 'react';
import { User, UserRole, Occurrence, Squad, Platoon, AppNotification } from '../types';
import { 
  Shield, 
  Flame, 
  Bell, 
  PlusCircle, 
  RefreshCw, 
  Clock, 
  ChevronDown, 
  Download, 
  UserCheck, 
  FileText,
  AlertTriangle,
  BarChart3,
  Truck,
  FileSpreadsheet,
  Layers,
  BookOpen,
  Printer,
  Users
} from 'lucide-react';
import { exportDatabaseBackup } from '../services/storageService';
import { MilitarUser } from '../services/authService';
import { LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  authenticatedMilitar?: MilitarUser | null;
  allUsers: User[];
  occurrences?: Occurrence[];
  squads?: Squad[];
  platoons?: Platoon[];
  notifications?: AppNotification[];
  unreadNotificationsCount: number;
  activeMainTab: 'OPERATIONAL' | 'REPORTS';
  onChangeMainTab: (tab: 'OPERATIONAL' | 'REPORTS') => void;
  onSelectUser: (user: User) => void;
  onOpenNewOccurrence: () => void;
  onOpenNotifications: () => void;
  onOpenShiftHandover: () => void;
  onOpenSquadImport: () => void;
  onOpenPopViewer: () => void;
  onOpenDetailedReport: () => void;
  onOpenMilitaryManagement?: () => void;
  onRefreshData?: () => void;
  onResetData?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  authenticatedMilitar,
  allUsers,
  occurrences = [],
  squads = [],
  platoons = [],
  notifications = [],
  unreadNotificationsCount,
  activeMainTab,
  onChangeMainTab,
  onSelectUser,
  onOpenNewOccurrence,
  onOpenNotifications,
  onOpenShiftHandover,
  onOpenSquadImport,
  onOpenPopViewer,
  onOpenDetailedReport,
  onOpenMilitaryManagement,
  onRefreshData,
  onResetData,
  onLogout,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleExportJson = () => {
    const data = exportDatabaseBackup({
      occurrences,
      platoons,
      squads,
      users: allUsers,
      notifications,
    });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CBMRS_Backup_Ocorrencias_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'COBOM':
        return <span className="bg-red-700 text-white text-[10px] font-bold px-2 py-0.5 rounded">COBOM 193</span>;
      case 'GUARNICAO':
        return <span className="bg-blue-700 text-white text-[10px] font-bold px-2 py-0.5 rounded">Guarnição 24h</span>;
      case 'PELOTAO':
        return <span className="bg-amber-600 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded">Comando Pelotão</span>;
    }
  };

  return (
    <header className="sticky top-0 z-[1200] bg-red-800 border-b border-red-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        
        {/* CBMRS Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-red-800 shadow border border-red-300 font-black shrink-0">
            <Flame className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base sm:text-lg tracking-tight font-sans">
                CBMRS
              </span>
              <span className="text-[10px] bg-red-950 text-red-200 font-mono font-bold px-1.5 py-0.5 rounded border border-red-700/60">
                4º BBM • SANTA MARIA
              </span>
            </div>
            <p className="text-[11px] text-red-100 font-medium line-clamp-1">
              Gestão de Ocorrências de Corte e Vistoria de Árvores
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (Operational vs Reports) */}
        <div className="flex items-center bg-red-950/80 rounded-lg p-1 border border-red-700/60 shadow-inner">
          <button
            onClick={() => onChangeMainTab('OPERATIONAL')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMainTab === 'OPERATIONAL'
                ? 'bg-white text-red-900 shadow-sm'
                : 'text-red-200 hover:text-white hover:bg-red-900/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Painel Operacional</span>
          </button>

          <button
            onClick={() => onChangeMainTab('REPORTS')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMainTab === 'REPORTS'
                ? 'bg-white text-red-900 shadow-sm'
                : 'text-red-200 hover:text-white hover:bg-red-900/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Relatórios & Estatísticas</span>
          </button>
        </div>

        {/* Right Actions & Profile Switcher */}
        <div className="flex items-center gap-2">

          {/* Gestão de Efetivo & Militares (Exclusivo COBOM) */}
          {currentUser.role === 'COBOM' && onOpenMilitaryManagement && (
            <button
              onClick={onOpenMilitaryManagement}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg shadow-sm transition-all cursor-pointer border border-amber-300"
              title="Gestão de Militares & Efetivo do 4º BBM (Editar dados, senhas, cadastros)"
            >
              <Users className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden lg:inline">Militares & Efetivo</span>
              <span className="lg:hidden">Militares</span>
            </button>
          )}

          {/* POP Corte de Árvore (Consulta Oficial & PDF) */}
          <button
            onClick={onOpenPopViewer}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-red-900/90 hover:bg-red-950 text-red-100 text-xs font-semibold rounded-lg border border-red-700/70 transition-colors cursor-pointer"
            title="Procedimento Operacional Padrão de Corte de Árvore CBMRS (Consultar / Salvar PDF)"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden xl:inline">POP Corte Árvore (PDF)</span>
            <span className="xl:hidden">POP</span>
          </button>

          {/* Relatório Detalhado de Impressão (Feito vs Pendente) */}
          <button
            onClick={onOpenDetailedReport}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-red-900/90 hover:bg-red-950 text-red-100 text-xs font-semibold rounded-lg border border-red-700/70 transition-colors cursor-pointer"
            title="Gerar Relatório Detalhado de Feito e Pendente no Período (Impressão / PDF)"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden lg:inline">Imprimir Relatório</span>
            <span className="lg:hidden">Relatório</span>
          </button>

          {/* Cadastro e Escala de Guarnições e-193 */}
          <button
            onClick={onOpenSquadImport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-900/90 hover:bg-red-950 text-red-100 text-xs font-semibold rounded-lg border border-red-700/70 transition-colors cursor-pointer"
            title="Cadastro de Guarnições e Escala de Viaturas e-193"
          >
            <Truck className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden lg:inline">Guarnições e-193</span>
            <span className="lg:hidden">Guarnições</span>
          </button>

          {/* Turno 24h & Passagem de Serviço */}
          <button
            onClick={onOpenShiftHandover}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-red-900/90 hover:bg-red-950 text-red-100 text-xs font-semibold rounded-lg border border-red-700/70 transition-colors cursor-pointer"
            title="Ver Ata de Passagem de Serviço e Árvores Pendentes"
          >
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>Passagem de Turno</span>
          </button>

          {/* Botão Nova Ocorrência */}
          <button
            onClick={onOpenNewOccurrence}
            className="bg-white hover:bg-slate-100 text-red-900 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow border border-red-200 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-red-700" />
            <span className="hidden sm:inline">Nova Ocorrência 193</span>
            <span className="sm:hidden">Nova</span>
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 text-red-100 hover:text-white hover:bg-red-700/80 rounded-lg transition-colors cursor-pointer"
            title="Alertas & Notificações"
          >
            <Bell className="w-5 h-5 text-red-100" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center border border-red-900 shadow">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

            {/* Profile Switcher / Authenticated Militar Info */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-red-900/90 hover:bg-red-950 rounded-lg border border-red-700/70 text-left transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded bg-white text-red-900 flex items-center justify-center font-bold text-xs shadow-sm font-mono">
                  {authenticatedMilitar?.posto_graduacao || (currentUser.role === 'COBOM' ? '193' : 'VTR')}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-white line-clamp-1">
                    {authenticatedMilitar ? `${authenticatedMilitar.posto_graduacao} ${authenticatedMilitar.nome_guerra}` : currentUser.name}
                  </div>
                  <div className="text-[10px] text-red-200">
                    {authenticatedMilitar ? `Mat: ${authenticatedMilitar.matricula}` : currentUser.rank}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-red-300 hidden sm:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-white text-slate-800 border border-slate-200 rounded-xl shadow-2xl p-2 z-[1300] space-y-1 animate-fadeIn"
                  onMouseLeave={() => setShowProfileMenu(false)}
                >
                  {authenticatedMilitar && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-800 text-white flex items-center justify-center font-bold text-xs">
                          {authenticatedMilitar.posto_graduacao}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs">
                            {authenticatedMilitar.posto_graduacao} {authenticatedMilitar.nome_guerra}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Matrícula: {authenticatedMilitar.matricula} • {authenticatedMilitar.perfil}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Posto / Viatura Operacional em Serviço:
                  </div>

                  {allUsers.map((u) => {
                    const isSelected = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSelectUser(u);
                          setShowProfileMenu(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected 
                            ? 'bg-red-50 border border-red-200 text-red-900 font-bold' 
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="text-[10px] text-slate-500">{u.rank}</div>
                        </div>
                        <div>
                          {getRoleBadge(u.role)}
                        </div>
                      </button>
                    );
                  })}

                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    {currentUser.role === 'COBOM' && onOpenMilitaryManagement && (
                      <button
                        onClick={() => {
                          onOpenMilitaryManagement();
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs text-amber-900 bg-amber-50 hover:bg-amber-100 rounded flex items-center gap-1.5 cursor-pointer font-bold border border-amber-200"
                      >
                        <Users className="w-3.5 h-3.5 text-amber-800" />
                        <span>Gestão de Militares & Efetivo</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onOpenSquadImport();
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded flex items-center gap-1.5 cursor-pointer font-medium"
                    >
                      <Truck className="w-3.5 h-3.5 text-red-700" />
                      <span>Cadastro de Guarnições e Escala e-193</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenShiftHandover();
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded flex items-center gap-1.5 cursor-pointer font-medium"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Ata de Passagem de Turno</span>
                    </button>

                    {onLogout && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onLogout();
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs text-red-700 hover:bg-red-50 rounded flex items-center gap-1.5 cursor-pointer font-bold border-t border-slate-100 mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-700" />
                        <span>Sair / Trocar Militar (Logout)</span>
                      </button>
                    )}

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between px-1 text-[11px]">
                      <button
                        onClick={() => {
                          handleExportJson();
                          setShowProfileMenu(false);
                        }}
                        className="text-slate-600 hover:text-slate-900 flex items-center gap-1 py-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Backup JSON</span>
                      </button>
                      <button
                        onClick={() => {
                          if (onRefreshData) {
                            onRefreshData();
                          } else if (onResetData) {
                            onResetData();
                          }
                          setShowProfileMenu(false);
                        }}
                        className="text-red-700 hover:text-red-800 font-semibold flex items-center gap-1 py-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Sincronizar Supabase</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

        </div>

      </div>
    </header>
  );
};
