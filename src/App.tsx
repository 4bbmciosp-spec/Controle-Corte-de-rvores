/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Occurrence, 
  User, 
  Squad, 
  Platoon, 
  AppNotification 
} from './types';
import { 
  setSquadInAttendance,
  getHoursPending,
  deleteOccurrence
} from './services/storageService';
import { 
  getCurrentMilitar, 
  logoutMilitar, 
  MilitarUser 
} from './services/authService';
import { 
  fetchOccurrencesFromSupabase,
  fetchPlatoonsFromSupabase,
  fetchSquadsFromSupabase,
  fetchNotificationsFromSupabase,
  markNotificationAsReadInSupabase,
  insertNotificationToSupabase,
  subscribeToOccurrencesRealtime 
} from './services/supabaseDataService';

// Components
import { Header } from './components/Header';
import { StatsDashboard } from './components/StatsDashboard';
import { OccurrenceList } from './components/OccurrenceList';
import { ReportsDashboard } from './components/ReportsDashboard';
import { SquadImportModal } from './components/SquadImportModal';
import { OccurrenceDetailModal } from './components/OccurrenceDetailModal';
import { AttendanceFormModal } from './components/AttendanceFormModal';
import { CobomNewOccurrenceModal } from './components/CobomNewOccurrenceModal';
import { ShiftHandoverModal } from './components/ShiftHandoverModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { PopViewerModal } from './components/PopViewerModal';
import { DetailedReportPrintModal } from './components/DetailedReportPrintModal';
import { MilitaryManagementModal } from './components/MilitaryManagementModal';
import { LoginModal } from './components/LoginModal';
import { ForcePasswordChangeModal } from './components/ForcePasswordChangeModal';

