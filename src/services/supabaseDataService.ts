import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  Occurrence, 
  AttendanceRecord, 
  OccurrencePhoto, 
  Squad, 
  Platoon, 
  AppNotification,
  OccurrenceStatus,
  OccurrenceUrgency,
  OccurrenceType,
  TreeRiskType,
  UnresolvedReason
} from '../types';

/**
 * Validador e gerador de UUID v4 seguro
 */
export function ensureUUID(id?: string): string {
  if (!id) return crypto.randomUUID();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  return crypto.randomUUID();
}

/**
 * Busca todos os Pelotões cadastrados no Supabase
 */
export async function fetchPlatoonsFromSupabase(): Promise<Platoon[]> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase
    .from('platoons')
    .select('id, name, bbm, headquarters, commander_name, created_at')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar pelotões no Supabase: ${error.message}`);
  }

  if (!data) return [];

  return data.map(p => ({
    id: p.id,
    name: p.name,
    bbm: p.bbm || '4º BBM - Santa Maria',
    headquarters: p.headquarters || '',
    commanderName: p.commander_name || '',
  }));
}

/**
 * Busca todas as Guarnições (squads) cadastradas no Supabase
 */
export async function fetchSquadsFromSupabase(): Promise<Squad[]> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase
    .from('squads')
    .select('id, name, call_sign, unit_text, platoon_id, commander_name, current_shift, status, active_members_count, created_at')
    .order('call_sign', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar guarnições no Supabase: ${error.message}`);
  }

  if (!data) return [];

  return data.map(s => ({
    id: s.id,
    name: s.name,
    callSign: s.call_sign,
    unitText: s.unit_text || '',
    platoonId: s.platoon_id || '',
    commanderName: s.commander_name || 'Comandante da VTR',
    currentShift: s.current_shift || 'Turno 24h',
    status: (s.status || 'DISPONIVEL') as 'DISPONIVEL' | 'EM_OCORRENCIA' | 'MANUTENCAO',
    activeMembersCount: s.active_members_count || 0,
  }));
}

/**
 * Salva ou atualiza uma Guarnição/Viatura (squad) no Supabase (Exclusivo COBOM)
 */
