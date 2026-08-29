import {
  Occurrence,
  Platoon,
  Squad,
  SquadMember,
  User,
  AppNotification,
  AttendanceRecord,
  OccurrencePhoto,
  UserRole
} from '../types';
import {
  insertOccurrenceToSupabase,
  updateOccurrenceInSupabase,
  deleteOccurrenceFromSupabase,
  recordAttendanceInSupabase,
  fetchOccurrencesFromSupabase,
  fetchPlatoonsFromSupabase,
  fetchSquadsFromSupabase,
  fetchNotificationsFromSupabase,
  insertNotificationToSupabase,
  markNotificationAsReadInSupabase,
  ensureUUID
} from './supabaseDataService';

const STORAGE_KEYS = {
  OCCURRENCES: 'cbmrs_arvores_occurrences_v4_sm',
  PLATOONS: 'cbmrs_arvores_platoons_v4_sm',
  SQUADS: 'cbmrs_arvores_squads_v4_sm',
  USERS: 'cbmrs_arvores_users_v4_sm',
  NOTIFICATIONS: 'cbmrs_arvores_notifications_v4_sm',
  CURRENT_USER_ID: 'cbmrs_arvores_current_user_v4_sm',
  RAW_E193: 'cbmrs_arvores_raw_e193_v4_sm'
};

// Fallback visual temporário para renderização instantânea enquanto a rede conecta
export const SEED_PLATOONS: Platoon[] = [
  {
    id: 'plat-1',
    name: '1º Pelotão de Bombeiros Militar (Santa Maria)',
    bbm: '4º BBM / 1ª CIA / 1º PEL / SANTA MARIA',
    headquarters: 'Quartel Central - Rua Coronel Niederauer, 890 - Centro',
    commanderName: 'Oficial de Dia (1º Pelotão)',
  },
  {
    id: 'plat-2',
    name: '2º Pelotão de Busca e Salvamento (P. Pinheiro Machado)',
    bbm: '4º BBM / 1ª CIA / 2º PEL BS/ P. PINHEIRO MACHADO',
    headquarters: 'Posto Pinheiro Machado - BR-287, Santa Maria',
    commanderName: 'Oficial de Dia (2º Pelotão)',
  },
  {
    id: 'plat-3',
    name: '3º Pelotão de Bombeiros Militar (Camobi)',
    bbm: '4º BBM / 1ª CIA / 3º PEL / CAMOBI',
    headquarters: 'Posto Camobi - Av. Roraima, Santa Maria',
    commanderName: 'Oficial de Dia (3º Pelotão)',
  },
  {
    id: 'plat-cobom',
    name: 'Central de Operações de Bombeiros (COBOM-SM)',
    bbm: '4º BBM / COBOM-SM',
    headquarters: 'CIOSP Santa Maria - Central 193',
    commanderName: 'Chefe de Operações 193',
  }
];