import { 
  ShieldAlert, 
  Flame, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function App() {
  // Authentication State with Supabase
  const [authenticatedMilitar, setAuthenticatedMilitar] = useState<MilitarUser | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Supabase Data Loading State
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Database Entities from Supabase
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [platoons, setPlatoons] = useState<Platoon[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Navigation State
  const [activeMainTab, setActiveMainTab] = useState<'OPERATIONAL' | 'REPORTS'>('OPERATIONAL');

  // Modals & Drawers State
  const [detailOccurrence, setDetailOccurrence] = useState<Occurrence | null>(null);
  const [attendanceOccurrence, setAttendanceOccurrence] = useState<Occurrence | null>(null);
  const [editOccurrence, setEditOccurrence] = useState<Occurrence | null>(null);
  const [isNewOccurrenceOpen, setIsNewOccurrenceOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isShiftHandoverOpen, setIsShiftHandoverOpen] = useState(false);
  const [isSquadImportOpen, setIsSquadImportOpen] = useState(false);
  const [isPopViewerOpen, setIsPopViewerOpen] = useState(false);
  const [isDetailedReportOpen, setIsDetailedReportOpen] = useState(false);
  const [isMilitaryManagementOpen, setIsMilitaryManagementOpen] = useState(false);

  // Status Filter from Dashboard Cards
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('TODOS');

  // 1. Initial Auth Check
  useEffect(() => {
    async function initAuth() {
      try {
        const militar = await getCurrentMilitar();
        if (militar) {
          setAuthenticatedMilitar(militar);
          setRequiresPasswordChange(Boolean(militar.senha_temporaria));
        }
      } catch (e) {
        console.error('Erro na checagem de autenticação:', e);
      } finally {
        setAuthChecking(false);
      }
    }
    initAuth();
  }, []);

  // 2. Strict Supabase Data Fetching (No Local/Seed fallback)
  const loadAllData = useCallback(async () => {
    if (!authenticatedMilitar) return;

    setDataLoading(true);
    setDataError(null);

    try {
      // Parallel fetch with explicit resource-level error handling
      const [fetchedPlatoons, fetchedSquads, fetchedOccs, fetchedNotifs] = await Promise.all([
        fetchPlatoonsFromSupabase().catch(err => {
          throw new Error(`Não foi possível carregar os pelotões do Supabase: ${err?.message || err}`);
        }),
        fetchSquadsFromSupabase().catch(err => {
          throw new Error(`Não foi possível carregar as guarnições do Supabase: ${err?.message || err}`);
        }),
        fetchOccurrencesFromSupabase().catch(err => {
          throw new Error(`Não foi possível carregar as ocorrências do Supabase: ${err?.message || err}`);
        }),
        fetchNotificationsFromSupabase().catch(err => {
          console.warn('Aviso ao carregar notificações do Supabase:', err);
          return [];
        }),
      ]);

      setPlatoons(fetchedPlatoons);
      setSquads(fetchedSquads);
      setOccurrences(fetchedOccs);
      setNotifications(fetchedNotifs);

      // Derive currentUser from authenticated militar and real Supabase structure.
      // PRIORIDADE: a escala real (fetchedSquads[].members agora vem de
      // v_guarnicao_em_servico) — ou seja, "em qual VTR este militar está
      // escalado AGORA". Só cai para squad_atual_id (campo legado/estático)
      // se o militar não tiver nenhum registro de escala vigente no momento
      // (ex: fora de serviço, ou escala ainda não importada).
      const activeSquad =
        fetchedSquads.find(s => s.members?.some(m => m.id === authenticatedMilitar.id)) ||
        fetchedSquads.find(
          s => s.id === authenticatedMilitar.squad_atual_id || s.id === authenticatedMilitar.guarnicao_id
        );
      const activePlatoon = fetchedPlatoons.find(
        p => p.id === authenticatedMilitar.platoon_atual_id || p.id === authenticatedMilitar.pelotao_id
      );

      const matchedUser: User = {
        // CRÍTICO: preservar o UUID real de militares.id (não fabricar um ID sintético).
        // Vários campos do banco (preenchido_por_id, militar_responsavel_id, aberta_por,
        // militares_auditoria.alterado_por via auth.uid()) dependem deste UUID ser real.
        id: authenticatedMilitar.id,
        name: authenticatedMilitar.nome_guerra,
        rank: authenticatedMilitar.posto_graduacao,
        role: authenticatedMilitar.perfil,
        platoonId: activePlatoon?.id || authenticatedMilitar.platoon_atual_id || (fetchedPlatoons[0]?.id || ''),
        squadId: authenticatedMilitar.perfil === 'GUARNICAO' ? (activeSquad?.id || authenticatedMilitar.squad_atual_id || undefined) : undefined,
        registrationNumber: authenticatedMilitar.matricula,
      };

      setCurrentUser(matchedUser);

      // Synthesize user list from squad members + militar
      const synUsers: User[] = [matchedUser];
      fetchedSquads.forEach(sq => {
        sq.members?.forEach(m => {
          if (!synUsers.some(u => u.registrationNumber === m.registrationNumber)) {
            synUsers.push({
              // Usa o UUID real do militar quando disponível (vindo do banco).
              // O prefixo sintético só é um último recurso e não deve ser usado
              // para gravar em campos de FK (preenchido_por_id, militar_responsavel_id etc.).
              id: m.id || `user-${m.registrationNumber}`,
              name: m.name,
              rank: m.rank,
              role: 'GUARNICAO',
              platoonId: sq.platoonId,
              squadId: sq.id,
              registrationNumber: m.registrationNumber,
            });
          }
        });
      });
      setUsers(synUsers);

    } catch (err: any) {
      console.error('Erro crítico ao carregar dados do Supabase:', err);
      setDataError(err?.message || String(err));
    } finally {
      setDataLoading(false);
    }
  }, [authenticatedMilitar]);

  // Load data whenever authenticated militar is verified
  useEffect(() => {
    if (authenticatedMilitar) {
      loadAllData();
    }
  }, [authenticatedMilitar, loadAllData]);

  // Realtime Supabase Subscription for Instant Sync
  useEffect(() => {
    if (!authenticatedMilitar) return;

    const unsubscribe = subscribeToOccurrencesRealtime(async () => {
      try {
        const syncedOccs = await fetchOccurrencesFromSupabase();
        setOccurrences(syncedOccs);
      } catch (e) {
        console.warn('Erro ao sincronizar realtime:', e);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [authenticatedMilitar]);

  // Periodic Check for 12h/24h recurring alerts for pending unresolved tree incidents
  useEffect(() => {
    if (!authenticatedMilitar || dataLoading || dataError) return;

    const interval = setInterval(async () => {
      try {
        for (const occ of occurrences) {
          if (occ.status === 'PENDENTE') {
            const hours = getHoursPending(occ);
            if (hours >= 12) {
              const alertTag = hours >= 24 ? '24h' : '12h';
              const notifKey = `recur-alert-${occ.id}-${alertTag}`;
              
              const alreadyNotified = notifications.some(n => n.id.includes(notifKey));
              if (!alreadyNotified) {
                const notif: AppNotification = {
                  id: `${notifKey}-${Date.now()}`,
                  title: `🚨 Alerta Recorrente: ${occ.protocol} sem conclusão há ${hours}h`,
                  message: `Árvore no endereço ${occ.address} permanece pendente. Acompanhamento prioritário exigido pelo Comando do Pelotão!`,
                  type: hours >= 24 ? 'PENDING_ALERT_24H' : 'PENDING_ALERT_12H',
                  occurrenceId: occ.id,
                  occurrenceProtocol: occ.protocol,
                  targetRoles: ['COBOM', 'GUARNICAO', 'PELOTAO'],
                  targetSquadId: occ.assignedSquadId,
                  createdAt: new Date().toISOString(),
                  isRead: false
                };
                await insertNotificationToSupabase(notif);
                setNotifications(prev => [notif, ...prev]);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao processar alertas recorrentes:', e);
      }
    }, 60000); // Check every 60s

    return () => clearInterval(interval);
  }, [authenticatedMilitar, dataLoading, dataError, occurrences, notifications]);

  // Handle Login from Supabase Modal
  const handleLoginSuccess = (militar: MilitarUser) => {
    setAuthenticatedMilitar(militar);
    setRequiresPasswordChange(Boolean(militar.senha_temporaria));
  };

  // Handle Password Changed successfully
  const handlePasswordChanged = () => {
    setRequiresPasswordChange(false);
    if (authenticatedMilitar) {
      setAuthenticatedMilitar({
        ...authenticatedMilitar,
        senha_temporaria: false
      });
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logoutMilitar();
    setAuthenticatedMilitar(null);
    setCurrentUser(null);
    setRequiresPasswordChange(false);
    setOccurrences([]);
    setSquads([]);
    setPlatoons([]);
    setNotifications([]);
    setDataError(null);
  };

  // Switch User Profile
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
  };

  // Delete Occurrence (Exclusive for COBOM)
  const handleDeleteOccurrence = async (occId: string) => {
    try {
      await deleteOccurrence(occId);
      setOccurrences(prev => prev.filter(o => o.id !== occId));
      if (detailOccurrence?.id === occId) {
        setDetailOccurrence(null);
      }
      if (editOccurrence?.id === occId) {
        setEditOccurrence(null);
      }
    } catch (err: any) {
      alert(`Erro ao excluir ocorrência no Supabase: ${err?.message || err}`);
    }
  };

  // Start Attendance in Field
  const handleStartAttendance = async (occ: Occurrence) => {
    if (!currentUser?.squadId) {
      alert('Selecione um perfil de Guarnição para iniciar o atendimento.');
      return;
    }
    try {
      const updated = await setSquadInAttendance(occ, currentUser.squadId);
      setOccurrences(prev => prev.map(o => o.id === updated.id ? updated : o));
      if (detailOccurrence?.id === occ.id) {
        setDetailOccurrence(updated);
      }
    } catch (err: any) {
      alert(`Erro ao iniciar atendimento no Supabase: ${err?.message || err}`);
    }
  };

  // Mark notification read in memory and Supabase
  const handleMarkNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await markNotificationAsReadInSupabase(id);
  };

  const handleMarkAllNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    for (const n of notifications) {
      if (!n.isRead) {
        await markNotificationAsReadInSupabase(n.id);
      }
    }
  };

  // Select occurrence by protocol from notifications
  const handleSelectOccurrenceByProtocol = (protocol: string) => {
    const occ = occurrences.find(o => o.protocol === protocol);
    if (occ) {
      setDetailOccurrence(occ);
    }
  };

  // Auth checking initial state
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3 text-white">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300">
            Conectando ao Sistema CBMRS 4º BBM...
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated in Supabase, show Login Modal
  if (!authenticatedMilitar) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  // If militar has temporary password, require password change
  if (requiresPasswordChange && authenticatedMilitar) {
    return (
      <ForcePasswordChangeModal
        militar={authenticatedMilitar}
        onPasswordChanged={handlePasswordChanged}
      />
    );
  }

  // Explicit Supabase Error Screen (No fallback to local/seed data)
  if (dataError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-xl shadow-2xl border border-red-200 p-6 max-w-lg w-full text-slate-800 space-y-4">
          <div className="flex items-center gap-3 text-red-700 pb-3 border-b border-slate-200">
            <div className="p-2.5 bg-red-100 rounded-lg">
              <ShieldAlert className="w-6 h-6 text-red-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Falha ao Conectar ao Supabase</h3>
              <p className="text-xs text-red-600 font-medium">4º BBM — Santa Maria (Produção)</p>
            </div>
          </div>
          
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{dataError}</p>
            </div>
            <p className="text-[11px] text-slate-600 pl-6">
              O sistema foi configurado para utilizar <strong>estritamente o Supabase</strong> como fonte de dados. Dados locais e de teste foram totalmente desativados.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Sair / Trocar Usuário
            </button>
            <button
              onClick={loadAllData}
              className="px-5 py-2.5 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-2 shadow transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar novamente</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Data Loading Spinner Screen
  if (dataLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-1 text-white">
            <h3 className="font-bold text-base">CBMRS 4º BBM — Santa Maria</h3>
            <p className="text-xs text-slate-300">Carregando dados operacionais do Supabase...</p>
          </div>
        </div>
      </div>
    );
  }

  const unreadNotifsCount = notifications.filter(n => {
    if (n.targetRoles && !n.targetRoles.includes(currentUser.role)) return false;
    return !n.isRead;
  }).length;

  const currentSquad = squads.find(s => s.id === currentUser.squadId);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-red-700 selection:text-white">
      
      {/* 1. Official Header */}
      <Header
        currentUser={currentUser}
        authenticatedMilitar={authenticatedMilitar}
        allUsers={users}
        occurrences={occurrences}
        squads={squads}
        platoons={platoons}
        notifications={notifications}
        unreadNotificationsCount={unreadNotifsCount}
        activeMainTab={activeMainTab}
        onChangeMainTab={setActiveMainTab}
        onSelectUser={handleSelectUser}
        onOpenNewOccurrence={() => setIsNewOccurrenceOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenShiftHandover={() => setIsShiftHandoverOpen(true)}
        onOpenSquadImport={() => setIsSquadImportOpen(true)}
        onOpenPopViewer={() => setIsPopViewerOpen(true)}
        onOpenDetailedReport={() => setIsDetailedReportOpen(true)}
        onOpenMilitaryManagement={() => setIsMilitaryManagementOpen(true)}
        onRefreshData={loadAllData}
        onLogout={handleLogout}
      />

      {/* Role Context Notification Bar */}
      <div className="bg-red-900 text-red-100 border-b border-red-950 px-4 sm:px-6 py-2 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-red-100">
              Operando como: <strong className="text-white font-bold">{authenticatedMilitar.posto_graduacao} {authenticatedMilitar.nome_guerra}</strong> ({currentUser.name} - {currentUser.role})
            </span>
            <span className="text-red-300 hidden sm:inline">•</span>
            <span className="text-red-200 hidden sm:inline">
              {currentUser.role === 'COBOM' 
                ? 'Central de Despacho 193 (Criação, empenho de guarnições e edição geral)' 
                : currentUser.role === 'GUARNICAO'
                  ? (currentSquad ? `Viatura: ${currentSquad.name} (Atendimentos em campo, registro de desfecho e fotos)` : 'Perfil Guarnição (Nenhuma VTR vinculada)')
                  : 'Acompanhamento Estratégico do Pelotão (Histórico, estatísticas e linha do tempo)'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-red-200 font-mono">
            <span>Região: <strong className="text-white font-bold">4º BBM Santa Maria</strong></span>
            <span>•</span>
            <span>Escala: <strong className="text-white font-bold">Turno 24h</strong></span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        
        {activeMainTab === 'REPORTS' ? (
          /* RELATÓRIOS E ESTATÍSTICAS DO PELOTÃO */
          <ReportsDashboard
            occurrences={occurrences}
            platoons={platoons}
            squads={squads}
            onOpenDetailedReport={() => setIsDetailedReportOpen(true)}
            onOpenPopViewer={() => setIsPopViewerOpen(true)}
          />
        ) : (
          /* PAINEL OPERACIONAL PADRÃO */
          <>
            {/* 2. Stats Dashboard & Handover Alert */}
            <StatsDashboard
              occurrences={occurrences}
              currentUser={currentUser}
              activeStatusFilter={activeStatusFilter}
              onFilterStatus={(status) => setActiveStatusFilter(status)}
              onOpenShiftHandover={() => setIsShiftHandoverOpen(true)}
            />

            {/* 3. Occurrences List & Tactical Map View */}
            <OccurrenceList
              occurrences={occurrences}
              currentUser={currentUser}
              squads={squads}
              platoons={platoons}
              onSelectOccurrence={(occ) => setDetailOccurrence(occ)}
              onOpenAttendanceForm={(occ) => setAttendanceOccurrence(occ)}
              onStartAttendance={handleStartAttendance}
              onEditOccurrence={(occ) => setEditOccurrence(occ)}
              onDeleteOccurrence={handleDeleteOccurrence}
            />
          </>
        )}

      </main>

      {/* Footer / Status Bar */}
      <footer className="bg-slate-200 border-t border-slate-300 px-4 sm:px-6 py-2.5 text-xs text-slate-600 font-medium">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-700" />
            <span className="font-bold text-slate-800">Corpo de Bombeiros Militar do Estado do Rio Grande do Sul</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            4º BBM - Santa Maria • Sistema de Gestão de Vistorias e Cortes Emergenciais de Árvores • Central 193
          </div>
        </div>
      </footer>

      {/* MODALS */}
      
      {/* 1. Occurrence Detail Modal */}
      {detailOccurrence && (
        <OccurrenceDetailModal
          occurrence={detailOccurrence}
          currentUser={currentUser}
          squads={squads}
          platoons={platoons}
          onClose={() => setDetailOccurrence(null)}
          onOpenAttendanceForm={(occ) => {
            setDetailOccurrence(null);
            setAttendanceOccurrence(occ);
          }}
          onOpenEditForm={(occ) => {
            setDetailOccurrence(null);
            setEditOccurrence(occ);
          }}
          onDeleteOccurrence={handleDeleteOccurrence}
          onUpdateOccurrence={(updated) => {
            setDetailOccurrence(updated);
            setOccurrences(prev => prev.map(o => o.id === updated.id ? updated : o));
          }}
        />
      )}

      {/* 2. Attendance Registration Form Modal (Squad Commander Field UI) */}
      {attendanceOccurrence && (
        <AttendanceFormModal
          occurrence={attendanceOccurrence}
          currentSquad={currentSquad || {
            id: currentUser.squadId || '',
            name: 'Guarnição de Serviço',
            callSign: 'VTR',
            unitText: '4º BBM',
            commanderName: `${currentUser.rank} ${currentUser.name}`,
            currentShift: 'Turno 24h',
            status: 'DISPONIVEL',
            activeMembersCount: 1,
            platoonId: currentUser.platoonId
          }}
          currentUser={currentUser}
          onClose={() => setAttendanceOccurrence(null)}
          onSuccess={(updatedOcc) => {
            setAttendanceOccurrence(null);
            setOccurrences(prev => prev.map(o => o.id === updatedOcc.id ? updatedOcc : o));
            setDetailOccurrence(updatedOcc);
          }}
        />
      )}

      {/* 3. COBOM New / Edit Occurrence Modal */}
      {(isNewOccurrenceOpen || editOccurrence) && (
        <CobomNewOccurrenceModal
          initialOccurrence={editOccurrence}
          platoons={platoons}
          squads={squads}
          currentUser={currentUser}
          onClose={() => {
            setIsNewOccurrenceOpen(false);
            setEditOccurrence(null);
          }}
          onDelete={handleDeleteOccurrence}
          onSaved={(savedOcc) => {
            setIsNewOccurrenceOpen(false);
            setEditOccurrence(null);
            setOccurrences(prev => {
              const exists = prev.some(o => o.id === savedOcc.id);
              return exists ? prev.map(o => o.id === savedOcc.id ? savedOcc : o) : [savedOcc, ...prev];
            });
            setDetailOccurrence(savedOcc);
          }}
        />
      )}

      {/* 4. Shift Handover Report Modal (24h) */}
      {isShiftHandoverOpen && (
        <ShiftHandoverModal
          occurrences={occurrences}
          currentUser={currentUser}
          squads={squads}
          platoons={platoons}
          onClose={() => setIsShiftHandoverOpen(false)}
          onSelectOccurrence={(occ) => {
            setIsShiftHandoverOpen(false);
            setDetailOccurrence(occ);
          }}
        />
      )}

      {/* 5. Squad Import Modal (e-193 Roster Parser) */}
      {isSquadImportOpen && (
        <SquadImportModal
          squads={squads}
          users={users}
          platoons={platoons}
          onClose={() => setIsSquadImportOpen(false)}
          onImportSuccess={() => {
            loadAllData();
          }}
          onSquadsUpdated={(updatedSquads, updatedUsers, updatedPlats) => {
            setSquads(updatedSquads);
            setUsers(updatedUsers);
            if (updatedPlats) setPlatoons(updatedPlats);
          }}
        />
      )}

      {/* 6. Notifications Drawer */}
      {isNotificationsOpen && (
        <NotificationsDrawer
          notifications={notifications}
          currentUser={currentUser}
          onClose={() => setIsNotificationsOpen(false)}
          onMarkAsRead={handleMarkNotificationAsRead}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onSelectOccurrenceByProtocol={handleSelectOccurrenceByProtocol}
        />
      )}

      {/* 7. POP Consulta e Visualizador PDF Oficial */}
      {isPopViewerOpen && (
        <PopViewerModal onClose={() => setIsPopViewerOpen(false)} />
      )}

      {/* 8. Relatório Detalhado de Impressão (Feito vs Pendente no Período) */}
      {isDetailedReportOpen && (
        <DetailedReportPrintModal
          occurrences={occurrences}
          squads={squads}
          platoons={platoons}
          onClose={() => setIsDetailedReportOpen(false)}
        />
      )}

      {/* 9. Gestão de Militares & Efetivo (Exclusivo COBOM) */}
      {isMilitaryManagementOpen && currentUser.role === 'COBOM' && (
        <MilitaryManagementModal
          platoons={platoons}
          squads={squads}
          currentUser={currentUser}
          onClose={() => setIsMilitaryManagementOpen(false)}
          onMilitaryUpdated={() => {
            loadAllData();
          }}
        />
      )}

    </div>
  );
}