export async function upsertSquadToSupabase(squad: Squad | Partial<Squad>): Promise<Squad> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');
  if (!squad.id || !squad.callSign) {
    throw new Error('Dados da viatura incompletos: ID e Prefixo são obrigatórios.');
  }

  const payload: any = {
    id: squad.id,
    name: squad.name || `${squad.callSign} (e-193)`,
    call_sign: squad.callSign,
    unit_text: squad.unitText || '4º BBM - Santa Maria',
    platoon_id: squad.platoonId || null,
    commander_name: squad.commanderName || 'A Definir',
    current_shift: squad.currentShift || 'Turno 24h',
    status: squad.status || 'DISPONIVEL',
    active_members_count: squad.members?.length || squad.activeMembersCount || 0,
  };

  const { data, error } = await supabase
    .from('squads')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw new Error(`Falha ao salvar viatura/guarnição '${squad.callSign}' no Supabase: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    callSign: data.call_sign,
    unitText: data.unit_text || '',
    platoonId: data.platoon_id || '',
    commanderName: data.commander_name || 'Comandante da VTR',
    currentShift: data.current_shift || 'Turno 24h',
    status: (data.status || 'DISPONIVEL') as 'DISPONIVEL' | 'EM_OCORRENCIA' | 'MANUTENCAO',
    activeMembersCount: data.active_members_count || 0,
    members: squad.members || [],
  };
}

/**
 * Remove uma Guarnição/Viatura (squad) no Supabase (Exclusivo COBOM)
 */
export async function deleteSquadFromSupabase(squadId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');
  if (!squadId) throw new Error('ID da viatura inválido.');

  const { error } = await supabase
    .from('squads')
    .delete()
    .eq('id', squadId);

  if (error) {
    throw new Error(`Falha ao excluir viatura no Supabase: ${error.message}`);
  }

  return true;
}

/**
 * Vincula um militar à sua guarnição e pelotão atual no Supabase
 */
export async function assignMilitarToSquad(
  matricula: string,
  squadId: string | null,
  platoonId?: string | null,
  funcao?: string,
  isComandante?: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');
  const cleanMatricula = matricula.replace(/\D/g, '').trim();
  if (!cleanMatricula) return false;

  const updatePayload: any = {
    squad_atual_id: squadId || null,
  };
  if (platoonId) updatePayload.platoon_atual_id = platoonId;
  if (funcao) updatePayload.funcao_na_guarnicao = funcao;
  if (typeof isComandante === 'boolean') updatePayload.is_comandante = isComandante;

  const { error } = await supabase
    .from('militares')
    .update(updatePayload)
    .eq('matricula', cleanMatricula);

  if (error) {
    console.warn(`Aviso ao atualizar lotação do militar ${cleanMatricula}:`, error.message);
  }

  return true;
}

/**
 * Registra a escala de serviço completa no Supabase
 */
export async function registerEscalaServico(
  squads: Squad[],
  platoons?: Platoon[]
): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  for (const squad of squads) {
    await upsertSquadToSupabase(squad);

    if (squad.members && squad.members.length > 0) {
      for (const member of squad.members) {
        if (member.registrationNumber && /^\d+$/.test(member.registrationNumber.trim())) {
          await assignMilitarToSquad(
            member.registrationNumber,
            squad.id,
            squad.platoonId,
            member.roleInSquad,
            member.roleInSquad?.toUpperCase().includes('COMANDANTE') || squad.commanderName === member.name
          );
        }
      }
    }
  }
}

/**
 * Busca quem está de serviço no momento a partir da view 'v_guarnicao_em_servico'
 */
export async function fetchGuarnicaoEmServicoFromView(): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('v_guarnicao_em_servico')
      .select('*');

    if (error) {
      console.warn('Aviso ao consultar view v_guarnicao_em_servico:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('Erro ao consultar view de serviço:', err);
    return [];
  }
}

/**
 * Busca todas as ocorrências relacionais do Supabase (tabelas: ocorrencias, atendimentos, fotos e squads)
 */
export async function fetchOccurrencesFromSupabase(): Promise<Occurrence[]> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  // 1. Busca ocorrências
  const { data: occRows, error: occError } = await supabase
    .from('ocorrencias')
    .select('*')
    .order('created_at', { ascending: false });

  if (occError) {
    throw new Error(`Erro ao consultar tabela 'ocorrencias' no Supabase: ${occError.message}`);
  }

  if (!occRows || occRows.length === 0) {
    return [];
  }

  const occurrenceIds = occRows.map(o => o.id);

  // 2. Busca atendimentos relacionados
  const { data: attRows, error: attError } = await supabase
    .from('atendimentos')
    .select('*')
    .in('ocorrencia_id', occurrenceIds)
    .order('iniciado_em', { ascending: true });

  if (attError) {
    throw new Error(`Erro ao consultar tabela 'atendimentos' no Supabase: ${attError.message}`);
  }

  // 3. Busca fotos relacionadas
  const { data: photoRows, error: photoError } = await supabase
    .from('fotos')
    .select('*')
    .in('ocorrencia_id', occurrenceIds)
    .order('enviado_em', { ascending: true });

  if (photoError) {
    throw new Error(`Erro ao consultar tabela 'fotos' no Supabase: ${photoError.message}`);
  }

  // 4. Busca guarnições para mapeamento dos nomes de viaturas e comandantes
  const { data: squadRows } = await supabase
    .from('squads')
    .select('id, name, call_sign, commander_name, current_shift');

  const squadMap = new Map<string, { name: string; callSign: string; commanderName: string; currentShift: string }>();
  if (squadRows) {
    squadRows.forEach(s => {
      squadMap.set(s.id, {
        name: s.name,
        callSign: s.call_sign,
        commanderName: s.commander_name || 'Comandante da VTR',
        currentShift: s.current_shift || 'Turno 24h',
      });
    });
  }

  // 5. Agrupamento de fotos por ocorrência e por atendimento
  const initialPhotosByOcc = new Map<string, OccurrencePhoto[]>();
  const photosByAttendance = new Map<string, OccurrencePhoto[]>();

  (photoRows || []).forEach(p => {
    const photoSquad = p.enviado_por_squad_id ? squadMap.get(p.enviado_por_squad_id)?.name || 'Guarnição' : 'COBOM';
    const photoObj: OccurrencePhoto = {
      id: p.id,
      occurrenceId: p.ocorrencia_id,
      attendanceId: p.atendimento_id || undefined,
      url: p.url_arquivo,
      caption: p.legenda || '',
      uploadedAt: p.enviado_em || new Date().toISOString(),
      uploadedBySquadName: photoSquad,
      stage: (p.etapa || 'INICIAL_COBOM') as 'INICIAL_COBOM' | 'DURANTE_ATENDIMENTO' | 'FINALIZACAO',
    };

    if (p.atendimento_id) {
      const list = photosByAttendance.get(p.atendimento_id) || [];
      list.push(photoObj);
      photosByAttendance.set(p.atendimento_id, list);
    } else {
      const list = initialPhotosByOcc.get(p.ocorrencia_id) || [];
      list.push(photoObj);
      initialPhotosByOcc.set(p.ocorrencia_id, list);
    }
  });

  // 6. Agrupamento de atendimentos por ocorrência
  const attendancesByOcc = new Map<string, AttendanceRecord[]>();
  (attRows || []).forEach(a => {
    const squadInfo = squadMap.get(a.squad_id);
    const attObj: AttendanceRecord = {
      id: a.id,
      occurrenceId: a.ocorrencia_id,
      squadId: a.squad_id,
      squadName: squadInfo?.name || 'Guarnição Empenhada',
      callSign: squadInfo?.callSign || 'VTR',
      commanderName: squadInfo?.commanderName || 'Comandante da VTR',
      shiftInfo: squadInfo?.currentShift || 'Turno Operacional',
      startedAt: a.iniciado_em || a.created_at,
      finishedAt: a.finalizado_em || a.iniciado_em || a.created_at,
      statusResult: (a.status_resultado || 'CONCLUIDA') as 'CONCLUIDA' | 'PENDENTE',
      actionTaken: a.acao_realizada || '',
      unresolvedReason: (a.motivo_nao_concluida as UnresolvedReason) || undefined,
      unresolvedDetails: a.detalhes_nao_concluida || undefined,
      equipmentUsed: Array.isArray(a.equipamentos_utilizados) ? a.equipamentos_utilizados : [],
      photos: photosByAttendance.get(a.id) || [],
    };

    const list = attendancesByOcc.get(a.ocorrencia_id) || [];
    list.push(attObj);
    attendancesByOcc.set(a.ocorrencia_id, list);
  });

  // 7. Montagem final das Ocorrências
  return occRows.map(row => {
    const occAttendances = attendancesByOcc.get(row.id) || [];
    const occInitialPhotos = initialPhotosByOcc.get(row.id) || [];

    return {
      id: row.id,
      protocol: row.protocolo,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
      initialRequestDate: row.data_solicitacao_inicial || undefined,
      openedBy: row.aberta_por || 'COBOM 193',
      solicitorName: row.solicitante_nome,
      solicitorPhone: row.solicitante_telefone,
      address: row.endereco,
      neighborhood: row.bairro || '',
      cidade: row.cidade || 'Santa Maria',
      city: row.cidade || 'Santa Maria',
      referencePoint: row.ponto_referencia || '',
      latitude: typeof row.latitude === 'number' ? row.latitude : -29.6842,
      longitude: typeof row.longitude === 'number' ? row.longitude : -53.8069,
      description: row.descricao,
      type: row.tipo as OccurrenceType,
      dispatchNature: row.natureza_despacho,
      treeRisk: row.risco_arvore as TreeRiskType,
      platoonId: row.platoon_id || '',
      assignedSquadId: row.squad_id || '',
      status: row.status as OccurrenceStatus,
      urgency: row.urgencia as OccurrenceUrgency,
      initialPhotos: occInitialPhotos,
      attendances: occAttendances,
      isCarriedOver: Boolean(row.is_carried_over),
      totalAttendancesCount: typeof row.total_atendimentos === 'number' ? row.total_atendimentos : occAttendances.length,
      lastAttendanceAt: row.ultimo_atendimento_em || (occAttendances.length > 0 ? occAttendances[occAttendances.length - 1].finishedAt : undefined),
    };
  });
}

/**
 * Cria uma nova ocorrência e suas fotos iniciais no Supabase
 */
export async function insertOccurrenceToSupabase(occ: Occurrence, militarUuid?: string): Promise<Occurrence> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const occId = ensureUUID(occ.id);

  const occPayload = {
    id: occId,
    protocolo: occ.protocol,
    aberta_por: militarUuid ? ensureUUID(militarUuid) : null,
    data_solicitacao_inicial: occ.initialRequestDate ? new Date(occ.initialRequestDate).toISOString() : null,
    solicitante_nome: occ.solicitorName,
    solicitante_telefone: occ.solicitorPhone,
    endereco: occ.address,
    bairro: occ.neighborhood || null,
    cidade: occ.city || 'Santa Maria',
    ponto_referencia: occ.referencePoint || null,
    latitude: occ.latitude,
    longitude: occ.longitude,
    descricao: occ.description,
    tipo: occ.type,
    natureza_despacho: occ.dispatchNature,
    risco_arvore: occ.treeRisk || null,
    urgencia: occ.urgency || 'MEDIA',
    platoon_id: occ.platoonId && occ.platoonId.includes('-') && occ.platoonId.length > 20 ? occ.platoonId : null,
    squad_id: occ.assignedSquadId && occ.assignedSquadId.includes('-') && occ.assignedSquadId.length > 20 ? occ.assignedSquadId : null,
    status: occ.status || 'ABERTA',
    is_carried_over: Boolean(occ.isCarriedOver),
    total_atendimentos: 0,
    created_at: occ.createdAt || new Date().toISOString(),
    updated_at: occ.updatedAt || new Date().toISOString(),
  };

  const { error: occError } = await supabase
    .from('ocorrencias')
    .insert(occPayload);

  if (occError) {
    throw new Error(`Falha ao inserir ocorrência no Supabase: ${occError.message}`);
  }

  // Inserir fotos iniciais na tabela 'fotos'
  if (occ.initialPhotos && occ.initialPhotos.length > 0) {
    const photoPayloads = occ.initialPhotos.map(p => ({
      id: ensureUUID(p.id),
      ocorrencia_id: occId,
      atendimento_id: null,
      url_arquivo: p.url,
      legenda: p.caption || null,
      etapa: 'INICIAL_COBOM',
      enviado_por_squad_id: occPayload.squad_id,
      enviado_em: p.uploadedAt || new Date().toISOString(),
    }));

    const { error: photoError } = await supabase
      .from('fotos')
      .insert(photoPayloads);

    if (photoError) {
      console.warn('Aviso ao persistir fotos iniciais no Supabase:', photoError.message);
    }
  }

  return {
    ...occ,
    id: occId,
  };
}

/**
 * Atualiza uma ocorrência no Supabase
 */
export async function updateOccurrenceInSupabase(occ: Occurrence): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const occId = ensureUUID(occ.id);

  const occPayload = {
    protocolo: occ.protocol,
    data_solicitacao_inicial: occ.initialRequestDate ? new Date(occ.initialRequestDate).toISOString() : null,
    solicitante_nome: occ.solicitorName,
    solicitante_telefone: occ.solicitorPhone,
    endereco: occ.address,
    bairro: occ.neighborhood || null,
    cidade: occ.city || 'Santa Maria',
    ponto_referencia: occ.referencePoint || null,
    latitude: occ.latitude,
    longitude: occ.longitude,
    descricao: occ.description,
    tipo: occ.type,
    natureza_despacho: occ.dispatchNature,
    risco_arvore: occ.treeRisk || null,
    urgencia: occ.urgency || 'MEDIA',
    platoon_id: occ.platoonId && occ.platoonId.includes('-') && occ.platoonId.length > 20 ? occ.platoonId : null,
    squad_id: occ.assignedSquadId && occ.assignedSquadId.includes('-') && occ.assignedSquadId.length > 20 ? occ.assignedSquadId : null,
    status: occ.status,
    is_carried_over: Boolean(occ.isCarriedOver),
    total_atendimentos: occ.totalAttendancesCount || (occ.attendances ? occ.attendances.length : 0),
    ultimo_atendimento_em: occ.lastAttendanceAt || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('ocorrencias')
    .update(occPayload)
    .eq('id', occId);

  if (error) {
    throw new Error(`Falha ao atualizar ocorrência no Supabase: ${error.message}`);
  }
}

/**
 * Registra um atendimento na tabela 'atendimentos', insere suas fotos na tabela 'fotos'
 * e atualiza o status/estatísticas da ocorrência na tabela 'ocorrencias'.
 */
export async function recordAttendanceInSupabase(
  occurrenceId: string,
  record: AttendanceRecord,
  militarUuid?: string
): Promise<AttendanceRecord> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const occId = ensureUUID(occurrenceId);
  const attId = ensureUUID(record.id);

  const atendimentoPayload = {
    id: attId,
    ocorrencia_id: occId,
    squad_id: record.squadId && record.squadId.includes('-') && record.squadId.length > 20 ? record.squadId : null,
    militar_responsavel_id: militarUuid ? ensureUUID(militarUuid) : null,
    iniciado_em: record.startedAt || new Date().toISOString(),
    finalizado_em: record.finishedAt || new Date().toISOString(),
    status_resultado: record.statusResult,
    acao_realizada: record.actionTaken || null,
    motivo_nao_concluida: record.statusResult === 'PENDENTE' ? (record.unresolvedReason || null) : null,
    detalhes_nao_concluida: record.statusResult === 'PENDENTE' ? (record.unresolvedDetails || null) : null,
    equipamentos_utilizados: record.equipmentUsed || [],
  };

  // 1. Insere atendimento
  const { error: attError } = await supabase
    .from('atendimentos')
    .upsert(atendimentoPayload, { onConflict: 'id' });

  if (attError) {
    throw new Error(`Falha ao registrar atendimento no Supabase: ${attError.message}`);
  }

  // 2. Insere fotos do atendimento se houver
  if (record.photos && record.photos.length > 0) {
    const photoPayloads = record.photos.map(p => ({
      id: ensureUUID(p.id),
      ocorrencia_id: occId,
      atendimento_id: attId,
      url_arquivo: p.url,
      legenda: p.caption || null,
      etapa: record.statusResult === 'CONCLUIDA' ? 'FINALIZACAO' : 'DURANTE_ATENDIMENTO',
      enviado_por_squad_id: atendimentoPayload.squad_id,
      enviado_em: p.uploadedAt || new Date().toISOString(),
    }));

    const { error: photoError } = await supabase
      .from('fotos')
      .upsert(photoPayloads, { onConflict: 'id' });

    if (photoError) {
      console.warn('Aviso ao salvar fotos do atendimento no Supabase:', photoError.message);
    }
  }

  // 3. Atualiza o status da ocorrência
  const newStatus = record.statusResult === 'CONCLUIDA' ? 'CONCLUIDA' : 'PENDENTE';
  const isPending = newStatus === 'PENDENTE';

  const { error: updateOccError } = await supabase
    .from('ocorrencias')
    .update({
      status: newStatus,
      is_carried_over: isPending ? true : undefined,
      ultimo_atendimento_em: record.finishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', occId);

  if (updateOccError) {
    throw new Error(`Falha ao atualizar status da ocorrência após atendimento: ${updateOccError.message}`);
  }

  return {
    ...record,
    id: attId,
    occurrenceId: occId,
  };
}

/**
 * Exclui uma ocorrência no Supabase e cascateia fotos, atendimentos e notificações vinculados.
 */
export async function deleteOccurrenceFromSupabase(occurrenceId: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const occId = ensureUUID(occurrenceId);

  // 1. Remove fotos associadas
  await supabase.from('fotos').delete().eq('ocorrencia_id', occId);

  // 2. Remove notificações associadas
  await supabase.from('notificacoes').delete().eq('ocorrencia_id', occId);

  // 3. Remove atendimentos associados
  await supabase.from('atendimentos').delete().eq('ocorrencia_id', occId);

  // 4. Remove ocorrência
  const { error } = await supabase.from('ocorrencias').delete().eq('id', occId);

  if (error) {
    throw new Error(`Falha ao excluir ocorrência no Supabase: ${error.message}`);
  }
}

/**
 * Busca notificações do Supabase
 */
export async function fetchNotificationsFromSupabase(): Promise<AppNotification[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Aviso ao consultar notificações:', error.message);
    return [];
  }

  if (!data) return [];

  return data.map(n => ({
    id: n.id,
    title: n.titulo,
    message: n.mensagem,
    type: n.tipo,
    occurrenceId: n.ocorrencia_id || '',
    occurrenceProtocol: '',
    targetRoles: Array.isArray(n.perfis_alvo) ? n.perfis_alvo : ['COBOM', 'GUARNICAO', 'PELOTAO'],
    targetSquadId: n.squad_alvo_id || undefined,
    targetPlatoonId: n.platoon_alvo_id || undefined,
    createdAt: n.created_at,
    isRead: Boolean(n.lida),
  }));
}

/**
 * Cria uma notificação no Supabase
 */
export async function insertNotificationToSupabase(notif: AppNotification): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const payload = {
      id: ensureUUID(notif.id),
      titulo: notif.title,
      mensagem: notif.message,
      tipo: notif.type,
      ocorrencia_id: notif.occurrenceId && notif.occurrenceId.includes('-') && notif.occurrenceId.length > 20 ? notif.occurrenceId : null,
      perfis_alvo: notif.targetRoles || ['COBOM', 'GUARNICAO', 'PELOTAO'],
      squad_alvo_id: notif.targetSquadId && notif.targetSquadId.includes('-') && notif.targetSquadId.length > 20 ? notif.targetSquadId : null,
      platoon_alvo_id: notif.targetPlatoonId && notif.targetPlatoonId.includes('-') && notif.targetPlatoonId.length > 20 ? notif.targetPlatoonId : null,
      lida: Boolean(notif.isRead),
      created_at: notif.createdAt || new Date().toISOString(),
    };

    await supabase.from('notificacoes').insert(payload);
  } catch (err) {
    console.warn('Aviso ao inserir notificação no Supabase:', err);
  }
}

/**
 * Marca notificação como lida no Supabase
 */
export async function markNotificationAsReadInSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id);
  } catch (err) {
    console.warn('Aviso ao marcar notificação como lida no Supabase:', err);
  }
}

/**
 * Inscrição Realtime no Supabase para atualizações instantâneas entre COBOM e Guarnições
 */
export function subscribeToOccurrencesRealtime(onUpdate: () => void) {
  if (!isSupabaseConfigured()) return () => {};

  try {
    const channel = supabase
      .channel('ocorrencias-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ocorrencias' },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'atendimentos' },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fotos' },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.warn('Realtime subscription não inicializado:', e);
    return () => {};
  }
}