export const SEED_SQUADS: Squad[] = [
  {
    id: 'squad-abt-1496',
    name: 'ABT-1496 (1º Pelotão Centro)',
    callSign: 'ABT-1496',
    unitText: '4º BBM / 1ª CIA / 1º PEL / SANTA MARIA',
    platoonId: 'plat-1',
    commanderName: 'Comandante da VTR',
    currentShift: 'Turno 24h (08:00 às 08:00)',
    status: 'DISPONIVEL',
    activeMembersCount: 4,
  },
  {
    id: 'squad-abt-534',
    name: 'ABT-534 (3º Pelotão Camobi)',
    callSign: 'ABT-534',
    unitText: '4º BBM / 1ª CIA / 3º PEL / CAMOBI',
    platoonId: 'plat-3',
    commanderName: 'Comandante da VTR',
    currentShift: 'Turno 24h (08:00 às 08:00)',
    status: 'DISPONIVEL',
    activeMembersCount: 3,
  },
  {
    id: 'squad-abc-794',
    name: 'ABC-794 (2º Pel BS Pinheiro Machado)',
    callSign: 'ABC-794',
    unitText: '4º BBM / 1ª CIA / 2º PEL BS/ P. PINHEIRO MACHADO',
    platoonId: 'plat-2',
    commanderName: 'Comandante da VTR',
    currentShift: 'Turno 12h Especializada (07:00 às 19:00)',
    status: 'DISPONIVEL',
    activeMembersCount: 3,
  },
  {
    id: 'squad-abt-1238',
    name: 'ABT-1238 (1º Pelotão Centro)',
    callSign: 'ABT-1238',
    unitText: '4º BBM / 1ª CIA / 1º PEL / SANTA MARIA',
    platoonId: 'plat-1',
    commanderName: 'Comandante da VTR',
    currentShift: 'Turno 12h/12h (08:00 às 20:00)',
    status: 'DISPONIVEL',
    activeMembersCount: 2,
  },
  {
    id: 'squad-atp-0561',
    name: 'ATP-0561 (2º Pel BS Pinheiro Machado)',
    callSign: 'ATP-0561',
    unitText: '4º BBM / 1ª CIA / 2º PEL BS/ P. PINHEIRO MACHADO',
    platoonId: 'plat-2',
    commanderName: 'Comandante da VTR',
    currentShift: 'Turno 12h Especializada (19:00 às 07:00)',
    status: 'DISPONIVEL',
    activeMembersCount: 2,
  },
  {
    id: 'squad-cobom-sm',
    name: 'COBOM-SM (Central 193)',
    callSign: 'COBOM-SM',
    unitText: '4º BBM / COBOM-SM',
    platoonId: 'plat-cobom',
    commanderName: 'Chefe de Sala 193',
    currentShift: 'Turno 24h Central 193',
    status: 'DISPONIVEL',
    activeMembersCount: 2,
  }
];

export const SEED_USERS: User[] = [
  {
    id: 'user-cobom-sm',
    name: 'COBOM 193',
    rank: 'Central de Operações',
    role: 'COBOM',
    platoonId: 'plat-cobom',
    squadId: 'squad-cobom-sm',
    registrationNumber: 'CIOSP-193',
  },
  {
    id: 'user-guarnicao-abt-534',
    name: 'Guarnição ABT-534',
    rank: '3º Pelotão (Camobi)',
    role: 'GUARNICAO',
    platoonId: 'plat-3',
    squadId: 'squad-abt-534',
    registrationNumber: 'ABT-534',
  },
  {
    id: 'user-guarnicao-abt-1496',
    name: 'Guarnição ABT-1496',
    rank: '1º Pelotão (Centro)',
    role: 'GUARNICAO',
    platoonId: 'plat-1',
    squadId: 'squad-abt-1496',
    registrationNumber: 'ABT-1496',
  },
  {
    id: 'user-guarnicao-abc-794',
    name: 'Guarnição ABC-794',
    rank: '2º Pelotão (P. Machado)',
    role: 'GUARNICAO',
    platoonId: 'plat-2',
    squadId: 'squad-abc-794',
    registrationNumber: 'ABC-794',
  },
  {
    id: 'user-pelotao-medeiros',
    name: 'Comando de Pelotão',
    rank: 'Oficial de Dia (1ª Cia / 4º BBM)',
    role: 'PELOTAO',
    platoonId: 'plat-1',
    registrationNumber: 'CMT-PEL',
  }
];

export const SEED_OCCURRENCES: Occurrence[] = [];
export const SEED_NOTIFICATIONS: AppNotification[] = [];

/**
 * Cache local apenas para renderização instantânea (Leitura)
 */
export function getStoredOccurrences(): Occurrence[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OCCURRENCES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOccurrences(occurrences: Occurrence[]): void {
  localStorage.setItem(STORAGE_KEYS.OCCURRENCES, JSON.stringify(occurrences));
}

export function getStoredPlatoons(): Platoon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLATOONS);
    return raw ? JSON.parse(raw) : SEED_PLATOONS;
  } catch {
    return SEED_PLATOONS;
  }
}

