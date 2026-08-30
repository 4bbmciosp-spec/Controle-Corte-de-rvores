import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  Occurrence, 
  AttendanceRecord, 
  OccurrencePhoto, 
  Squad, 
  SquadMember,
  Platoon, 
  AppNotification,
  OccurrenceStatus,
  OccurrenceUrgency,
  OccurrenceType,
  TreeRiskType,
  UnresolvedReason,
  TimelineEvent,
  GuarnicaoEmServicoRow,
  E193ImportEntry,
  E193ImportResult,
  EscalaAuditoriaEntry
} from '../types';
import {
  determinarCgPorIntervalo,
  normalizarPosto,
  pesoHierarquico,
  compararAntiguidade,
  EscalaCandidate
} from './commandHierarchyService';

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
function formatTurnoRange(inicioIso?: string, fimIso?: string): string {
  if (!inicioIso || !fimIso) return 'Sem escala vigente';
  const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  return `${fmt(inicioIso)} às ${fmt(fimIso)}`;
}

export async function fetchSquadsFromSupabase(): Promise<Squad[]> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  // 1. Metadados ESTÁTICOS da VTR (id, nome, prefixo, pelotão). Isso não muda por turno.
  const { data, error } = await supabase
    .from('squads')
    .select('id, name, call_sign, unit_text, platoon_id, status, created_at')
    .order('call_sign', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar guarnições no Supabase: ${error.message}`);
  }

  if (!data) return [];

  // 2. Composição REAL (quem está de serviço agora, quem é o CG, qual o turno)
  //    vem da view v_guarnicao_em_servico, que lê de escalas_servico — a
  //    fonte de verdade da escala operacional. NÃO usar militares.squad_atual_id
  //    ou militares.is_comandante aqui: são campos legados/estáticos que não
  //    refletem trocas de turno.
  const guarnicoesEmServico = await fetchGuarnicoesEmServico().catch(err => {
    console.warn('Aviso ao buscar escala ativa (v_guarnicao_em_servico):', err?.message || err);
    return [] as GuarnicaoEmServicoRow[];
  });

  const bySquadId = new Map<string, GuarnicaoEmServicoRow[]>();
  guarnicoesEmServico.forEach(row => {
    const list = bySquadId.get(row.squad_id) || [];
    list.push(row);
    bySquadId.set(row.squad_id, list);
  });

  return data.map(s => {
    const rows = bySquadId.get(s.id) || [];
    const cgRow = rows.find(r => r.is_cg);

    const members: SquadMember[] = rows.map(r => ({
      id: r.militar_id,
      registrationNumber: r.matricula,
      name: `${r.posto_graduacao} ${r.nome_guerra}`,
      rank: r.posto_graduacao,
      roleInSquad: r.funcao_na_guarnicao || 'COMBATENTE',
      isCommander: Boolean(r.is_cg),
      shiftHours: r.carga_horaria_horas,
      shiftStart: r.inicio_turno,
      shiftEnd: r.fim_turno,
    }));

    // Turno exibido = intervalo da escala do CG (ou do primeiro militar, se não houver CG definido)
    const turnoRef = cgRow || rows[0];

    return {
      id: s.id,
      name: s.name,
      callSign: s.call_sign,
      unitText: s.unit_text || '',
      platoonId: s.platoon_id || '',
      commanderName: cgRow ? `${cgRow.posto_graduacao} ${cgRow.nome_guerra}` : 'Sem CG escalado',
      currentShift: formatTurnoRange(turnoRef?.inicio_turno, turnoRef?.fim_turno),
      status: (s.status || 'DISPONIVEL') as 'DISPONIVEL' | 'EM_OCORRENCIA' | 'MANUTENCAO',
      activeMembersCount: members.length,
      members,
    };
  });
}

export interface MilitarRosterEntry {
  matricula: string;
  posto: string;
  nome: string;
  squadAtualId: string | null;
}

/**
 * Busca a lista completa de militares (posto + nome de guerra) para
 * preencher seletores de "quem é essa pessoa" em telas de gestão de guarnição.
 */
export async function fetchMilitaresRosterFromSupabase(): Promise<MilitarRosterEntry[]> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase
    .from('militares')
    .select('matricula, posto_graduacao, nome_guerra, squad_atual_id')
    .order('nome_guerra', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar lista de militares no Supabase: ${error.message}`);
  }

  return (data || []).map(m => ({
    matricula: m.matricula,
    posto: m.posto_graduacao || '',
    nome: m.nome_guerra || '',
    squadAtualId: m.squad_atual_id,
  }));
}

