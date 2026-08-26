import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  Occurrence, 
  AttendanceRecord, 
  OccurrencePhoto, 
  Squad, 
  Platoon, 
  AppNotification 
} from '../types';

/**
 * Mapper: Converte objeto Occurrence (TypeScript) para a linha da tabela 'ocorrencias' no Supabase
 */
export function mapOccurrenceToSupabase(occ: Occurrence) {
  return {
    id: occ.id,
    protocolo: occ.protocol,
    solicitante_nome: occ.solicitorName,
    solicitante_telefone: occ.solicitorPhone,
    endereco: occ.address,
    bairro: occ.neighborhood,
    cidade: occ.city,
    ponto_referencia: occ.referencePoint || null,
    latitude: occ.latitude,
    longitude: occ.longitude,
    descricao: occ.description,
    tipo: occ.type,
    natureza_despacho: occ.dispatchNature,
    risco_arvore: occ.treeRisk,
    pelotao_id: occ.platoonId,
    guarnicao_empenhada_id: occ.assignedSquadId,
    status: occ.status,
    urgencia: occ.urgency,
    transitada_turno: occ.isCarriedOver,
    criado_por: occ.openedBy,
    created_at: occ.createdAt,
    updated_at: occ.updatedAt,
    // JSON com fotos e atendimentos para manter histórico e robustez
    initial_photos: occ.initialPhotos,
    attendances: occ.attendances,
  };
}

/**
 * Mapper: Converte linha do Supabase para o objeto Occurrence no frontend
 */
export function mapSupabaseToOccurrence(row: any): Occurrence {
  return {
    id: row.id,
    protocol: row.protocolo || row.protocol || `CBMRS-${row.id}`,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    initialRequestDate: row.initial_request_date || row.initialRequestDate,
    openedBy: row.criado_por || row.openedBy || 'COBOM 193',
    solicitorName: row.solicitante_nome || row.solicitorName || '',
    solicitorPhone: row.solicitante_telefone || row.solicitorPhone || '',
    address: row.endereco || row.address || '',
    neighborhood: row.bairro || row.neighborhood || '',
    city: row.cidade || row.city || 'Santa Maria',
    referencePoint: row.ponto_referencia || row.referencePoint || '',
    latitude: typeof row.latitude === 'number' ? row.latitude : -29.6842,
    longitude: typeof row.longitude === 'number' ? row.longitude : -53.8069,
    description: row.descricao || row.description || '',
    type: row.tipo || row.type || 'CORTE_ARVORE',
    dispatchNature: row.natureza_despacho || row.dispatchNature || 'Corte de árvore: árvore na via, interdição parcial',
    treeRisk: row.risco_arvore || row.treeRisk || 'QUEDA_SOBRE_VIA_PUBLICA',
    platoonId: row.pelotao_id || row.platoonId || 'plat-1',
    assignedSquadId: row.guarnicao_empenhada_id || row.assignedSquadId || 'squad-abt-1496',
    status: row.status || 'ABERTA',
    urgency: row.urgencia || row.urgency || 'MEDIA',
    initialPhotos: Array.isArray(row.initial_photos) ? row.initial_photos : (row.initialPhotos || []),
    attendances: Array.isArray(row.attendances) ? row.attendances : [],
    isCarriedOver: Boolean(row.transitada_turno ?? row.isCarriedOver),
    totalAttendancesCount: Array.isArray(row.attendances) ? row.attendances.length : (row.totalAttendancesCount || 0),
    lastAttendanceAt: row.last_attendance_at || row.lastAttendanceAt,
  };
}

/**
 * Busca ocorrências do Supabase
 */
export async function fetchOccurrencesFromSupabase(): Promise<Occurrence[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('ocorrencias')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Aviso ao consultar ocorrências no Supabase:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map(mapSupabaseToOccurrence);
    }
    return [];
  } catch (err) {
    console.error('Erro na conexão com Supabase para ocorrências:', err);
    return null;
  }
}