export function savePlatoons(platoons: Platoon[]): void {
  localStorage.setItem(STORAGE_KEYS.PLATOONS, JSON.stringify(platoons));
}

export function getStoredSquads(): Squad[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SQUADS);
    return raw ? JSON.parse(raw) : SEED_SQUADS;
  } catch {
    return SEED_SQUADS;
  }
}

export function saveSquads(squads: Squad[]): void {
  localStorage.setItem(STORAGE_KEYS.SQUADS, JSON.stringify(squads));
}

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : SEED_USERS;
  } catch {
    return SEED_USERS;
  }
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export function getCurrentUser(): User {
  const users = getStoredUsers();
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  const found = users.find(u => u.id === currentId);
  return found || users[0] || SEED_USERS[0];
}

export function setCurrentUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
}

export function getStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotifications(notifs: AppNotification[]): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
}

/**
 * ============================================================================
 * OPERAÇÕES DE ESCRITA DEFINITIVAS CONTRA O SUPABASE COM PROPAGAÇÃO DE ERROS
 * ============================================================================
 */

/**
 * Criação de nova ocorrência pelo COBOM
 */
export async function createOccurrence(
  newOcc: Omit<Occurrence, 'id' | 'protocol' | 'createdAt' | 'updatedAt' | 'attendances' | 'totalAttendancesCount' | 'isCarriedOver'>,
  militarUuid?: string
): Promise<Occurrence> {
  const nextNum = String(Date.now()).slice(-5);
  const year = new Date().getFullYear();
  const protocol = `CBMRS-${year}-${nextNum}`;
  const id = ensureUUID();
  const nowIso = new Date().toISOString();

  const fullOccurrence: Occurrence = {
    ...newOcc,
    id,
    protocol,
    createdAt: nowIso,
    updatedAt: nowIso,
    attendances: [],
    totalAttendancesCount: 0,
    isCarriedOver: false,
  };

  // 1. Grava obrigatoriamente no Supabase e aguarda confirmação
  const savedOcc = await insertOccurrenceToSupabase(fullOccurrence, militarUuid);

  // 2. Atualiza o cache local
  const currentList = getStoredOccurrences();
  const updatedList = [savedOcc, ...currentList.filter(o => o.id !== savedOcc.id)];
  saveOccurrences(updatedList);

  // 3. Notificação no Supabase
  const squad = getStoredSquads().find(s => s.id === newOcc.assignedSquadId);
  const notif: AppNotification = {
    id: ensureUUID(),
    title: `🚨 Nova Ocorrência Registrada: ${protocol}`,
    message: `COBOM-SM despachou atendimento para ${newOcc.address} (${newOcc.neighborhood || ''}, ${newOcc.city || 'Santa Maria'}). Natureza: ${newOcc.dispatchNature}. Guarnição empenhada: ${squad?.name || 'A definir'}.`,
    type: 'NEW_OCCURRENCE',
    occurrenceId: savedOcc.id,
    occurrenceProtocol: protocol,
    targetRoles: ['COBOM', 'GUARNICAO', 'PELOTAO'],
    targetSquadId: newOcc.assignedSquadId,
    createdAt: nowIso,
    isRead: false
  };

  await insertNotificationToSupabase(notif);
  const notifs = [notif, ...getStoredNotifications()];
  saveNotifications(notifs);

  return savedOcc;
}

/**
 * Atualização dos dados da ocorrência pelo COBOM
 */
