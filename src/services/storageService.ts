import {
  Occurrence,
  Platoon,
  Squad,
  SquadMember,
  User,
  AppNotification,
  AttendanceRecord,
} from '../types';
import {
  insertOccurrenceToSupabase,
  updateOccurrenceInSupabase,
  deleteOccurrenceFromSupabase,
  recordAttendanceInSupabase,
  insertNotificationToSupabase,
  fetchOccurrencesFromSupabase,
  upsertSquadToSupabase,
  deleteSquadFromSupabase,
  assignMilitarToSquad,
  registerEscalaServico,
  ensureUUID,
} from './supabaseDataService';

export {
  upsertSquadToSupabase,
  deleteSquadFromSupabase,
  assignMilitarToSquad,
  registerEscalaServico,
};

/**
 * ============================================================================
 * OPERAÇÕES DIRETAS CONTRA O SUPABASE — SUPABASE COMO ÚNICA FONTE DE VERDADE
 * SEM DADOS FIXOS OU CACHE LOCAL (LOCALSTORAGE)
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

  // 2. Notificação no Supabase
  const notif: AppNotification = {
    id: ensureUUID(),
    title: `🚨 Nova Ocorrência Registrada: ${protocol}`,
    message: `COBOM-SM despachou atendimento para ${newOcc.address} (${newOcc.neighborhood || ''}, ${newOcc.city || 'Santa Maria'}). Natureza: ${newOcc.dispatchNature}.`,
    type: 'NEW_OCCURRENCE',
    occurrenceId: savedOcc.id,
    occurrenceProtocol: protocol,
    targetRoles: ['COBOM', 'GUARNICAO', 'PELOTAO'],
    targetSquadId: newOcc.assignedSquadId,
    createdAt: nowIso,
    isRead: false,
  };

  await insertNotificationToSupabase(notif);

  return savedOcc;
}

/**
 * Atualização dos dados da ocorrência pelo COBOM
 */
export async function updateOccurrence(updated: Occurrence): Promise<void> {
  await updateOccurrenceInSupabase(updated);
}

/**
 * Exclusão definitiva de ocorrência (Exclusivo COBOM)
 */