/**
 * Salva uma nova ocorrência no Supabase
 */
export async function insertOccurrenceToSupabase(occ: Occurrence): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const payload = mapOccurrenceToSupabase(occ);
    const { error } = await supabase
      .from('ocorrencias')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Erro ao inserir ocorrência no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha ao enviar ocorrência ao Supabase:', err);
    return false;
  }
}

/**
 * Atualiza uma ocorrência no Supabase
 */
export async function updateOccurrenceInSupabase(occ: Occurrence): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const payload = mapOccurrenceToSupabase(occ);
    const { error } = await supabase
      .from('ocorrencias')
      .update(payload)
      .eq('id', occ.id);

    if (error) {
      console.warn('Erro ao atualizar ocorrência no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha ao atualizar ocorrência no Supabase:', err);
    return false;
  }
}

/**
 * Registra atendimento no Supabase (em 'atendimentos' e atualiza 'ocorrencias')
 */
export async function recordAttendanceInSupabase(
  occurrenceId: string,
  record: AttendanceRecord,
  updatedOcc: Occurrence
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    // 1. Inserir na tabela 'atendimentos'
    const atendimentoPayload = {
      id: record.id,
      ocorrencia_id: occurrenceId,
      guarnicao_id: record.squadId,
      guarnicao_nome: record.squadName,
      prefixo_vtr: record.callSign,
      comandante_nome: record.commanderName,
      turno_info: record.shiftInfo,
      data_inicio: record.startedAt,
      data_fim: record.finishedAt,
      resultado_status: record.statusResult,
      acao_tomada: record.actionTaken,
      motivo_pendencia: record.unresolvedReason || null,
      detalhes_pendencia: record.unresolvedDetails || null,
      equipamentos_usados: record.equipmentUsed || [],
    };

    const { error: attError } = await supabase
      .from('atendimentos')
      .upsert(atendimentoPayload, { onConflict: 'id' });

    if (attError) {
      console.warn('Aviso ao registrar atendimento no Supabase:', attError.message);
    }

    // 2. Atualizar ocorrência correspondente
    await updateOccurrenceInSupabase(updatedOcc);
    return true;
  } catch (err) {
    console.error('Erro ao sincronizar atendimento no Supabase:', err);
    return false;
  }
}

/**
 * Upload de Foto para o Supabase Storage (Bucket 'fotos-ocorrencias')
 */
export async function uploadPhotoToSupabaseStorage(
  photoId: string,
  base64Data: string,
  occurrenceId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    // Remove header Base64 se presente
    const base64Content = base64Data.includes('base64,')
      ? base64Data.split('base64,')[1]
      : base64Data;

    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const filePath = `ocorrencias/${occurrenceId}/${photoId}.jpg`;

    const { data, error } = await supabase.storage
      .from('fotos-ocorrencias')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.warn('Aviso no upload para Supabase Storage:', error.message);
      return null;
    }

    // Obter URL pública ou assinada
    const { data: publicUrlData } = supabase.storage
      .from('fotos-ocorrencias')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn('Fallback: mantendo foto em armazenamento local rápido:', err);
    return null;
  }
}

/**
 * Exclui uma ocorrência no Supabase (e seus atendimentos cascateados)
 */
export async function deleteOccurrenceFromSupabase(occurrenceId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    // 1. Remove atendimentos vinculados
    await supabase
      .from('atendimentos')
      .delete()
      .eq('ocorrencia_id', occurrenceId);

    // 2. Remove ocorrência
    const { error } = await supabase
      .from('ocorrencias')
      .delete()
      .eq('id', occurrenceId);

    if (error) {
      console.warn('Erro ao excluir ocorrência no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha ao excluir ocorrência no Supabase:', err);
    return false;
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.warn('Realtime subscription não inicializado:', e);
    return () => {};
  }
}