/**
 * Salva ou atualiza uma Guarnição/Viatura (squad) no Supabase (Exclusivo COBOM)
 */
export async function upsertSquadToSupabase(squad: Squad | Partial<Squad>): Promise<Squad> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');
  if (!squad.callSign) {
    throw new Error('Dados da viatura incompletos: Prefixo (call sign) é obrigatório.');
  }

  // Nunca envie um id gerado no cliente (ex: "squad-abc-794") — a coluna é UUID
  // e o Postgres gera o valor real automaticamente via gen_random_uuid().
  const payload: any = {
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
    .upsert(payload, { onConflict: 'call_sign' })
    .select()
    .single();

  if (error) {
    throw new Error(`Falha ao salvar viatura/guarnição '${squad.callSign}' no Supabase: ${error.message}`);
  }

  // Retorna a guarnição com o UUID REAL gerado pelo banco, para que quem
  // chamou essa função possa atualizar o estado local com o id correto.
  return {
    id: data.id,
    name: data.name,
    callSign: data.call_sign,
    unitText: data.unit_text || '',
    platoonId: data.platoon_id || '',
    commanderName: data.commander_name || 'A Definir',
    currentShift: data.current_shift || 'Turno 24h',
    status: data.status,
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
 * Busca o Comandante de Guarnição (CG) ativo para uma guarnição em um dado instante temporal.
 * Fonte primária: 'escalas_servico'
 * Fallback: 'militares' vinculado à guarnição
 */
export async function getActiveCgForSquadAtTime(
  squadId: string,
  timestamp?: string
): Promise<{ militarId: string | null; name: string; rank: string; matricula: string }> {
  if (!isSupabaseConfigured() || !squadId) {
    return { militarId: null, name: 'Comandante da VTR', rank: 'SGT', matricula: '' };
  }

  const targetTime = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

  try {
    // 1. Consulta tabela 'escalas_servico'
    const { data: escalaData, error: escalaErr } = await supabase
      .from('escalas_servico')
      .select('militar_id, is_cg, inicio_turno, fim_turno, militares(id, matricula, posto_graduacao, nome_guerra)')
      .eq('squad_id', squadId)
      .eq('is_cg', true)
      .lte('inicio_turno', targetTime)
      .gte('fim_turno', targetTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!escalaErr && escalaData && escalaData.militares) {
      const m = escalaData.militares as any;
      return {
        militarId: m.id,
        name: `${m.posto_graduacao} ${m.nome_guerra}`,
        rank: m.posto_graduacao,
        matricula: m.matricula,
      };
    }

    // 2. Fallback: busca na tabela 'militares' vinculados à guarnição
    const { data: milData, error: milErr } = await supabase
      .from('militares')
      .select('id, matricula, posto_graduacao, nome_guerra, is_comandante')
      .eq('squad_atual_id', squadId);

    if (!milErr && milData && milData.length > 0) {
      // Prioriza quem tem is_comandante = true
      const cmd = milData.find(m => m.is_comandante);
      if (cmd) {
        return {
          militarId: cmd.id,
          name: `${cmd.posto_graduacao} ${cmd.nome_guerra}`,
          rank: cmd.posto_graduacao,
          matricula: cmd.matricula,
        };
      }

      // Senão ordena por antiguidade
      const sorted = [...milData].sort((a, b) => compararAntiguidade(
        { posto_graduacao: a.posto_graduacao, matricula: a.matricula },
        { posto_graduacao: b.posto_graduacao, matricula: b.matricula }
      ));
      const highest = sorted[sorted.length - 1];
      if (highest) {
        return {
          militarId: highest.id,
          name: `${highest.posto_graduacao} ${highest.nome_guerra}`,
          rank: highest.posto_graduacao,
          matricula: highest.matricula,
        };
      }
    }
  } catch (err) {
    console.warn('Aviso ao buscar CG ativo da guarnição:', err);
  }

  return { militarId: null, name: 'Comandante da VTR', rank: 'SGT', matricula: '' };
}

/**
 * Registra auditoria de alteração manual de CG na tabela 'militares_auditoria'
 */
export async function logCgManualChangeInAuditoria(
  militarId: string,
  valorAnterior: string,
  valorNovo: string,
  alteradoPorAuthUserId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const payload = {
      id: ensureUUID(),
      militar_id: ensureUUID(militarId),
      campo: 'is_comandante',
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      origem: 'EDICAO_MANUAL',
      alterado_por: alteradoPorAuthUserId ? ensureUUID(alteradoPorAuthUserId) : null,
      alterado_em: new Date().toISOString(),
    };

    await supabase.from('militares_auditoria').insert(payload);
  } catch (err) {
    console.warn('Aviso ao registrar auditoria de CG:', err);
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

  // 4. Busca guarnições e militares para mapeamento de nomes, viaturas e CGs
  const { data: squadRows } = await supabase
    .from('squads')
    .select('id, name, call_sign, commander_name, current_shift');

  const { data: milRows } = await supabase
    .from('militares')
    .select('id, matricula, posto_graduacao, nome_guerra');

  const militarMap = new Map<string, string>();
  if (milRows) {
    milRows.forEach(m => {
      militarMap.set(m.id, `${m.posto_graduacao} ${m.nome_guerra}`);
    });
  }

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
    const cgSnapshotName = a.militar_responsavel_id ? militarMap.get(a.militar_responsavel_id) : undefined;
    const preenchidoPorName = a.preenchido_por_id ? militarMap.get(a.preenchido_por_id) : undefined;

    const attObj: AttendanceRecord = {
      id: a.id,
      occurrenceId: a.ocorrencia_id,
      squadId: a.squad_id,
      squadName: squadInfo?.name || 'Guarnição Empenhada',
      callSign: squadInfo?.callSign || 'VTR',
      commanderName: cgSnapshotName || squadInfo?.commanderName || 'Comandante da VTR',
      militarResponsavelId: a.militar_responsavel_id || undefined,
      militarResponsavelName: cgSnapshotName,
      preenchidoPorId: a.preenchido_por_id || undefined,
      preenchidoPorName: preenchidoPorName,
      shiftInfo: squadInfo?.currentShift || 'Turno Operacional',
      startedAt: a.iniciado_em || a.created_at,
      finishedAt: a.finalizado_em || a.iniciado_em || a.created_at,
      statusResult: (a.status_resultado || 'CONCLUIDA') as 'CONCLUIDA' | 'PENDENTE',
      actionTaken: a.acao_realizada || '',
      unresolvedReason: (a.motivo_nao_concluida as UnresolvedReason) || undefined,
      unresolvedDetails: a.detalhes_nao_concluida || undefined,
      equipmentUsed: Array.isArray(a.equipamentos_utilizados) ? a.equipamentos_utilizados : [],
      photos: photosByAttendance.get(a.id) || [],
      editedAt: a.editado_em || undefined,
      editedByName: a.editado_por_id ? militarMap.get(a.editado_por_id) : undefined,
    };

    const list = attendancesByOcc.get(a.ocorrencia_id) || [];
    list.push(attObj);
    attendancesByOcc.set(a.ocorrencia_id, list);
  });

  // 7. Montagem final das Ocorrências
  return occRows.map(row => {
    const occAttendances = attendancesByOcc.get(row.id) || [];
    const occInitialPhotos = initialPhotosByOcc.get(row.id) || [];
    const cgDespachoName = row.cg_guarnicao_despacho_id ? militarMap.get(row.cg_guarnicao_despacho_id) : undefined;

    return {
      id: row.id,
      protocol: row.protocolo,
      numeroE193: row.numero_e193 || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
      initialRequestDate: row.data_solicitacao_inicial || undefined,
      openedBy: (row.aberta_por ? militarMap.get(row.aberta_por) : undefined) || row.aberta_por || 'COBOM 193',
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
      cgGuarnicaoDespachoId: row.cg_guarnicao_despacho_id || undefined,
      cgGuarnicaoDespachoName: cgDespachoName,
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
    numero_e193: occ.numeroE193 || null,
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
    cg_guarnicao_despacho_id: occ.cgGuarnicaoDespachoId && occ.cgGuarnicaoDespachoId.includes('-') && occ.cgGuarnicaoDespachoId.length > 20 ? occ.cgGuarnicaoDespachoId : null,
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
    numero_e193: occ.numeroE193 || null,
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
    cg_guarnicao_despacho_id: occ.cgGuarnicaoDespachoId && occ.cgGuarnicaoDespachoId.includes('-') && occ.cgGuarnicaoDespachoId.length > 20 ? occ.cgGuarnicaoDespachoId : null,
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
 * 
 * Regra do Sistema:
 * - militar_responsavel_id: Snapshot do Comandante de Guarnição (CG) despachado no momento do atendimento.
 * - preenchido_por_id: ID do militar autenticado que está enviando o formulário.
 */
export async function recordAttendanceInSupabase(
  occurrenceId: string,
  record: AttendanceRecord,
  cgMilitarId?: string,
  preenchidoPorId?: string
): Promise<AttendanceRecord> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const occId = ensureUUID(occurrenceId);
  const attId = ensureUUID(record.id);

  // Se cgMilitarId não foi passado diretamente, tenta obter de record.militarResponsavelId
  const finalCgId = cgMilitarId || record.militarResponsavelId || null;
  const finalPreenchidoPorId = preenchidoPorId || record.preenchidoPorId || null;

  const atendimentoPayload = {
    id: attId,
    ocorrencia_id: occId,
    squad_id: record.squadId && record.squadId.includes('-') && record.squadId.length > 20 ? record.squadId : null,
    militar_responsavel_id: finalCgId && finalCgId.includes('-') && finalCgId.length > 20 ? ensureUUID(finalCgId) : null,
    preenchido_por_id: finalPreenchidoPorId && finalPreenchidoPorId.includes('-') && finalPreenchidoPorId.length > 20 ? ensureUUID(finalPreenchidoPorId) : null,
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
    militarResponsavelId: finalCgId || undefined,
    preenchidoPorId: finalPreenchidoPorId || undefined,
  };
}

/**
 * Edita o texto/detalhes de um atendimento JÁ REGISTRADO (inclusive depois
 * da ocorrência estar CONCLUÍDA) — item 3A. Só altera os campos de texto;
 * NÃO mexe em iniciado_em/finalizado_em/squad_id/militar_responsavel_id/
 * preenchido_por_id, que continuam sendo o snapshot original de quem
 * atendeu e quando. Fica registrado em editado_em/editado_por_id para
 * transparência de que o registro foi corrigido posteriormente.
 */
export async function updateAttendanceTextInSupabase(
  attendanceId: string,
  updates: {
    actionTaken?: string;
    unresolvedReason?: string | null;
    unresolvedDetails?: string | null;
    equipmentUsed?: string[];
  },
  editedByMilitarId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');

  const attId = ensureUUID(attendanceId);

  const payload: any = {
    editado_em: new Date().toISOString(),
  };
  if (editedByMilitarId && editedByMilitarId.includes('-') && editedByMilitarId.length > 20) {
    payload.editado_por_id = ensureUUID(editedByMilitarId);
  }
  if (updates.actionTaken !== undefined) payload.acao_realizada = updates.actionTaken;
  if (updates.unresolvedReason !== undefined) payload.motivo_nao_concluida = updates.unresolvedReason;
  if (updates.unresolvedDetails !== undefined) payload.detalhes_nao_concluida = updates.unresolvedDetails;
  if (updates.equipmentUsed !== undefined) payload.equipamentos_utilizados = updates.equipmentUsed;

  const { error } = await supabase
    .from('atendimentos')
    .update(payload)
    .eq('id', attId);

  if (error) {
    throw new Error(`Falha ao editar o atendimento: ${error.message}`);
  }
}

/**
 * Constrói a Linha do Tempo (Timeline) cronológica completa de uma ocorrência
 */
export async function buildOccurrenceTimeline(occurrenceId: string): Promise<TimelineEvent[]> {
  if (!isSupabaseConfigured()) return [];

  const occId = ensureUUID(occurrenceId);
  const events: TimelineEvent[] = [];

  try {
    // 1. Busca ocorrência com dados de criação e CG de despacho
    const { data: occData } = await supabase
      .from('ocorrencias')
      .select('*, squads(name, call_sign), militares:cg_guarnicao_despacho_id(posto_graduacao, nome_guerra)')
      .eq('id', occId)
      .maybeSingle();

    if (occData) {
      const squadInfo = occData.squads as any;
      const cgInfo = occData.militares as any;

      events.push({
        id: `event-created-${occData.id}`,
        timestamp: occData.created_at,
        type: 'DESPACHO',
        title: `🚨 Ocorrência Gerada e Despachada`,
        description: `Protocolo ${occData.protocolo} registrado no COBOM. Natureza: ${occData.natureza_despacho || occData.tipo}.`,
        squadCallSign: squadInfo?.call_sign || 'COBOM',
        cgName: cgInfo ? `${cgInfo.posto_graduacao} ${cgInfo.nome_guerra}` : undefined,
        cgRank: cgInfo?.posto_graduacao,
      });
    }

    // 2. Busca atendimentos com dados do CG e fotos
    const { data: attData } = await supabase
      .from('atendimentos')
      .select('*, squads(name, call_sign), militares:militar_responsavel_id(posto_graduacao, nome_guerra), preenchido:preenchido_por_id(posto_graduacao, nome_guerra)')
      .eq('ocorrencia_id', occId)
      .order('iniciado_em', { ascending: true });

    const { data: photoData } = await supabase
      .from('fotos')
      .select('*')
      .eq('ocorrencia_id', occId);

    const photosByAtt = new Map<string, OccurrencePhoto[]>();
    (photoData || []).forEach(p => {
      if (p.atendimento_id) {
        const list = photosByAtt.get(p.atendimento_id) || [];
        list.push({
          id: p.id,
          occurrenceId: p.ocorrencia_id,
          attendanceId: p.atendimento_id,
          url: p.url_arquivo,
          caption: p.legenda || '',
          uploadedAt: p.enviado_em,
          uploadedBySquadName: 'Guarnição',
          stage: p.etapa as any,
        });
        photosByAtt.set(p.atendimento_id, list);
      }
    });

    (attData || []).forEach(att => {
      const squadInfo = att.squads as any;
      const cgInfo = att.militares as any;
      const preenchidoInfo = att.preenchido as any;
      const attPhotos = photosByAtt.get(att.id) || [];

      // Início do Atendimento
      events.push({
        id: `event-start-${att.id}`,
        timestamp: att.iniciado_em || att.created_at,
        type: 'INICIO_ATENDIMENTO',
        title: `🚒 Chegada da Guarnição no Local`,
        description: `Viatura ${squadInfo?.call_sign || 'VTR'} iniciou os trabalhos operacionais. Comandante de Guarnição: ${cgInfo ? `${cgInfo.posto_graduacao} ${cgInfo.nome_guerra}` : 'CG Designado'}.`,
        squadCallSign: squadInfo?.call_sign,
        cgName: cgInfo ? `${cgInfo.posto_graduacao} ${cgInfo.nome_guerra}` : undefined,
        cgRank: cgInfo?.posto_graduacao,
      });

      // Desfecho do Atendimento
      if (att.status_resultado === 'CONCLUIDA') {
        events.push({
          id: `event-finish-${att.id}`,
          timestamp: att.finalizado_em || att.iniciado_em,
          type: 'FINALIZACAO',
          title: `✅ Corte/Vistoria Concluído com Sucesso`,
          description: `Ação realizada: ${att.acao_realizada || 'Corte e desobstrução realizados com segurança'}. Registrado por: ${preenchidoInfo ? `${preenchidoInfo.posto_graduacao} ${preenchidoInfo.nome_guerra}` : 'Operador'}.`,
          squadCallSign: squadInfo?.call_sign,
          cgName: cgInfo ? `${cgInfo.posto_graduacao} ${cgInfo.nome_guerra}` : undefined,
          cgRank: cgInfo?.posto_graduacao,
          photos: attPhotos,
        });
      } else {
        events.push({
          id: `event-pendente-${att.id}`,
          timestamp: att.finalizado_em || att.iniciado_em,
          type: 'PENDENCIA',
          title: `⚠️ Atendimento Pendente / Repassado para Próximo Turno`,
          description: `Motivo: ${att.motivo_nao_concluida || 'Não concluída'}. Detalhes: ${att.detalhes_nao_concluida || 'Aguardando apoio/recursos'}. Registrado por: ${preenchidoInfo ? `${preenchidoInfo.posto_graduacao} ${preenchidoInfo.nome_guerra}` : 'Operador'}.`,
          squadCallSign: squadInfo?.call_sign,
          cgName: cgInfo ? `${cgInfo.posto_graduacao} ${cgInfo.nome_guerra}` : undefined,
          cgRank: cgInfo?.posto_graduacao,
          photos: attPhotos,
        });
      }
    });

  } catch (err) {
    console.warn('Aviso ao construir linha do tempo da ocorrência:', err);
  }

  // Ordena eventos por timestamp cronológico crescente
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return events;
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

/**
 * Consulta a View 'v_guarnicao_em_servico' (Fonte de verdade da escala ativa)
 */
export async function fetchGuarnicoesEmServico(): Promise<GuarnicaoEmServicoRow[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('v_guarnicao_em_servico')
    .select('*')
    .order('call_sign', { ascending: true });

  if (error) {
    console.warn('Aviso ao consultar v_guarnicao_em_servico no Supabase:', error.message);
    return [];
  }

  return (data || []).map((r: any) => ({
    escala_id: r.escala_id,
    squad_id: r.squad_id,
    squad_name: r.squad_name || r.call_sign,
    call_sign: r.call_sign,
    platoon_id: r.platoon_id,
    platoon_name: r.platoon_name,
    militar_id: r.militar_id,
    matricula: r.matricula,
    nome_guerra: r.nome_guerra,
    posto_graduacao: r.posto_graduacao,
    perfil: r.perfil,
    funcao_na_guarnicao: r.funcao_na_guarnicao,
    carga_horaria_horas: r.carga_horaria_horas,
    inicio_turno: r.inicio_turno,
    fim_turno: r.fim_turno,
    is_cg: Boolean(r.is_cg),
    cg_definido_explicitamente: Boolean(r.cg_definido_explicitamente),
  }));
}

/**
 * Busca TODOS os registros de escala de uma VTR num dia específico (não só os
 * vigentes agora). Necessário antes de qualquer edição manual de um único
 * posto, porque fn_import_escala_e193 SUBSTITUI a escala inteira daquela
 * VTR/dia — se enviarmos só o registro alterado, perdemos os demais.
 */
export interface EscalaDiaRow {
  escala_id: string;
  militar_id: string;
  matricula: string;
  posto_graduacao: string;
  nome_guerra: string;
  funcao_na_guarnicao: string;
  carga_horaria_horas: number;
  inicio_turno: string;
  fim_turno: string;
  is_cg: boolean;
}

export async function fetchEscalaCompletaDoDia(squadId: string, dia: string): Promise<EscalaDiaRow[]> {
  if (!isSupabaseConfigured() || !squadId) return [];

  const inicioDia = `${dia}T00:00:00-03:00`;
  const fimDia = `${dia}T23:59:59-03:00`;

  const { data, error } = await supabase
    .from('escalas_servico')
    .select('id, militar_id, funcao_na_guarnicao, carga_horaria_horas, inicio_turno, fim_turno, is_cg, militares(matricula, posto_graduacao, nome_guerra)')
    .eq('squad_id', squadId)
    .gte('inicio_turno', inicioDia)
    .lte('inicio_turno', fimDia)
    .order('inicio_turno', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar escala do dia para a VTR: ${error.message}`);
  }

  return (data || []).map((r: any) => {
    const m = r.militares || {};
    return {
      escala_id: r.id,
      militar_id: r.militar_id,
      matricula: m.matricula,
      posto_graduacao: m.posto_graduacao,
      nome_guerra: m.nome_guerra,
      funcao_na_guarnicao: r.funcao_na_guarnicao,
      carga_horaria_horas: r.carga_horaria_horas,
      inicio_turno: r.inicio_turno,
      fim_turno: r.fim_turno,
      is_cg: Boolean(r.is_cg),
    };
  });
}

/**
 * Chama a RPC 'fn_import_escala_e193' no Postgres (Exclusivo COBOM)
 */
export async function importEscalaE193Rpc(entries: E193ImportEntry[]): Promise<E193ImportResult> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');
  if (!entries || entries.length === 0) {
    throw new Error('Nenhum registro para importar.');
  }

  // Prepara payload estritamente compatível com jsonb p_entries
  const payloadEntries = entries.map(e => ({
    platoon_name: e.platoon_name,
    platoon_bbm: e.platoon_bbm,
    platoon_headquarters: e.platoon_headquarters,
    call_sign: e.call_sign,
    matricula: e.matricula,
    posto_graduacao: e.posto_graduacao,
    nome_guerra: e.nome_guerra,
    funcao_na_guarnicao: e.funcao_na_guarnicao,
    carga_horaria_horas: e.carga_horaria_horas,
    inicio_turno: e.inicio_turno,
    fim_turno: e.fim_turno,
  }));

  const { data, error } = await supabase.rpc('fn_import_escala_e193', {
    p_entries: payloadEntries,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('COBOM') || msg.includes('perfil') || msg.includes('permission') || msg.includes('denied')) {
      throw new Error('Apenas operadores com perfil COBOM possuem autorização para importar a escala de serviço.');
    }
    throw new Error(`Falha ao importar escala e-193: ${msg}`);
  }

  return (data || { linhas_importadas: 0, militares_criados: 0, guarnicoes_afetadas: 0 }) as E193ImportResult;
}

/**
 * Chama a RPC 'fn_editar_cg_manual' no Postgres (Exclusivo COBOM)
 */
export async function editarCgManualRpc(escalaId: string, novoMilitarCgId: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado.');
  if (!escalaId || !novoMilitarCgId) {
    throw new Error('Identificadores de escala e do novo CG são obrigatórios.');
  }

  const { error } = await supabase.rpc('fn_editar_cg_manual', {
    p_escala_id: escalaId,
    p_novo_militar_cg_id: novoMilitarCgId,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('COBOM') || msg.includes('perfil') || msg.includes('permission') || msg.includes('denied')) {
      throw new Error('Apenas operadores com perfil COBOM possuem autorização para alterar o Comandante de Guarnição.');
    }
    throw new Error(`Falha ao alterar Comandante de Guarnição manualmente: ${msg}`);
  }
}

/**
 * Busca histórico da tabela 'escalas_servico_auditoria'
 */
export async function fetchEscalasAuditoria(escalaId?: string): Promise<EscalaAuditoriaEntry[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    let query = supabase
      .from('escalas_servico_auditoria')
      .select('id, escala_id, campo, valor_anterior, valor_novo, origem, alterado_por, alterado_em')
      .order('alterado_em', { ascending: false })
      .limit(50);

    if (escalaId) {
      query = query.eq('escala_id', escalaId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Aviso ao consultar escalas_servico_auditoria:', error.message);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      escala_id: r.escala_id,
      campo: r.campo,
      valor_anterior: r.valor_anterior,
      valor_novo: r.valor_novo,
      origem: r.origem,
      alterado_por: r.alterado_por,
      alterado_em: r.alterado_em,
    }));
  } catch (err) {
    console.warn('Erro ao carregar auditoria de escala:', err);
    return [];
  }
}