export async function updateOccurrence(updated: Occurrence): Promise<void> {
  // 1. Grava no Supabase e aguarda confirmação
  await updateOccurrenceInSupabase(updated);

  // 2. Atualiza cache local
  const list = getStoredOccurrences();
  const index = list.findIndex(o => o.id === updated.id);
  if (index !== -1) {
    list[index] = {
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    saveOccurrences(list);
  }
}

/**
 * Exclusão definitiva de ocorrência (Exclusivo COBOM)
 */
export async function deleteOccurrence(occurrenceId: string): Promise<void> {
  // 1. Deleta no Supabase
  await deleteOccurrenceFromSupabase(occurrenceId);

  // 2. Atualiza cache local
  const list = getStoredOccurrences().filter(o => o.id !== occurrenceId);
  saveOccurrences(list);

  const notifs = getStoredNotifications().filter(n => n.occurrenceId !== occurrenceId);
  saveNotifications(notifs);
}

/**
 * Registro de Atendimento pela Guarnição
 */
export async function recordAttendance(
  occurrenceId: string, 
  record: Omit<AttendanceRecord, 'id' | 'occurrenceId'>,
  user: User,
  militarUuid?: string
): Promise<Occurrence> {
  const recordId = ensureUUID();
  const fullRecord: AttendanceRecord = {
    ...record,
    id: recordId,
    occurrenceId,
  };

  // 1. Grava no Supabase
  const savedRecord = await recordAttendanceInSupabase(occurrenceId, fullRecord, militarUuid);

  // 2. Atualiza cache local
  const list = getStoredOccurrences();
  const index = list.findIndex(o => o.id === occurrenceId);
  if (index === -1) {
    throw new Error('Ocorrência não encontrada no cache local.');
  }

  const occ = list[index];
  const newAttendances = [...occ.attendances.filter(a => a.id !== savedRecord.id), savedRecord];
  const newStatus = record.statusResult === 'CONCLUIDA' ? 'CONCLUIDA' : 'PENDENTE';
  const isPending = newStatus === 'PENDENTE';

  const updatedOcc: Occurrence = {
    ...occ,
    status: newStatus,
    updatedAt: new Date().toISOString(),
    lastAttendanceAt: record.finishedAt,
    totalAttendancesCount: newAttendances.length,
    isCarriedOver: isPending ? true : occ.isCarriedOver,
    attendances: newAttendances,
  };

  list[index] = updatedOcc;
  saveOccurrences(list);

  // 3. Notificação
  const notif: AppNotification = {
    id: ensureUUID(),
    title: record.statusResult === 'CONCLUIDA'
      ? `✅ Ocorrência Concluída: ${occ.protocol}`
      : `⚠️ Ocorrência NÃO Concluída: ${occ.protocol}`,
    message: record.statusResult === 'CONCLUIDA'
      ? `A ${record.squadName} finalizou com sucesso o corte/vistoria na ${occ.address} (${occ.city}).`
      : `A ${record.squadName} registrou atendimento pendente. Motivo: ${record.unresolvedReason || 'Operacional'}.`,
    type: record.statusResult === 'CONCLUIDA' ? 'STATUS_CHANGE' : 'CRITICAL_UNRESOLVED',
    occurrenceId: occ.id,
    occurrenceProtocol: occ.protocol,
    targetRoles: ['COBOM', 'PELOTAO', 'GUARNICAO'],
    targetSquadId: occ.assignedSquadId,
    createdAt: new Date().toISOString(),
    isRead: false
  };

  await insertNotificationToSupabase(notif);
  const notifs = [notif, ...getStoredNotifications()];
  saveNotifications(notifs);

  return updatedOcc;
}

/**
 * Atualiza status para 'EM_ATENDIMENTO' quando a guarnição desloca/chega no local
 */
export async function setSquadInAttendance(occurrenceId: string, squadId: string): Promise<Occurrence> {
  const list = getStoredOccurrences();
  const index = list.findIndex(o => o.id === occurrenceId);
  if (index === -1) throw new Error('Ocorrência não encontrada');

  const occ = list[index];
  const updatedOcc: Occurrence = {
    ...occ,
    status: 'EM_ATENDIMENTO',
    assignedSquadId: squadId,
    updatedAt: new Date().toISOString(),
  };

  // 1. Grava no Supabase
  await updateOccurrenceInSupabase(updatedOcc);

  // 2. Atualiza cache local
  list[index] = updatedOcc;
  saveOccurrences(list);

  return updatedOcc;
}

/**
 * Sincroniza todas as ocorrências do Supabase para o cache local
 */
export async function syncOccurrencesFromSupabase(): Promise<Occurrence[]> {
  const remoteList = await fetchOccurrencesFromSupabase();
  saveOccurrences(remoteList);
  return remoteList;
}

/**
 * Sincroniza squads e platoons do Supabase
 */
export async function syncSquadsAndPlatoonsFromSupabase(): Promise<{ squads: Squad[]; platoons: Platoon[] }> {
  const [platoons, squads] = await Promise.all([
    fetchPlatoonsFromSupabase().catch(() => getStoredPlatoons()),
    fetchSquadsFromSupabase().catch(() => getStoredSquads()),
  ]);

  if (platoons.length > 0) savePlatoons(platoons);
  if (squads.length > 0) saveSquads(squads);

  return { squads, platoons };
}

/**
 * Sincroniza notificações do Supabase
 */
export async function syncNotificationsFromSupabase(): Promise<AppNotification[]> {
  const notifs = await fetchNotificationsFromSupabase();
  if (notifs.length > 0) {
    saveNotifications(notifs);
  }
  return notifs.length > 0 ? notifs : getStoredNotifications();
}

/**
 * Calcula horas pendentes de uma ocorrência
 */
export function getHoursPending(occ: Occurrence): number {
  const start = new Date(occ.createdAt).getTime();
  const current = Date.now();
  return Math.max(0, Math.floor((current - start) / (1000 * 60 * 60)));
}

/**
 * Reseta dados locais
 */
export function resetToSeedData(): void {
  localStorage.setItem(STORAGE_KEYS.OCCURRENCES, JSON.stringify(SEED_OCCURRENCES));
  localStorage.setItem(STORAGE_KEYS.PLATOONS, JSON.stringify(SEED_PLATOONS));
  localStorage.setItem(STORAGE_KEYS.SQUADS, JSON.stringify(SEED_SQUADS));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
}

export const INITIAL_E193_RAW_TEXT = `4º BATALHÃO DE BOMBEIRO MILITAR - SANTA MARIA
ESCALA DE SERVIÇO DIÁRIO - SISTEMA E-193

1º PELOTÃO - SEDE
ABT-1496 (Auto Bomba Tanque)
- 1º SGT 3012948 SILVA - COMANDANTE DE GUARNIÇÃO
- CB 3048591 MOREIRA - COV / CONDUTOR
- SD 3177360 BECKER - CHEFE DE LINHA DIREITA
- SD 3192004 SANTOS - AUXILIAR DE LINHA

ABTR-1102 (Auto Bomba Tanque Resgate)
- 2º SGT 2984110 CARVALHO - COMANDANTE DE GUARNIÇÃO
- SD 3185490 OLIVEIRA - COV / CONDUTOR
- SD 3201193 MACHADO - RESGATISTA

2º PELOTÃO - CAMOBI
ABT-1320 (Auto Bomba Tanque)
- 1º SGT 2894102 RODRIGUES - COMANDANTE DE GUARNIÇÃO
- CB 3051284 ALVES - COV / CONDUTOR
- SD 3169482 FARIAS - CHEFE DE LINHA

COBOM - CENTRAL DE OPERAÇÕES
- CAP 2741908 DORNELLES - OFICIAL DE DIA / SUPERVISOR
- 1º SGT 2910394 MARTINS - CHEFE DO DESPACHO
- CB 3098172 PEREIRA - OPERADOR COBOM
- SD 3188201 NOGUEIRA - ATENDENTE 193
`;

export function getStoredRawE193(): string {
  return localStorage.getItem('cbmrs_raw_e193') || INITIAL_E193_RAW_TEXT;
}

export function saveStoredRawE193(text: string): void {
  localStorage.setItem('cbmrs_raw_e193', text);
}

export function parseAndRegisterE193Roster(rawText: string): { squads: Squad[]; users: User[]; platoons: Platoon[] } {
  saveStoredRawE193(rawText);
  // Mantém os squads existentes ou sincronizados
  const squads = getStoredSquads();
  const users = getStoredUsers();
  const platoons = getStoredPlatoons();
  return { squads, users, platoons };
}

export function addSquadMember(squadId: string, member: SquadMember, isCommander?: boolean): { squads: Squad[]; users: User[] } {
  const squads = getStoredSquads();
  const users = getStoredUsers();
  const sq = squads.find(s => s.id === squadId);
  if (sq) {
    sq.members = sq.members || [];
    sq.members = sq.members.filter(m => m.registrationNumber !== member.registrationNumber);
    const newM: SquadMember = {
      ...member,
      isCommander: Boolean(isCommander)
    };
    sq.members.push(newM);
    if (isCommander) {
      sq.commanderName = member.name;
    }
    sq.activeMembersCount = sq.members.length;
    saveSquads(squads);
  }
  return { squads, users };
}

export function updateSquadMember(squadId: string, originalReg: string, member: SquadMember, isCommander?: boolean): { squads: Squad[]; users: User[] } {
  const squads = getStoredSquads();
  const users = getStoredUsers();
  const sq = squads.find(s => s.id === squadId);
  if (sq) {
    sq.members = sq.members || [];
    const idx = sq.members.findIndex(m => m.registrationNumber === originalReg);
    const newM: SquadMember = {
      ...member,
      isCommander: Boolean(isCommander)
    };
    if (idx !== -1) {
      sq.members[idx] = newM;
    } else {
      sq.members.push(newM);
    }
    if (isCommander) {
      sq.commanderName = member.name;
    }
    sq.activeMembersCount = sq.members.length;
    saveSquads(squads);
  }
  return { squads, users };
}

export function removeSquadMember(squadId: string, memberRegOrId: string): { squads: Squad[]; users: User[] } {
  const squads = getStoredSquads();
  const users = getStoredUsers();
  const sq = squads.find(s => s.id === squadId);
  if (sq && sq.members) {
    sq.members = sq.members.filter(m => m.registrationNumber !== memberRegOrId && m.id !== memberRegOrId);
    sq.activeMembersCount = sq.members.length;
    saveSquads(squads);
  }
  return { squads, users };
}

export function addNewSquad(squad: Squad): { squads: Squad[]; users: User[] } {
  const squads = getStoredSquads();
  const users = getStoredUsers();
  const exists = squads.some(s => s.id === squad.id);
  const updated = exists ? squads.map(s => s.id === squad.id ? squad : s) : [...squads, squad];
  saveSquads(updated);
  return { squads: updated, users };
}

export function removeSquad(squadId: string): { squads: Squad[]; users: User[] } {
  const squads = getStoredSquads();
  const users = getStoredUsers();
  const updated = squads.filter(s => s.id !== squadId);
  saveSquads(updated);
  return { squads: updated, users };
}

export function setSquadCommander(squadId: string, commanderName: string): { squads: Squad[]; users: User[] } {
  const squads = getStoredSquads();
  const users = getStoredUsers();
  const sq = squads.find(s => s.id === squadId);
  if (sq) {
    sq.commanderName = commanderName;
    if (sq.members) {
      sq.members.forEach(m => {
        m.isCommander = (m.name === commanderName);
      });
    }
    saveSquads(squads);
  }
  return { squads, users };
}

export function exportDatabaseBackup(): string {
  const backup = {
    exportedAt: new Date().toISOString(),
    system: 'CBMRS - Gestão de Ocorrências de Árvores (4º BBM - Santa Maria)',
    occurrences: getStoredOccurrences(),
    platoons: getStoredPlatoons(),
    squads: getStoredSquads(),
    users: getStoredUsers(),
    notifications: getStoredNotifications()
  };
  return JSON.stringify(backup, null, 2);
}
