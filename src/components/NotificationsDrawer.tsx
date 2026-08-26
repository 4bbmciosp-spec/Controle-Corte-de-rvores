import React from 'react';
import { AppNotification, User } from '../types';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  ShieldAlert, 
  Clock, 
  Trash2, 
  CheckCheck,
  ChevronRight
} from 'lucide-react';

interface NotificationsDrawerProps {
  notifications: AppNotification[];
  currentUser: User;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectOccurrenceByProtocol: (protocol: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  notifications,
  currentUser,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectOccurrenceByProtocol,
}) => {
  // Filter notifications targeted to current user's role or squad
  const userNotifications = notifications.filter(n => {
    if (n.targetRoles && !n.targetRoles.includes(currentUser.role)) {
      return false;
    }
    if (currentUser.squadId && n.targetSquadId && n.targetSquadId !== currentUser.squadId) {
      // If it's specific to another squad and user is a squad commander, filter it
      if (currentUser.role === 'GUARNICAO') return false;
    }
    return true;
  });

  const unreadCount = userNotifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'PENDING_ALERT_24H':
      case 'CRITICAL_UNRESOLVED':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'PENDING_ALERT_12H':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'STATUS_CHANGE':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'NEW_OCCURRENCE':
        return <Truck className="w-4 h-4 text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[1600] bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white border-l border-slate-300 h-full flex flex-col shadow-2xl animate-slideLeft text-slate-800">
        
        {/* Header */}
        <div className="p-4 bg-red-800 text-white border-b border-red-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-white text-red-800 flex items-center justify-center font-bold shadow-sm">
                <Bell className="w-4 h-4" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm">Painel de Alertas & Notificações</h3>
              <p className="text-[11px] text-red-100 font-medium">
                Perfil: <strong className="text-white">{currentUser.role}</strong> ({currentUser.rank} {currentUser.name})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="p-1.5 text-red-100 hover:text-white hover:bg-red-700 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-red-100 hover:text-white hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50">
          {userNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-70" />
              <span className="font-medium">Nenhum alerta recente para este perfil.</span>
            </div>
          ) : (
            userNotifications.map((notif) => {
              const isAlert = notif.type === 'PENDING_ALERT_12H' || notif.type === 'PENDING_ALERT_24H' || notif.type === 'CRITICAL_UNRESOLVED';
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    onMarkAsRead(notif.id);
                    if (notif.occurrenceProtocol) {
                      onSelectOccurrenceByProtocol(notif.occurrenceProtocol);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all shadow-sm ${
                    !notif.isRead 
                      ? isAlert
                        ? 'bg-amber-50 border-amber-400 text-amber-950 ring-1 ring-amber-400'
                        : 'bg-white border-slate-300 text-slate-900' 
                      : 'bg-white/70 border-slate-200 text-slate-600 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      {getNotificationIcon(notif.type)}
                      <span>{notif.title}</span>
                    </div>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                    )}
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed pl-6">
                    {notif.message}
                  </p>

                  <div className="pt-2 mt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 pl-6">
                    <span className="font-mono text-red-800 font-bold">{notif.occurrenceProtocol}</span>
                    <span className="font-medium">{new Date(notif.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-[11px] text-slate-600 font-medium">
          Alertas automáticos sincronizados com COBOM 193
        </div>

      </div>
    </div>
  );
};
