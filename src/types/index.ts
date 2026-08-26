export type UserRole = 'COBOM' | 'GUARNICAO' | 'PELOTAO';

export type OccurrenceStatus = 'ABERTA' | 'EM_ATENDIMENTO' | 'CONCLUIDA' | 'PENDENTE';

export type OccurrenceUrgency = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type OccurrenceType = 
  | 'CORTE_ARVORE' 
  | 'VISTORIA_RISCO' 
  | 'PODA_EMERGENCIAL' 
  | 'REMOCAO_GALHO_FIACAO' 
  | 'DESOBSTRUCAO_VIA';

// 16 Natures oficiais do CBMRS para despacho de Corte e Vistoria de Árvores
export const OFFICIAL_TREE_DISPATCH_NATURES = [
  'Corte de árvore: árvore na via, interdição parcial',
  'Corte de árvore: árvore na via, interdição total',
  'Corte de árvore: árvore em escola',
  'Corte de árvore: árvore em residência, galhos caídos de grande porte',
  'Corte de árvore: árvore em residência, galhos caídos de pequeno porte',
  'Corte de árvore: risco de queda em residência',
  'Corte de árvore: árvores em fiação de alta tensão',
  'Corte de árvore: árvores em fiação de baixa tensão',
  'Corte de árvore: árvore em área de risco',
  'Corte de árvore: poda preventiva em área pública',
  'Corte de árvore: árvore em parque municipal',
  'Corte de árvore: galhos em telhado de residência',
  'Corte de árvore: galhos em telhado comercial',
  'Corte de árvore: árvore bloqueando acesso a hospital',
  'Corte de árvore: árvore bloqueando linha de trem',
  'Vistoria vegetal: árvore com risco de queda'
] as const;

export type TreeDispatchNature = typeof OFFICIAL_TREE_DISPATCH_NATURES[number];

export type TreeRiskType = 
  | 'QUEDA_SOBRE_RESIDENCIA' 
  | 'QUEDA_SOBRE_VIA_PUBLICA' 
  | 'GALHO_SOBRE_FIACAO_ENERGIZADA' 
  | 'RAIZ_EXPOSTA_INSTAVEL' 
  | 'ARVORE_OCA_PODRE' 
  | 'VISTORIA_PREVENTIVA_SOLICITADA';

export type UnresolvedReason = 
  | 'FALTA_EQUIPAMENTO_ESPECIFICO'
  | 'ARVORE_GRANDE_PORTE_GUINDASTE'
  | 'NECESSIDADE_APOIO_CEEE_EQUATORIAL'
  | 'CONDICAO_CLIMATICA_TEMPESTADE'
  | 'AUTORIZACAO_AMBIENTAL_PENDENTE'
  | 'ACESSO_BLOQUEADO_IMPOSSIBILITADO'
  | 'OUTRO';

export interface User {
  id: string;
  name: string;
  rank: string; // Posto/Graduação (ex: "1º Ten QOEG", "1º Sgt", "Cb", "Sd")
  role: UserRole;
  platoonId: string;
  squadId?: string;
  registrationNumber: string; // Matrícula
  avatarUrl?: string;
}

export interface Platoon {
  id: string;
  name: string;
  bbm: string; // Batalhão de Bombeiro Militar (ex: "4º BBM - Santa Maria")
  headquarters: string;
  commanderName: string;
}

export interface SquadMember {
  registrationNumber: string; // Matrícula
  name: string; // Posto/Graduação e Nome (ex: "1º SGT BRUM")
  roleInSquad: string; // ex: "COMANDANTE DE GUARNIÇÃO", "COV / OPERADOR / CONDUTOR"
  shiftHours: number; // 12 ou 24
  shiftStart: string;
  shiftEnd: string;
}

export interface Squad {
  id: string;
  name: string;
  callSign: string; // Prefixo da viatura (ex: "ABT-1496", "ABC-794", "ABT-1238", "ABT-534", "ATP-0561", "COBOM-SM")
  unitText?: string; // ex: "4º BBM / 1ª CIA / 1º PEL / SANTA MARIA"
  platoonId: string;
  commanderName: string;
  currentShift: string; // ex: "Turno 24h (25/08/2026 08:00 às 26/08/2026 08:00)"
  status: 'DISPONIVEL' | 'EM_OCORRENCIA' | 'MANUTENCAO';
  activeMembersCount: number;
  members?: SquadMember[];
}

export interface OccurrencePhoto {
  id: string;
  attendanceId?: string;
  occurrenceId: string;
  url: string;
  caption?: string;
  uploadedAt: string;
  uploadedBySquadName: string;
  stage: 'INICIAL_COBOM' | 'DURANTE_ATENDIMENTO' | 'FINALIZACAO';
}

export interface AttendanceRecord {
  id: string;
  occurrenceId: string;
  squadId: string;
  squadName: string;
  callSign: string;
  commanderName: string;
  shiftInfo: string;
  startedAt: string;
  finishedAt: string;
  statusResult: 'CONCLUIDA' | 'PENDENTE';
  actionTaken: string;
  unresolvedReason?: UnresolvedReason;
  unresolvedDetails?: string;
  equipmentUsed: string[];
  photos: OccurrencePhoto[];
}

export interface Occurrence {
  id: string;
  protocol: string; // ex: "CBMRS-2026-00482"
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  initialRequestDate?: string; // Data da 1ª Solicitação pelo solicitante (ex: "2026-08-25T08:00")
  openedBy: string; // Operador COBOM
  solicitorName: string;
  solicitorPhone: string;
  address: string;
  neighborhood: string;
  city: string;
  referencePoint?: string;
  latitude: number;
  longitude: number;
  description: string;
  type: OccurrenceType;
  dispatchNature: string; // Uma das 16 opções oficiais de despacho (ex: "Corte de árvore: árvore na via, interdição total")
  treeRisk: TreeRiskType;
  platoonId: string;
  assignedSquadId: string;
  status: OccurrenceStatus;
  urgency: OccurrenceUrgency;
  initialPhotos: OccurrencePhoto[];
  attendances: AttendanceRecord[];
  isCarriedOver: boolean; // Se veio de turno anterior
  totalAttendancesCount: number;
  lastAttendanceAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 
    | 'STATUS_CHANGE' 
    | 'PENDING_ALERT_12H' 
    | 'PENDING_ALERT_24H' 
    | 'NEW_OCCURRENCE' 
    | 'SHIFT_HANDOVER' 
    | 'CRITICAL_UNRESOLVED';
  occurrenceId: string;
  occurrenceProtocol: string;
  targetRoles: UserRole[];
  targetSquadId?: string;
  targetPlatoonId?: string;
  createdAt: string;
  isRead: boolean;
}

export interface OccurrenceFilters {
  status: OccurrenceStatus | 'TODOS';
  urgency: OccurrenceUrgency | 'TODOS';
  platoonId: string | 'TODOS';
  squadId: string | 'TODOS';
  searchQuery: string;
  onlyCarriedOver: boolean;
  onlyPendingAlert: boolean;
  dateRange: 'TODOS' | 'HOJE' | 'ULTIMAS_24H' | 'ULTIMOS_7D';
}
