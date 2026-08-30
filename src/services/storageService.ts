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
  updateAttendanceTextInSupabase,
  insertNotificationToSupabase,
  fetchOccurrencesFromSupabase,
  upsertSquadToSupabase,
  deleteSquadFromSupabase,
  getActiveCgForSquadAtTime,
  logCgManualChangeInAuditoria,
  buildOccurrenceTimeline,
  ensureUUID,
} from './supabaseDataService';
import { normalizarPosto } from './commandHierarchyService';

export {
  upsertSquadToSupabase,
  deleteSquadFromSupabase,
  getActiveCgForSquadAtTime,
  logCgManualChangeInAuditoria,
  buildOccurrenceTimeline,
  updateAttendanceTextInSupabase,
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
  const year = new Date().getFullYear();
  const id = ensureUUID();
  const nowIso = new Date().toISOString();

  function gerarProtocolo(): string {
    // ANTES: só os últimos 5 dígitos de Date.now() — se repete a cada 100s,
    // então duas OCs criadas dentro da mesma janela de 100s (bem comum numa
    // noite de temporal, com várias chamadas seguidas) geravam o MESMO
    // protocolo. A tabela tem UNIQUE(protocolo), então a 2ª OC falhava ao
    // gravar e o operador perdia o registro sem necessariamente perceber o
    // erro na tela. Agora: timestamp completo em base36 + 3 caracteres
    // aleatórios — o espaço de colisão é astronomicamente menor, e ainda
    // assim há uma nova tentativa automática abaixo como rede de segurança.
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `CBMRS-${year}-${Date.now().toString(36).toUpperCase()}${rand}`;
  }

  // Snapshot do CG de despacho no momento da criação/despacho
  let cgId = newOcc.cgGuarnicaoDespachoId;
  let cgName = newOcc.cgGuarnicaoDespachoName;
  if (!cgId && newOcc.assignedSquadId) {
    try {
      const cgInfo = await getActiveCgForSquadAtTime(newOcc.assignedSquadId, nowIso);
      if (cgInfo.militarId) {
        cgId = cgInfo.militarId;
        cgName = cgInfo.name;
      }
    } catch (err) {
      console.warn('Aviso ao obter snapshot do CG para despacho:', err);
    }
  }

  const fullOccurrenceBase = {
    ...newOcc,
    id,
    cgGuarnicaoDespachoId: cgId,
    cgGuarnicaoDespachoName: cgName,
    createdAt: nowIso,
    updatedAt: nowIso,
    attendances: [] as Occurrence['attendances'],
    totalAttendancesCount: 0,
    isCarriedOver: false,
  };

  // 1. Grava obrigatoriamente no Supabase e aguarda confirmação.
  //    Rede de segurança: se por acaso o protocolo colidir com um já
  //    existente (UNIQUE(protocolo)), gera outro e tenta de novo, em vez de
  //    simplesmente falhar e o operador perder o que digitou.
  let savedOcc: Occurrence | null = null;
  let lastError: any = null;
  let protocol = gerarProtocolo();
  for (let attempt = 0; attempt < 3 && !savedOcc; attempt++) {
    if (attempt > 0) protocol = gerarProtocolo();
    const fullOccurrence: Occurrence = { ...fullOccurrenceBase, protocol };
    try {
      savedOcc = await insertOccurrenceToSupabase(fullOccurrence, militarUuid);
    } catch (err: any) {
      lastError = err;
      const msg = (err?.message || '').toLowerCase();
      const isProtocolCollision = msg.includes('protocolo') && (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505') || msg.includes('já existe'));
      if (!isProtocolCollision) throw err; // erro diferente: não adianta tentar de novo
    }
  }
  if (!savedOcc) throw lastError || new Error('Falha ao gerar um protocolo único para a ocorrência após múltiplas tentativas.');

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
  let occToSave = { ...updated };
  if (!occToSave.cgGuarnicaoDespachoId && occToSave.assignedSquadId) {
    try {
      const nowIso = new Date().toISOString();
      const cgInfo = await getActiveCgForSquadAtTime(occToSave.assignedSquadId, nowIso);
      if (cgInfo.militarId) {
        occToSave.cgGuarnicaoDespachoId = cgInfo.militarId;
        occToSave.cgGuarnicaoDespachoName = cgInfo.name;
      }
    } catch (err) {
      console.warn('Aviso ao atualizar snapshot do CG de despacho:', err);
    }
  }
  await updateOccurrenceInSupabase(occToSave);
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

  // 1. Busca a ocorrência para verificar o snapshot do CG de despacho
  const occs = await fetchOccurrencesFromSupabase();
  const currentOcc = occs.find(o => o.id === occurrenceId);

  let cgMilitarId = currentOcc?.cgGuarnicaoDespachoId;
  if (!cgMilitarId && record.squadId) {
    // Se não tiver snapshot prévio, consulta o CG da guarnição no momento do início do atendimento
    const cgInfo = await getActiveCgForSquadAtTime(record.squadId, record.startedAt);
    if (cgInfo.militarId) {
      cgMilitarId = cgInfo.militarId;
    }
  }

  const preenchidoPorId = militarUuid || (user.id && user.id.includes('-') && user.id.length > 20 ? user.id : undefined);

  const fullRecord: AttendanceRecord = {
    ...record,
    id: recordId,
    occurrenceId,
    militarResponsavelId: cgMilitarId || undefined,
    preenchidoPorId: preenchidoPorId || undefined,
  };

  // 2. Grava no Supabase
  await recordAttendanceInSupabase(occurrenceId, fullRecord, cgMilitarId, preenchidoPorId);

  // 3. Notificação
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
    occurrenceProtocol: currentOcc?.protocol || '',
    targetRoles: ['COBOM', 'PELOTAO', 'GUARNICAO'],
    targetSquadId: record.squadId,
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  await insertNotificationToSupabase(notif);

  const updatedOccs = await fetchOccurrencesFromSupabase();
  const found = updatedOccs.find(o => o.id === occurrenceId);
  if (found) return found;

  throw new Error(`Ocorrência ${occurrenceId} atualizada no Supabase mas não localizada na listagem.`);
}

/**
 * Atualiza status para 'EM_ATENDIMENTO' quando a guarnição desloca/chega no local
 * e captura o snapshot do Comandante de Guarnição (CG) no momento do despacho.
 */
export async function setSquadInAttendance(
  occurrenceOrId: Occurrence | string,
  squadId: string
): Promise<Occurrence> {
  const occId = typeof occurrenceOrId === 'string' ? occurrenceOrId : occurrenceOrId.id;

  // Busca snapshot do CG ativo da guarnição agora
  const nowIso = new Date().toISOString();
  const cgInfo = await getActiveCgForSquadAtTime(squadId, nowIso);

  if (typeof occurrenceOrId === 'object') {
    const updatedOcc: Occurrence = {
      ...occurrenceOrId,
      status: 'EM_ATENDIMENTO',
      assignedSquadId: squadId,
      cgGuarnicaoDespachoId: cgInfo.militarId || occurrenceOrId.cgGuarnicaoDespachoId,
      cgGuarnicaoDespachoName: cgInfo.militarId ? cgInfo.name : occurrenceOrId.cgGuarnicaoDespachoName,
      updatedAt: nowIso,
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
    cgGuarnicaoDespachoId: cgInfo.militarId || found.cgGuarnicaoDespachoId,
    cgGuarnicaoDespachoName: cgInfo.militarId ? cgInfo.name : found.cgGuarnicaoDespachoName,
    updatedAt: nowIso,
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