export async function deleteOccurrence(occurrenceId: string): Promise<void> {
  await deleteOccurrenceFromSupabase(occurrenceId);
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
  await recordAttendanceInSupabase(occurrenceId, fullRecord, militarUuid);

  // 2. Notificação
  const notif: AppNotification = {
    id: ensureUUID(),
    title: record.statusResult === 'CONCLUIDA'
      ? `✅ Atendimento Concluído na Ocorrência`
      : `⚠️ Ocorrência Registrada como PENDENTE`,
    message: record.statusResult === 'CONCLUIDA'
      ? `A ${record.squadName} finalizou com sucesso o corte/vistoria.`
      : `A ${record.squadName} registrou atendimento pendente. Motivo: ${record.unresolvedReason || 'Operacional'}.`,
    type: record.statusResult === 'CONCLUIDA' ? 'STATUS_CHANGE' : 'CRITICAL_UNRESOLVED',
    occurrenceId: occurrenceId,
    occurrenceProtocol: '',
    targetRoles: ['COBOM', 'PELOTAO', 'GUARNICAO'],
    targetSquadId: record.squadId,
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  await insertNotificationToSupabase(notif);

  const occs = await fetchOccurrencesFromSupabase();
  const found = occs.find(o => o.id === occurrenceId);
  if (found) return found;

  throw new Error(`Ocorrência ${occurrenceId} atualizada no Supabase mas não localizada na listagem.`);
}

/**
 * Atualiza status para 'EM_ATENDIMENTO' quando a guarnição desloca/chega no local
 */
export async function setSquadInAttendance(
  occurrenceOrId: Occurrence | string,
  squadId: string
): Promise<Occurrence> {
  const occId = typeof occurrenceOrId === 'string' ? occurrenceOrId : occurrenceOrId.id;

  if (typeof occurrenceOrId === 'object') {
    const updatedOcc: Occurrence = {
      ...occurrenceOrId,
      status: 'EM_ATENDIMENTO',
      assignedSquadId: squadId,
      updatedAt: new Date().toISOString(),
    };
    await updateOccurrenceInSupabase(updatedOcc);
    return updatedOcc;
  }

  // Se passou apenas o ID, busca a lista do Supabase
  const occs = await fetchOccurrencesFromSupabase();
  const found = occs.find(o => o.id === occId);
  if (!found) {
    throw new Error('Ocorrência não encontrada no Supabase');
  }

  const updatedOcc: Occurrence = {
    ...found,
    status: 'EM_ATENDIMENTO',
    assignedSquadId: squadId,
    updatedAt: new Date().toISOString(),
  };

  await updateOccurrenceInSupabase(updatedOcc);
  return updatedOcc;
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
 * Processamento e importação de escala do e-193 em memória
 */
export function parseAndRegisterE193Roster(
  rawText: string,
  existingSquads: Squad[] = [],
  existingPlatoons: Platoon[] = []
): { squads: Squad[]; users: User[]; platoons: Platoon[] } {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const parsedSquads: Squad[] = [...existingSquads];
  const parsedUsers: User[] = [];

  let currentPlatoonId = existingPlatoons[0]?.id || '';
  let currentSquad: Squad | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();
    
    // Identifica Pelotão
    if (upper.includes('PELOTÃO') || upper.includes('PELOTAO') || upper.includes('COBOM')) {
      const matchedPlat = existingPlatoons.find(p => 
        upper.includes(p.name.toUpperCase().slice(0, 10)) ||
        (upper.includes('1º') && p.name.includes('1º')) ||
        (upper.includes('2º') && p.name.includes('2º')) ||
        (upper.includes('3º') && p.name.includes('3º')) ||
        (upper.includes('COBOM') && p.name.includes('COBOM'))
      );
      if (matchedPlat) {
        currentPlatoonId = matchedPlat.id;
      }
      continue;
    }

    // Identifica Viatura (ex: ABT-1496, ABTR-1102)
    const vtrMatch = line.match(/^([A-Z]{3,4}-\d{3,4})/i);
    if (vtrMatch) {
      const callSign = vtrMatch[1].toUpperCase();
      const squadId = `squad-${callSign.toLowerCase()}`;
      
      let sq = parsedSquads.find(s => s.id === squadId || s.callSign === callSign);
      if (!sq) {
        sq = {
          id: squadId,
          name: `${callSign} (e-193)`,
          callSign,
          unitText: '4º BBM - Santa Maria',
          platoonId: currentPlatoonId,
          commanderName: 'A Definir',
          currentShift: 'Turno 24h',
          status: 'DISPONIVEL',
          activeMembersCount: 0,
          members: []
        };
        parsedSquads.push(sq);
      }
      currentSquad = sq;
      continue;
    }

    // Identifica Militar/Membro da Guarnição (ex: - 1º SGT 3012948 SILVA - COMANDANTE)
    if (line.startsWith('-') && currentSquad) {
      const memberText = line.replace(/^-+\s*/, '').trim();
      const parts = memberText.split('-').map(p => p.trim());
      const milInfo = parts[0] || '';
      const roleInfo = parts[1] || 'COMBATENTE';

      const milTokens = milInfo.split(/\s+/);
      const rank = milTokens[0] || 'SD';
      let reg = '';
      let warName = '';

      if (milTokens.length >= 3 && /^\d+$/.test(milTokens[1])) {
        reg = milTokens[1];
        warName = milTokens.slice(2).join(' ');
      } else {
        warName = milTokens.slice(1).join(' ') || milInfo;
        reg = `E193-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const isCommander = roleInfo.toUpperCase().includes('COMANDANTE') || roleInfo.toUpperCase().includes('OFICIAL');
      const memberObj: SquadMember = {
        registrationNumber: reg,
        name: `${rank} ${warName}`,
        rank,
        roleInSquad: roleInfo,
        isCommander,
      };

      currentSquad.members = currentSquad.members || [];
      currentSquad.members = currentSquad.members.filter(m => m.registrationNumber !== reg);
      currentSquad.members.push(memberObj);
      currentSquad.activeMembersCount = currentSquad.members.length;

      if (isCommander) {
        currentSquad.commanderName = `${rank} ${warName}`;
      }

      parsedUsers.push({
        id: `user-${reg}`,
        name: warName,
        rank,
        role: roleInfo.toUpperCase().includes('COBOM') ? 'COBOM' : 'GUARNICAO',
        platoonId: currentSquad.platoonId,
        squadId: currentSquad.id,
        registrationNumber: reg,
      });
    }
  }

  return { squads: parsedSquads, users: parsedUsers, platoons: existingPlatoons };
}

/**
 * Operações puras em memória para guarnições (usadas em formulários / modais)
 */
export function addSquadMember(
  currentSquads: Squad[],
  squadId: string,
  member: SquadMember,
  isCommander?: boolean
): Squad[] {
  return currentSquads.map(sq => {
    if (sq.id !== squadId) return sq;
    const members = (sq.members || []).filter(m => m.registrationNumber !== member.registrationNumber);
    const newM: SquadMember = {
      ...member,
      isCommander: Boolean(isCommander)
    };
    members.push(newM);
    return {
      ...sq,
      members,
      commanderName: isCommander ? member.name : sq.commanderName,
      activeMembersCount: members.length,
    };
  });
}

export function updateSquadMember(
  currentSquads: Squad[],
  squadId: string,
  originalReg: string,
  member: SquadMember,
  isCommander?: boolean
): Squad[] {
  return currentSquads.map(sq => {
    if (sq.id !== squadId) return sq;
    const members = [...(sq.members || [])];
    const idx = members.findIndex(m => m.registrationNumber === originalReg);
    const newM: SquadMember = {
      ...member,
      isCommander: Boolean(isCommander)
    };
    if (idx !== -1) {
      members[idx] = newM;
    } else {
      members.push(newM);
    }
    return {
      ...sq,
      members,
      commanderName: isCommander ? member.name : sq.commanderName,
      activeMembersCount: members.length,
    };
  });
}

export function removeSquadMember(
  currentSquads: Squad[],
  squadId: string,
  memberRegOrId: string
): Squad[] {
  return currentSquads.map(sq => {
    if (sq.id !== squadId) return sq;
    const members = (sq.members || []).filter(
      m => m.registrationNumber !== memberRegOrId && m.id !== memberRegOrId
    );
    return {
      ...sq,
      members,
      activeMembersCount: members.length,
    };
  });
}

export function addNewSquad(currentSquads: Squad[], squad: Squad): Squad[] {
  const exists = currentSquads.some(s => s.id === squad.id);
  return exists
    ? currentSquads.map(s => s.id === squad.id ? squad : s)
    : [...currentSquads, squad];
}

export function removeSquad(currentSquads: Squad[], squadId: string): Squad[] {
  return currentSquads.filter(s => s.id !== squadId);
}

export function setSquadCommander(
  currentSquads: Squad[],
  squadId: string,
  commanderName: string
): Squad[] {
  return currentSquads.map(sq => {
    if (sq.id !== squadId) return sq;
    const members = (sq.members || []).map(m => ({
      ...m,
      isCommander: m.name === commanderName,
    }));
    return {
      ...sq,
      commanderName,
      members,
    };
  });
}

/**
 * Exporta backup em JSON a partir dos dados em memória carregados do Supabase
 */
export function exportDatabaseBackup(data: {
  occurrences: Occurrence[];
  platoons: Platoon[];
  squads: Squad[];
  users: User[];
  notifications: AppNotification[];
}): string {
  const backup = {
    exportedAt: new Date().toISOString(),
    system: 'CBMRS - Gestão de Ocorrências de Árvores (4º BBM - Santa Maria)',
    ...data,
  };
  return JSON.stringify(backup, null, 2);
}
