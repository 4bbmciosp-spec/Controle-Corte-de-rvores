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
  getStoredOccurrences, 
  getStoredPlatoons, 
  getStoredSquads, 
  getStoredUsers, 
  getCurrentUser, 
  setCurrentUser as persistCurrentUser,
  getStoredNotifications, 
  saveNotifications,
  resetToSeedData,
  setSquadInAttendance,
  getHoursPending,
  syncOccurrencesFromSupabase,
  syncSquadsAndPlatoonsFromSupabase,
  syncNotificationsFromSupabase,
  deleteOccurrence
} from './services/storageService';
import { 
  getCurrentMilitar, 
  logoutMilitar, 
  MilitarUser 
} from './services/authService';
import { subscribeToOccurrencesRealtime } from './services/supabaseDataService';

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
  PlusCircle, 
  Flame, 
  Info, 
  Clock, 
  CheckCircle2, 
  Truck, 
  ShieldCheck, 
  PhoneCall,
  BarChart3,
  Layers
} from 'lucide-react';

export default function App() {
  // Authentication State with Supabase
  const [authenticatedMilitar, setAuthenticatedMilitar] = useState<MilitarUser | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Database Entities
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

  // Initial Auth Check
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

  // Initial Load & Supabase Remote Sync
  const loadAllData = useCallback(async () => {
    // 1. Carrega dados do cache local inicialmente para resposta imediata
    const loadedOccs = getStoredOccurrences();
    const loadedPlats = getStoredPlatoons();
    const loadedSquads = getStoredSquads();
    const loadedUsers = getStoredUsers();
    const loadedUser = getCurrentUser();
    const loadedNotifs = getStoredNotifications();

    setOccurrences(loadedOccs);
    setPlatoons(loadedPlats);
    setSquads(loadedSquads);
    setUsers(loadedUsers);
    setCurrentUser(loadedUser);
    setNotifications(loadedNotifs);

    // 2. Consulta e sincroniza estritamente com o banco Supabase em segundo plano
    try {
      const [remoteOccs, remoteHierarchy, remoteNotifs] = await Promise.all([
        syncOccurrencesFromSupabase().catch(err => {
          console.warn('Aviso ao sincronizar ocorrências:', err);
          return null;
        }),
        syncSquadsAndPlatoonsFromSupabase().catch(err => {
          console.warn('Aviso ao sincronizar pelotões/guarnições:', err);
          return null;
        }),
        syncNotificationsFromSupabase().catch(err => {
          console.warn('Aviso ao sincronizar notificações:', err);
          return null;
        })
      ]);

      if (remoteOccs) {
        setOccurrences(remoteOccs);
      }
      if (remoteHierarchy) {
        if (remoteHierarchy.platoons.length > 0) setPlatoons(remoteHierarchy.platoons);
        if (remoteHierarchy.squads.length > 0) setSquads(remoteHierarchy.squads);
      }
      if (remoteNotifs) {
        setNotifications(remoteNotifs);
      }
    } catch (e) {
      console.error('Erro durante sincronização com Supabase:', e);
    }
  }, []);

  useEffect(() => {
    loadAllData();

    // Inscrição Realtime no Supabase para sincronização instantânea
    const unsubscribe = subscribeToOccurrencesRealtime(() => {
      syncOccurrencesFromSupabase().then(syncedOccs => {
        if (syncedOccs) {
          setOccurrences(syncedOccs);
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [loadAllData]);

  // Periodic Check for 12h/24h recurring alerts for pending unresolved tree incidents
  useEffect(() => {
    const interval = setInterval(() => {
      const currentOccs = getStoredOccurrences();
      const currentNotifs = getStoredNotifications();
      let hasNewAlert = false;

      currentOccs.forEach(occ => {
        if (occ.status === 'PENDENTE') {
          const hours = getHoursPending(occ);
          if (hours >= 12) {
            const alertTag = hours >= 24 ? '24h' : '12h';
            const notifKey = `recur-alert-${occ.id}-${alertTag}`;
            
            const alreadyNotified = currentNotifs.some(n => n.id.includes(notifKey));
            if (!alreadyNotified) {
              currentNotifs.unshift({
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
              });
              hasNewAlert = true;
            }
          }
        }
      });

      if (hasNewAlert) {
        saveNotifications(currentNotifs);
        setNotifications([...currentNotifs]);
      }
    }, 45000); // Check every 45s

    return () => clearInterval(interval);
  }, []);

  // Handle Login from Supabase Modal
  const handleLoginSuccess = (militar: MilitarUser) => {
    setAuthenticatedMilitar(militar);
    if (militar.senha_temporaria) {
      setRequiresPasswordChange(true);
    } else {
      setRequiresPasswordChange(false);
    }

    // Configura o usuário atual no perfil oficial do militar
    const activeSquad = squads.find(s => s.id === militar.squad_atual_id || s.id === militar.guarnicao_id) || squads[0];
    const activePlatoon = platoons.find(p => p.id === militar.platoon_atual_id || p.id === militar.pelotao_id) || platoons[0];

    const matchedUser: User = {
      id: `user-${militar.matricula}`,
      name: militar.nome_guerra,
      rank: militar.posto_graduacao,
      role: militar.perfil,
      platoonId: activePlatoon?.id || 'plat-1',
      squadId: militar.perfil === 'GUARNICAO' ? (activeSquad?.id || squads[0]?.id) : undefined,
      registrationNumber: militar.matricula,
    };

    setCurrentUser(matchedUser);
    persistCurrentUser(matchedUser);
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
    setRequiresPasswordChange(false);
  };

  // Switch User Profile
  const handleSelectUser = (user: User) => {
    persistCurrentUser(user);
    setCurrentUser(user);
  };

  // Reset demo data
  const handleResetData = () => {
    resetToSeedData();
    loadAllData();
    setDetailOccurrence(null);
    setAttendanceOccurrence(null);
    setEditOccurrence(null);
    setIsNewOccurrenceOpen(false);
  };

  // Delete Occurrence (Exclusive for COBOM)
  const handleDeleteOccurrence = async (occId: string) => {
    try {
      await deleteOccurrence(occId);
      await loadAllData();
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
      const updated = await setSquadInAttendance(occ.id, currentUser.squadId);
      await loadAllData();
      if (detailOccurrence?.id === occ.id) {
        setDetailOccurrence(updated);
      }
    } catch (err: any) {
      alert(`Erro ao iniciar atendimento no Supabase: ${err?.message || err}`);
    }
  };

  // Mark notification read
  const handleMarkNotificationAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    saveNotifications(updated);
    setNotifications(updated);
  };

  const handleMarkAllNotificationsAsRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    saveNotifications(updated);
    setNotifications(updated);
  };

  // Select occurrence by protocol from notifications
  const handleSelectOccurrenceByProtocol = (protocol: string) => {
    const occ = occurrences.find(o => o.protocol === protocol);
    if (occ) {
      setDetailOccurrence(occ);
    }
  };

  if (authChecking || !currentUser) {
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

  const unreadNotifsCount = notifications.filter(n => {
    if (n.targetRoles && !n.targetRoles.includes(currentUser.role)) return false;
    return !n.isRead;
  }).length;

  const currentSquad = squads.find(s => s.id === currentUser.squadId) || squads[0];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-red-700 selection:text-white">
      
      {/* 1. Official Header */}
      <Header
        currentUser={currentUser}
        authenticatedMilitar={authenticatedMilitar}
        allUsers={users}
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
        onResetData={handleResetData}
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
                  ? `Viatura: ${currentSquad.name} (Atendimentos em campo, registro de desfecho e fotos)`
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
            loadAllData();
          }}
        />
      )}

      {/* 2. Attendance Registration Form Modal (Squad Commander Field UI) */}
      {attendanceOccurrence && (
        <AttendanceFormModal
          occurrence={attendanceOccurrence}
          currentSquad={currentSquad}
          currentUser={currentUser}
          onClose={() => setAttendanceOccurrence(null)}
          onSuccess={(updatedOcc) => {
            setAttendanceOccurrence(null);
            loadAllData();
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
            loadAllData();
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
