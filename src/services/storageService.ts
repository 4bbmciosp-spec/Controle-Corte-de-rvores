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

const STORAGE_KEYS = {
  OCCURRENCES: 'cbmrs_arvores_occurrences_v3_sm',
  PLATOONS: 'cbmrs_arvores_platoons_v3_sm',
  SQUADS: 'cbmrs_arvores_squads_v3_sm',
  USERS: 'cbmrs_arvores_users_v3_sm',
  NOTIFICATIONS: 'cbmrs_arvores_notifications_v3_sm',
  CURRENT_USER_ID: 'cbmrs_arvores_current_user_v3_sm',
  RAW_E193: 'cbmrs_arvores_raw_e193_v3_sm'
};

// Seed Platoons do 4º BBM - Santa Maria
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

// Seed Squads do e-193 Santa Maria (Sem nomes pessoais)
export const SEED_SQUADS: Squad[] = [
  {
    id: 'squad-abt-1496',
    name: 'ABT-1496 (1º Pelotão Centro)',
    callSign: 'ABT-1496',
    unitText: '4º BBM / 1ª CIA / 1º PEL / SANTA MARIA',
    platoonId: 'plat-1',
    commanderName: 'Comandante da VTR',
    currentShift: 'Turno 24h (08:00 às 08:00)',
    status: 'EM_OCORRENCIA',
    activeMembersCount: 4,
    members: [
      { registrationNumber: 'FUN-01', name: 'Comandante de Guarnição', roleInSquad: 'COMANDANTE DE GUARNIÇÃO', shiftHours: 24, shiftStart: '08:00', shiftEnd: '08:00' },
      { registrationNumber: 'FUN-02', name: 'Chefe de Linha / Operador', roleInSquad: 'CHEFE DE LINHA DIREITA', shiftHours: 24, shiftStart: '08:00', shiftEnd: '08:00' },
      { registrationNumber: 'FUN-03', name: 'Auxiliar de Linha / Motosserra', roleInSquad: 'AUXILIAR DE LINHA DIREITA', shiftHours: 24, shiftStart: '08:00', shiftEnd: '08:00' },
      { registrationNumber: 'FUN-04', name: 'Condutor e Operador de VTR (COV)', roleInSquad: 'COV / OPERADOR / CONDUTOR', shiftHours: 24, shiftStart: '08:00', shiftEnd: '08:00' }
    ]
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
    members: [
      { registrationNumber: 'FUN-01', name: 'Condutor e Operador de VTR (COV)', roleInSquad: 'COV / OPERADOR / CONDUTOR', shiftHours: 24, shiftStart: '08:00', shiftEnd: '08:00' },
      { registrationNumber: 'FUN-02', name: 'Comandante de Guarnição', roleInSquad: 'COMANDANTE DE GUARNIÇÃO', shiftHours: 24, shiftStart: '08:00', shiftEnd: '08:00' },
      { registrationNumber: 'FUN-03', name: 'Chefe de Linha / Motosserra', roleInSquad: 'CHEFE DE LINHA ESQUERDA', shiftHours: 24, shiftStart: '08:00', shiftEnd: '08:00' }
    ]
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
    members: [
      { registrationNumber: 'FUN-01', name: 'Comandante de Guarnição', roleInSquad: 'COMANDANTE DE GUARNIÇÃO', shiftHours: 12, shiftStart: '07:00', shiftEnd: '19:00' },
      { registrationNumber: 'FUN-02', name: 'Socorrista / Operador de Salvamento', roleInSquad: 'RESGATISTA', shiftHours: 12, shiftStart: '07:00', shiftEnd: '19:00' },
      { registrationNumber: 'FUN-03', name: 'Condutor e Operador de VTR (COV)', roleInSquad: 'COV / OPERADOR / CONDUTOR', shiftHours: 12, shiftStart: '07:00', shiftEnd: '19:00' }
    ]
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
    members: [
      { registrationNumber: 'FUN-01', name: 'Condutor e Operador de VTR (COV)', roleInSquad: 'COV / OPERADOR / CONDUTOR', shiftHours: 12, shiftStart: '08:00', shiftEnd: '20:00' },
      { registrationNumber: 'FUN-02', name: 'Comandante de Guarnição', roleInSquad: 'COMANDANTE DE GUARNIÇÃO', shiftHours: 12, shiftStart: '08:00', shiftEnd: '20:00' }
    ]
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
    members: [
      { registrationNumber: 'FUN-01', name: 'Comandante de Guarnição', roleInSquad: 'COMANDANTE DE GUARNIÇÃO', shiftHours: 12, shiftStart: '19:00', shiftEnd: '07:00' },
      { registrationNumber: 'FUN-02', name: 'Condutor e Operador de VTR (COV)', roleInSquad: 'COV / OPERADOR / CONDUTOR', shiftHours: 12, shiftStart: '19:00', shiftEnd: '07:00' }
    ]
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
    members: [
      { registrationNumber: 'FUN-01', name: 'Operador Despachador 193', roleInSquad: 'OPERADOR COBOM', shiftHours: 24, shiftStart: '08:00', shiftEnd: '08:00' },
      { registrationNumber: 'FUN-02', name: 'Operador Atendente 193', roleInSquad: 'OPERADOR COBOM', shiftHours: 12, shiftStart: '08:00', shiftEnd: '20:00' }
    ]
  }
];

// Seed Users identificados pelas Viaturas e Postos Operacionais (sem nomes de pessoas)
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
    id: 'user-guarnicao-abt-1238',
    name: 'Guarnição ABT-1238',
    rank: '1º Pelotão (Centro)',
    role: 'GUARNICAO',
    platoonId: 'plat-1',
    squadId: 'squad-abt-1238',
    registrationNumber: 'ABT-1238',
  },
  {
    id: 'user-guarnicao-atp-0561',
    name: 'Guarnição ATP-0561',
    rank: '2º Pelotão (P. Machado)',
    role: 'GUARNICAO',
    platoonId: 'plat-2',
    squadId: 'squad-atp-0561',
    registrationNumber: 'ATP-0561',
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

// Helper de tempo relativo
const now = new Date();
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

// Seed de Ocorrências em Santa Maria - RS (4º BBM)
export const SEED_OCCURRENCES: Occurrence[] = [
  {
    id: 'occ-sm-1',
    protocol: 'CBMRS-2026-00482',
    createdAt: hoursAgo(18), // 18h atrás (Pendente transitada de turno)
    updatedAt: hoursAgo(14),
    openedBy: 'COBOM - 2º Sgt Giovani (Ramal 193 Santa Maria)',
    solicitorName: 'Dona Maria Helena Castro',
    solicitorPhone: '(55) 99872-4411',
    address: 'Av. Rio Branco, 450',
    neighborhood: 'Centro',
    city: 'Santa Maria',
    referencePoint: 'Próximo à esquina com Rua Silva Jardim e Catedral',
    latitude: -29.6834,
    longitude: -53.8062,
    description: 'Eucalipto de grande porte tombado sobre a rede de média tensão e muro residencial após vendaval.',
    type: 'CORTE_ARVORE',
    dispatchNature: 'Corte de árvore: árvores em fiação de alta tensão',
    treeRisk: 'GALHO_SOBRE_FIACAO_ENERGIZADA',
    platoonId: 'plat-1',
    assignedSquadId: 'squad-abt-1496',
    status: 'PENDENTE',
    urgency: 'ALTA',
    isCarriedOver: true,
    totalAttendancesCount: 1,
    lastAttendanceAt: hoursAgo(14),
    initialPhotos: [
      {
        id: 'photo-sm-1',
        occurrenceId: 'occ-sm-1',
        url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
        caption: 'Foto do chamado 193: Árvore apoiada sobre fiação energizada na Av. Rio Branco',
        uploadedAt: hoursAgo(18),
        uploadedBySquadName: 'COBOM-SM / Solicitante',
        stage: 'INICIAL_COBOM'
      }
    ],
    attendances: [
      {
        id: 'att-sm-1',
        occurrenceId: 'occ-sm-1',
        squadId: 'squad-abt-1238',
        squadName: 'ABT-1238 (1º Pelotão Santa Maria)',
        callSign: 'ABT-1238',
        commanderName: '2º SGT SILVA PAZ',
        shiftInfo: 'Turno Anterior (24h encerrado às 08:00)',
        startedAt: hoursAgo(16),
        finishedAt: hoursAgo(14),
        statusResult: 'PENDENTE',
        actionTaken: 'Guarnição isolou o perímetro com cones e fita zebrada. Constatou-se fiação energizada em contato direto com os galhos mestres.',
        unresolvedReason: 'NECESSIDADE_APOIO_CEEE_EQUATORIAL',
        unresolvedDetails: 'Aguardando desligamento e isolamento da rede pela RGE/Equatorial (Protocolo RGE-948201). Ocorrência repassada com prioridade para a guarnição do novo turno.',
        equipmentUsed: ['Fita Zebrada', 'Detectores de Tensão', 'Cones de Trânsito'],
        photos: []
      }
    ]
  },
  {
    id: 'occ-sm-2',
    protocol: 'CBMRS-2026-00489',
    createdAt: hoursAgo(28), // 28 horas atrás (> 24h sem solução!)
    updatedAt: hoursAgo(22),
    openedBy: 'COBOM - Sd Douglas',
    solicitorName: 'Prof. Antônio Carlos Silveira (Diretor)',
    solicitorPhone: '(55) 98144-9988',
    address: 'Av. Roraima, 1000',
    neighborhood: 'Camobi',
    city: 'Santa Maria',
    referencePoint: 'Em frente à Escola Estadual e Acesso UFSM',
    latitude: -29.7138,
    longitude: -53.7175,
    description: 'Tipuana de porte avantajado com fenda no tronco principal com risco de queda sobre o pátio de recreio escolar e calçada.',
    type: 'CORTE_ARVORE',
    dispatchNature: 'Corte de árvore: árvore em escola',
    treeRisk: 'QUEDA_SOBRE_VIA_PUBLICA',
    platoonId: 'plat-3',
    assignedSquadId: 'squad-abt-534',
    status: 'PENDENTE',
    urgency: 'CRITICA',
    isCarriedOver: true,
    totalAttendancesCount: 1,
    lastAttendanceAt: hoursAgo(22),
    initialPhotos: [],
    attendances: [
      {
        id: 'att-sm-2',
        occurrenceId: 'occ-sm-2',
        squadId: 'squad-abt-534',
        squadName: 'ABT-534 (3º Pelotão Camobi)',
        callSign: 'ABT-534',
        commanderName: '1º SGT TATIELI',
        shiftInfo: 'Turno de ontem',
        startedAt: hoursAgo(24),
        finishedAt: hoursAgo(22),
        statusResult: 'PENDENTE',
        actionTaken: 'Isolamento da área de recreio escolar. Avaliado que a altura do galho estrutural (>15m) exige equipamento de corte em altura.',
        unresolvedReason: 'ARVORE_GRANDE_PORTE_GUINDASTE',
        unresolvedDetails: 'Necessário apoio de caminhão cesto aéreo / Auto Escada para amarração e descida controlada por seções sem danificar o telhado do pavilhão escolar.',
        equipmentUsed: ['Fita Métrica', 'EPI de Altura', 'Motosserra MS-260'],
        photos: []
      }
    ]
  },
  {
    id: 'occ-sm-3',
    protocol: 'CBMRS-2026-00495',
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(1),
    openedBy: 'COBOM - 2º Sgt Giovani',
    solicitorName: 'Carlos Eduardo Nogueira',
    solicitorPhone: '(55) 99123-7766',
    address: 'Av. Presidente Vargas, 1850',
    neighborhood: 'Patronato',
    city: 'Santa Maria',
    referencePoint: 'Próximo ao Ginásio do Patronato',
    latitude: -29.6958,
    longitude: -53.8241,
    description: 'Árvore caiu atravessada na pista durante vento forte, interrompendo o fluxo nos dois sentidos da avenida.',
    type: 'DESOBSTRUCAO_VIA',
    dispatchNature: 'Corte de árvore: árvore na via, interdição total',
    treeRisk: 'QUEDA_SOBRE_VIA_PUBLICA',
    platoonId: 'plat-1',
    assignedSquadId: 'squad-abt-1496',
    status: 'EM_ATENDIMENTO',
    urgency: 'CRITICA',
    isCarriedOver: false,
    totalAttendancesCount: 0,
    initialPhotos: [
      {
        id: 'photo-sm-3',
        occurrenceId: 'occ-sm-3',
        url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80',
        caption: 'Tronco bloqueando integralmente o tráfego da Presidente Vargas',
        uploadedAt: hoursAgo(2),
        uploadedBySquadName: 'COBOM-SM',
        stage: 'INICIAL_COBOM'
      }
    ],
    attendances: []
  },
  {
    id: 'occ-sm-4',
    protocol: 'CBMRS-2026-00498',
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
    openedBy: 'COBOM - Sd Lutiero',
    solicitorName: 'Juliana Beatriz Soares',
    solicitorPhone: '(55) 98765-1234',
    address: 'Rua Duque de Caxias, 820',
    neighborhood: 'Medianeira',
    city: 'Santa Maria',
    referencePoint: 'Próximo à Basílica da Medianeira',
    latitude: -29.6912,
    longitude: -53.8115,
    description: 'Árvore antiga na calçada com raízes estufando o calçamento e tronco oco com inclinação perigosa.',
    type: 'VISTORIA_RISCO',
    dispatchNature: 'Vistoria vegetal: árvore com risco de queda',
    treeRisk: 'ARVORE_OCA_PODRE',
    platoonId: 'plat-1',
    assignedSquadId: 'squad-abt-1238',
    status: 'ABERTA',
    urgency: 'MEDIA',
    isCarriedOver: false,
    totalAttendancesCount: 0,
    initialPhotos: [],
    attendances: []
  },
  {
    id: 'occ-sm-5',
    protocol: 'CBMRS-2026-00475',
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(6),
    openedBy: 'COBOM - 2º Sgt Giovani',
    solicitorName: 'Marcos Vinícius Terra',
    solicitorPhone: '(55) 99344-5566',
    address: 'Rua Venâncio Aires, 2100',
    neighborhood: 'Passo d\'Areia',
    city: 'Santa Maria',
    referencePoint: 'Esquina com Rua Visconde de Pelotas',
    latitude: -29.6881,
    longitude: -53.8193,
    description: 'Galhos de grande porte quebrados apoiados sobre a cobertura e calha de residência de alvenaria.',
    type: 'CORTE_ARVORE',
    dispatchNature: 'Corte de árvore: galhos em telhado de residência',
    treeRisk: 'QUEDA_SOBRE_RESIDENCIA',
    platoonId: 'plat-1',
    assignedSquadId: 'squad-abt-1496',
    status: 'CONCLUIDA',
    urgency: 'ALTA',
    isCarriedOver: true,
    totalAttendancesCount: 2,
    lastAttendanceAt: hoursAgo(6),
    initialPhotos: [],
    attendances: [
      {
        id: 'att-sm-5-1',
        occurrenceId: 'occ-sm-5',
        squadId: 'squad-abt-1238',
        squadName: 'ABT-1238 (1º Pelotão Santa Maria)',
        callSign: 'ABT-1238',
        commanderName: '2º SGT SILVA PAZ',
        shiftInfo: 'Turno de 48h atrás',
        startedAt: daysAgo(2),
        finishedAt: daysAgo(2),
        statusResult: 'PENDENTE',
        actionTaken: 'Vistoriado o imóvel e feito desbaste inicial. Chuva torrencial impediu trabalho em altura com segurança.',
        unresolvedReason: 'CONDICAO_CLIMATICA_TEMPESTADE',
        unresolvedDetails: 'Rajadas de vento de 65km/h e telhado molhado muito escorregadio.',
        equipmentUsed: ['Motosserra MS-260', 'Corda Estática', 'EPI Florestal'],
        photos: []
      },
      {
        id: 'att-sm-5-2',
        occurrenceId: 'occ-sm-5',
        squadId: 'squad-abt-1496',
        squadName: 'ABT-1496 (1º Pelotão Santa Maria)',
        callSign: 'ABT-1496',
        commanderName: '1º SGT GONÇALVES',
        shiftInfo: 'Turno Atual',
        startedAt: hoursAgo(9),
        finishedAt: hoursAgo(6),
        statusResult: 'CONCLUIDA',
        actionTaken: 'Retomada a ocorrência deixada pendente. Efetuado corte minucioso dos galhos em seções com tirolesa e descida suave. Telhado e moradia totalmente desimpedidos.',
        equipmentUsed: ['Motosserra MS-382', 'Cabos de Tração', 'Roldanas', 'Escada Prolongável'],
        photos: [
          {
            id: 'photo-sm-5-concl',
            attendanceId: 'att-sm-5-2',
            occurrenceId: 'occ-sm-5',
            url: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&auto=format&fit=crop&q=80',
            caption: 'Corte finalizado com sucesso no Passo d\'Areia',
            uploadedAt: hoursAgo(6),
            uploadedBySquadName: 'ABT-1496',
            stage: 'FINALIZACAO'
          }
        ]
      }
    ]
  },
  {
    id: 'occ-sm-6',
    protocol: 'CBMRS-2026-00501',
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(3),
    openedBy: 'COBOM - Sd Douglas',
    solicitorName: 'Felipe Camargo',
    solicitorPhone: '(55) 99654-3210',
    address: 'Av. Walter Jobim, 310',
    neighborhood: 'Patronato',
    city: 'Santa Maria',
    referencePoint: 'Próximo ao Trevo do Castelinho',
    latitude: -29.6979,
    longitude: -53.8324,
    description: 'Galho de acácia quebrou e ocupa meia pista na faixa direita no sentido centro-bairro.',
    type: 'DESOBSTRUCAO_VIA',
    dispatchNature: 'Corte de árvore: árvore na via, interdição parcial',
    treeRisk: 'QUEDA_SOBRE_VIA_PUBLICA',
    platoonId: 'plat-2',
    assignedSquadId: 'squad-abc-794',
    status: 'ABERTA',
    urgency: 'ALTA',
    isCarriedOver: false,
    totalAttendancesCount: 0,
    initialPhotos: [],
    attendances: []
  },
  {
    id: 'occ-sm-7',
    protocol: 'CBMRS-2026-00504',
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(1),
    openedBy: 'COBOM - 2º Sgt Giovani',
    solicitorName: 'Dr. Roberto Lacerda',
    solicitorPhone: '(55) 99111-2233',
    address: 'Rodovia BR-287, Km 240',
    neighborhood: 'Pinheiro Machado',
    city: 'Santa Maria',
    referencePoint: 'Acesso ao Hospital Regional de Santa Maria',
    latitude: -29.7045,
    longitude: -53.8640,
    description: 'Árvore de grande porte caiu sobre a marginal de acesso das ambulâncias ao Hospital Regional.',
    type: 'CORTE_ARVORE',
    dispatchNature: 'Corte de árvore: árvore bloqueando acesso a hospital',
    treeRisk: 'QUEDA_SOBRE_VIA_PUBLICA',
    platoonId: 'plat-2',
    assignedSquadId: 'squad-atp-0561',
    status: 'EM_ATENDIMENTO',
    urgency: 'CRITICA',
    isCarriedOver: false,
    totalAttendancesCount: 0,
    initialPhotos: [],
    attendances: []
  }
];

// Seed Notifications
export const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-sm-1',
    title: '⚠️ Atenção: Ocorrência Pendente Transitada de Turno',
    message: 'A ocorrência CBMRS-2026-00482 (Av. Rio Branco - Centro) está pendente há 18h aguardando apoio da Equatorial/RGE. Guarnição ABT-1496 deve assumir o caso!',
    type: 'PENDING_ALERT_12H',
    occurrenceId: 'occ-sm-1',
    occurrenceProtocol: 'CBMRS-2026-00482',
    targetRoles: ['COBOM', 'GUARNICAO', 'PELOTAO'],
    targetSquadId: 'squad-abt-1496',
    createdAt: hoursAgo(2),
    isRead: false,
  },
  {
    id: 'notif-sm-2',
    title: '🚨 Alerta Crítico: Ocorrência Pendente há mais de 24 horas',
    message: 'CBMRS-2026-00489 (Av. Roraima - Escola em Camobi) requer apoio especializado e acompanhamento do Comando da 1ª Cia / 4º BBM.',
    type: 'PENDING_ALERT_24H',
    occurrenceId: 'occ-sm-2',
    occurrenceProtocol: 'CBMRS-2026-00489',
    targetRoles: ['PELOTAO', 'COBOM'],
    createdAt: hoursAgo(4),
    isRead: false,
  },
  {
    id: 'notif-sm-3',
    title: 'Nova Ocorrência Crítica Empenhada',
    message: 'COBOM-SM despachou ABT-1496 para corte emergencial na Av. Presidente Vargas (Interdição total de via).',
    type: 'NEW_OCCURRENCE',
    occurrenceId: 'occ-sm-3',
    occurrenceProtocol: 'CBMRS-2026-00495',
    targetRoles: ['GUARNICAO', 'COBOM'],
    targetSquadId: 'squad-abt-1496',
    createdAt: hoursAgo(2),
    isRead: true,
  }
];

export const INITIAL_E193_RAW_TEXT = `SANTA MARIA
4º BBM / 1ª CIA / 2º PEL BS/ P. PINHEIRO MACHADO
ABC-794 (4º BBM / 1ª CIA / 2º PEL BS/ P. PINHEIRO MACHADO)
2615690\t1º SGT BRUM\tCINOTÉCNICO\t12\t25/08/2026 07:00\t25/08/2026 19:00
2685094\t2º SGT MACHADO\tCINOTÉCNICO\t12\t25/08/2026 07:00\t25/08/2026 19:00
4674260\tSD ULLRICH\tCINOTÉCNICO\t12\t25/08/2026 07:00\t25/08/2026 19:00
4º BBM / 1ª CIA / 1º PEL / SANTA MARIA
ABT-1238 (4º BBM / 1ª CIA / 1º PEL / SANTA MARIA)
2682125\t2º SGT SILVA PAZ\tCOV / OPERADOR / CONDUTOR\t12\t25/08/2026 08:00\t25/08/2026 20:00
2877384\t2º SGT SIQUEIRA\tCOV / OPERADOR / CONDUTOR\t12\t25/08/2026 20:00\t26/08/2026 08:00
ABT-1496 (4º BBM / 1ª CIA / 1º PEL / SANTA MARIA)
2693038\t1º SGT GONÇALVES\tCOMANDANTE DE GUARNIÇÃO\t24\t25/08/2026 08:00\t26/08/2026 08:00
3140687\tSD EVANGELHO\tCHEFE DE LINHA DIREITA\t24\t25/08/2026 08:00\t26/08/2026 08:00
3706362\tSD GASTÃO\tAUXILIAR DE LINHA DIREITA\t24\t25/08/2026 08:00\t26/08/2026 08:00
4388240\tSD VIEIRA\tCOV / OPERADOR / CONDUTOR\t24\t25/08/2026 08:00\t26/08/2026 08:00
4º BBM / 1ª CIA / 3º PEL / CAMOBI
ABT-534 (4º BBM / 1ª CIA / 3º PEL / CAMOBI)
2519038\t1º SGT SCHUSTER\tCOV / OPERADOR / CONDUTOR\t24\t25/08/2026 08:00\t26/08/2026 08:00
3141551\t1º SGT TATIELI\tCHEFE DE LINHA DIREITA\t24\t25/08/2026 08:00\t26/08/2026 08:00
3705862\tSD REQUIA\tCHEFE DE LINHA ESQUERDA\t24\t25/08/2026 08:00\t26/08/2026 08:00
4º BBM / 1ª CIA / 2º PEL BS/ P. PINHEIRO MACHADO
ATP-0561 (4º BBM / 1ª CIA / 2º PEL BS/ P. PINHEIRO MACHADO)
3155331\t2º SGT VASCONCELLOS\tMERGULHADOR\t12\t25/08/2026 19:00\t26/08/2026 07:00
4º BBM / COBOM-SM
COBOM-SM (4º BBM / COBOM-SM)
3156079\t2º SGT GIOVANI\tOPERADOR COBOM\t24\t25/08/2026 08:00\t26/08/2026 08:00
3137341\tSD DOUGLAS\tOPERADOR COBOM\t12\t25/08/2026 08:00\t25/08/2026 20:00
3177360\tSD LUTIERO\tOPERADOR COBOM\t12\t25/08/2026 20:00\t26/08/2026 08:00`;

// Funções de Inicialização e Leitura/Escrita
export function getStoredOccurrences(): Occurrence[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OCCURRENCES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.OCCURRENCES, JSON.stringify(SEED_OCCURRENCES));
      return SEED_OCCURRENCES;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_OCCURRENCES;
  }
}

export function saveOccurrences(occurrences: Occurrence[]): void {
  localStorage.setItem(STORAGE_KEYS.OCCURRENCES, JSON.stringify(occurrences));
}

export function getStoredPlatoons(): Platoon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLATOONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PLATOONS, JSON.stringify(SEED_PLATOONS));
      return SEED_PLATOONS;
    }
    return JSON.parse(raw);
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
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SQUADS, JSON.stringify(SEED_SQUADS));
      return SEED_SQUADS;
    }
    return JSON.parse(raw);
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
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    const parsed: User[] = JSON.parse(raw);
    // If parsed users contain old personal names, normalize to clean operational profiles
    const hasPersonalNames = parsed.some(u => 
      u.name.toLowerCase().includes('tatieli') || 
      u.name.toLowerCase().includes('gonçalves') || 
      u.name.toLowerCase().includes('giovani') || 
      u.name.toLowerCase().includes('medeiros') ||
      u.rank.includes('1º Sgt') || 
      u.rank.includes('2º Sgt') || 
      u.rank.includes('Cap QOEM')
    );
    if (hasPersonalNames) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    return parsed;
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
  if (found) return found;
  return users[0] || SEED_USERS[0];
}

export function setCurrentUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
}

export function getStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
      return SEED_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_NOTIFICATIONS;
  }
}

export function saveNotifications(notifs: AppNotification[]): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
}

export function getStoredRawE193(): string {
  return localStorage.getItem(STORAGE_KEYS.RAW_E193) || INITIAL_E193_RAW_TEXT;
}

export function saveStoredRawE193(text: string): void {
  localStorage.setItem(STORAGE_KEYS.RAW_E193, text);
}

/**
 * Intelligent parser for raw e-193 scale text
 */
export function parseAndRegisterE193Roster(rawText: string): { squads: Squad[]; users: User[]; platoons: Platoon[] } {
  saveStoredRawE193(rawText);
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const platoonsMap = new Map<string, Platoon>();
  const squadsMap = new Map<string, Squad>();
  const usersList: User[] = [];

  // Initialize base platoons from seed
  SEED_PLATOONS.forEach(p => platoonsMap.set(p.id, p));

  let currentPlatoonId = 'plat-1';
  let currentUnitText = '4º BBM / 1ª CIA / 1º PEL / SANTA MARIA';
  let currentSquad: Squad | null = null;

  for (const line of lines) {
    if (line.toUpperCase() === 'SANTA MARIA') continue;

    // Detect Platoon header
    if (line.includes('4º BBM') && !line.includes('(') && !line.match(/^\d{6,8}/)) {
      currentUnitText = line;
      if (line.includes('1º PEL')) {
        currentPlatoonId = 'plat-1';
      } else if (line.includes('2º PEL')) {
        currentPlatoonId = 'plat-2';
      } else if (line.includes('3º PEL') || line.includes('CAMOBI')) {
        currentPlatoonId = 'plat-3';
      } else if (line.includes('COBOM')) {
        currentPlatoonId = 'plat-cobom';
      }
      continue;
    }

    // Detect Vehicle Header: e.g. "ABT-1496 (4º BBM / 1ª CIA / 1º PEL / SANTA MARIA)" or "ABC-794 (...)"
    const vehicleHeaderMatch = line.match(/^([A-Z0-9\-]+)\s*\((.*?)\)$/i);
    if (vehicleHeaderMatch) {
      const callSign = vehicleHeaderMatch[1].trim();
      const unit = vehicleHeaderMatch[2].trim();
      currentUnitText = unit;

      let platId = currentPlatoonId;
      if (unit.includes('1º PEL')) platId = 'plat-1';
      else if (unit.includes('2º PEL')) platId = 'plat-2';
      else if (unit.includes('3º PEL') || unit.includes('CAMOBI')) platId = 'plat-3';
      else if (unit.includes('COBOM')) platId = 'plat-cobom';

      const squadId = `squad-${callSign.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      currentSquad = {
        id: squadId,
        name: `${callSign} (${unit.split('/').pop()?.trim() || 'Guarnição'})`,
        callSign,
        unitText: unit,
        platoonId: platId,
        commanderName: 'A Definir',
        currentShift: 'Turno e-193 (Dia)',
        status: 'DISPONIVEL',
        activeMembersCount: 0,
        members: []
      };
      squadsMap.set(squadId, currentSquad);
      continue;
    }

    // Detect Militar Line: e.g. "2693038\t1º SGT GONÇALVES\tCOMANDANTE DE GUARNIÇÃO\t24\t25/08/2026 08:00\t26/08/2026 08:00"
    // Split by tab or multiple spaces
    const parts = line.split(/\t+|\s{2,}/);
    if (parts.length >= 3 && /^\d{6,8}$/.test(parts[0])) {
      const reg = parts[0].trim();
      const nameWithRank = parts[1].trim();
      const roleInSquad = parts[2].trim();
      const hours = parts[3] ? parseInt(parts[3], 10) || 24 : 24;
      const shiftStart = parts[4]?.trim() || '';
      const shiftEnd = parts[5]?.trim() || '';

      const member: SquadMember = {
        registrationNumber: reg,
        name: nameWithRank,
        roleInSquad,
        shiftHours: hours,
        shiftStart,
        shiftEnd
      };

      if (currentSquad) {
        currentSquad.members = currentSquad.members || [];
        currentSquad.members.push(member);
        currentSquad.activeMembersCount = currentSquad.members.length;

        // If role is Commander, or first sgt in squad, assign commanderName
        if (
          roleInSquad.toUpperCase().includes('COMANDANTE') || 
          currentSquad.commanderName === 'A Definir' ||
          nameWithRank.includes('SGT')
        ) {
          if (roleInSquad.toUpperCase().includes('COMANDANTE') || currentSquad.commanderName === 'A Definir') {
            currentSquad.commanderName = nameWithRank;
          }
        }

        // Add user profile to users list
        const rankParts = nameWithRank.split(' ');
        const rank = rankParts.length > 1 ? rankParts.slice(0, rankParts.length - 1).join(' ') : 'Sd';
        const warName = rankParts[rankParts.length - 1];

        const isCobom = currentSquad.platoonId === 'plat-cobom' || roleInSquad.toUpperCase().includes('COBOM');
        const userRole: UserRole = isCobom ? 'COBOM' : 'GUARNICAO';

        usersList.push({
          id: `user-${reg}`,
          name: `${warName} (${currentSquad.callSign})`,
          rank,
          role: userRole,
          platoonId: currentSquad.platoonId,
          squadId: currentSquad.id,
          registrationNumber: reg,
        });
      }
    }
  }

  // Always retain Comandante de Pelotão
  if (!usersList.some(u => u.role === 'PELOTAO')) {
    usersList.push({
      id: 'user-pelotao-medeiros',
      name: 'Medeiros (Comandante 1ª CIA / 4º BBM)',
      rank: 'Cap QOEM',
      role: 'PELOTAO',
      platoonId: 'plat-1',
      registrationNumber: '2498110',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'
    });
  }

  const finalSquads = Array.from(squadsMap.values());
  const finalPlatoons = Array.from(platoonsMap.values());

  if (finalSquads.length > 0) {
    saveSquads(finalSquads);
  }
  if (usersList.length > 0) {
    saveUsers(usersList);
  }
  savePlatoons(finalPlatoons);

  return {
    squads: finalSquads.length > 0 ? finalSquads : getStoredSquads(),
    users: usersList.length > 0 ? usersList : getStoredUsers(),
    platoons: finalPlatoons
  };
}

/**
 * Operações de Gestão Manual da Escala (Permutas, Inclusão de Militares e Viaturas)
 */
export function addSquadMember(squadId: string, member: SquadMember, isCommander?: boolean): { squads: Squad[]; users: User[] } {
  const squads = getStoredSquads();
  const users = getStoredUsers();

  const squadIndex = squads.findIndex(s => s.id === squadId);
  if (squadIndex === -1) throw new Error('Guarnição não encontrada');

  const squad = squads[squadIndex];
  squad.members = squad.members || [];

  // Remove previous if already exists in this squad
  squad.members = squad.members.filter(m => m.registrationNumber !== member.registrationNumber);
  squad.members.push(member);
  squad.activeMembersCount = squad.members.length;

  if (isCommander || member.roleInSquad.toUpperCase().includes('COMANDANTE')) {
    squad.commanderName = member.name;
  }

  squads[squadIndex] = squad;
  saveSquads(squads);

  // Update or add in users
  const rankParts = member.name.split(' ');
  const rank = rankParts.length > 1 ? rankParts.slice(0, rankParts.length - 1).join(' ') : 'Sd';
  const warName = rankParts[rankParts.length - 1];
  const isCobom = squad.platoonId === 'plat-cobom' || member.roleInSquad.toUpperCase().includes('COBOM');

  const userIdx = users.findIndex(u => u.registrationNumber === member.registrationNumber);
  const newUser: User = {
    id: `user-${member.registrationNumber}`,
    name: `${warName} (${squad.callSign})`,
    rank,
    role: isCobom ? 'COBOM' : 'GUARNICAO',
    platoonId: squad.platoonId,
    squadId: squad.id,
    registrationNumber: member.registrationNumber,
  };

  if (userIdx >= 0) {
    users[userIdx] = newUser;
  } else {
    users.push(newUser);
  }
  saveUsers(users);

  return { squads, users };
}

export function updateSquadMember(
  squadId: string, 
  registrationNumber: string, 
  updatedData: Partial<SquadMember>, 
  isCommander?: boolean
): { squads: Squad[]; users: User[] } {
  const squads = getStoredSquads();
  const users = getStoredUsers();

  const squadIndex = squads.findIndex(s => s.id === squadId);
  if (squadIndex === -1) throw new Error('Guarnição não encontrada');

  const squad = squads[squadIndex];
  squad.members = squad.members || [];

  const memberIdx = squad.members.findIndex(m => m.registrationNumber === registrationNumber);
  if (memberIdx === -1) throw new Error('Militar não encontrado na guarnição');

  squad.members[memberIdx] = {
    ...squad.members[memberIdx],
    ...updatedData,
  };

  if (isCommander || squad.members[memberIdx].roleInSquad.toUpperCase().includes('COMANDANTE')) {
    squad.commanderName = squad.members[memberIdx].name;
  }

  squads[squadIndex] = squad;
  saveSquads(squads);

  // Update in Users
  const userIdx = users.findIndex(u => u.registrationNumber === registrationNumber);
  if (userIdx >= 0 && updatedData.name) {
    const rankParts = updatedData.name.split(' ');
    const rank = rankParts.length > 1 ? rankParts.slice(0, rankParts.length - 1).join(' ') : 'Sd';
    const warName = rankParts[rankParts.length - 1];
    users[userIdx] = {
      ...users[userIdx],
      rank,
      name: `${warName} (${squad.callSign})`,
    };
    saveUsers(users);
  }

  return { squads, users };
}

export function removeSquadMember(squadId: string, registrationNumber: string): { squads: Squad[]; users: User[] } {
  const squads = getStoredSquads();
  const users = getStoredUsers();

  const squadIndex = squads.findIndex(s => s.id === squadId);
  if (squadIndex !== -1) {
    const squad = squads[squadIndex];
    squad.members = (squad.members || []).filter(m => m.registrationNumber !== registrationNumber);
    squad.activeMembersCount = squad.members.length;
    if (squad.members.length > 0) {
      if (!squad.members.some(m => m.name === squad.commanderName)) {
        squad.commanderName = squad.members[0].name;
      }
    } else {
      squad.commanderName = 'A Definir';
    }
    squads[squadIndex] = squad;
    saveSquads(squads);
  }

  const updatedUsers = users.filter(u => u.registrationNumber !== registrationNumber || u.role === 'PELOTAO');
  saveUsers(updatedUsers);

  return { squads, users: updatedUsers };
}

export function addNewSquad(newSquad: Squad): { squads: Squad[] } {
  const squads = getStoredSquads();
  const exists = squads.some(s => s.id === newSquad.id || s.callSign === newSquad.callSign);
  if (exists) {
    const updated = squads.map(s => (s.id === newSquad.id || s.callSign === newSquad.callSign) ? newSquad : s);
    saveSquads(updated);
    return { squads: updated };
  }
  squads.push(newSquad);
  saveSquads(squads);
  return { squads };
}

export function removeSquad(squadId: string): { squads: Squad[] } {
  const squads = getStoredSquads().filter(s => s.id !== squadId);
  saveSquads(squads);
  return { squads };
}

export function setSquadCommander(squadId: string, commanderName: string): { squads: Squad[] } {
  const squads = getStoredSquads();
  const squad = squads.find(s => s.id === squadId);
  if (squad) {
    squad.commanderName = commanderName;
    saveSquads(squads);
  }
  return { squads };
}

/**
 * Criação de nova ocorrência pelo COBOM
 */
export function createOccurrence(newOcc: Omit<Occurrence, 'id' | 'protocol' | 'createdAt' | 'updatedAt' | 'attendances' | 'totalAttendancesCount' | 'isCarriedOver'>): Occurrence {
  const list = getStoredOccurrences();
  const nextNum = String(list.length + 483).padStart(5, '0');
  const year = new Date().getFullYear();
  const protocol = `CBMRS-${year}-${nextNum}`;
  const id = `occ-${Date.now()}`;
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

  list.unshift(fullOccurrence);
  saveOccurrences(list);

  // Dispara Notificação automática
  const squad = getStoredSquads().find(s => s.id === newOcc.assignedSquadId);
  const notif: AppNotification = {
    id: `notif-${Date.now()}`,
    title: `🚨 Nova Ocorrência Registrada: ${protocol}`,
    message: `COBOM-SM despachou atendimento para ${newOcc.address} (${newOcc.neighborhood}, ${newOcc.city}). Natureza: ${newOcc.dispatchNature}. Guarnição empenhada: ${squad?.name || 'A definir'}.`,
    type: 'NEW_OCCURRENCE',
    occurrenceId: id,
    occurrenceProtocol: protocol,
    targetRoles: ['COBOM', 'GUARNICAO', 'PELOTAO'],
    targetSquadId: newOcc.assignedSquadId,
    createdAt: nowIso,
    isRead: false
  };

  const notifs = getStoredNotifications();
  notifs.unshift(notif);
  saveNotifications(notifs);

  return fullOccurrence;
}

/**
 * Atualização dos dados da ocorrência pelo COBOM
 */
export function updateOccurrence(updated: Occurrence): void {
  const list = getStoredOccurrences();
  const index = list.findIndex(o => o.id === updated.id);
  if (index !== -1) {
    list[index] = {
      ...updated,
      updatedAt: new Date().toISOString()
    };
    saveOccurrences(list);
  }
}

/**
 * Registro de Atendimento pela Guarnição
 */
export function recordAttendance(
  occurrenceId: string, 
  record: Omit<AttendanceRecord, 'id' | 'occurrenceId'>,
  user: User
): Occurrence {
  const list = getStoredOccurrences();
  const index = list.findIndex(o => o.id === occurrenceId);
  if (index === -1) throw new Error('Ocorrência não encontrada');

  const occ = list[index];
  const recordId = `att-${Date.now()}`;
  const fullRecord: AttendanceRecord = {
    ...record,
    id: recordId,
    occurrenceId,
  };

  const newAttendances = [...occ.attendances, fullRecord];
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

  // Geração de Notificações
  const notifs = getStoredNotifications();
  if (record.statusResult === 'CONCLUIDA') {
    notifs.unshift({
      id: `notif-${Date.now()}`,
      title: `✅ Ocorrência Concluída: ${occ.protocol}`,
      message: `A ${record.squadName} finalizou com sucesso o corte/vistoria na ${occ.address} (${occ.city}).`,
      type: 'STATUS_CHANGE',
      occurrenceId: occ.id,
      occurrenceProtocol: occ.protocol,
      targetRoles: ['COBOM', 'PELOTAO', 'GUARNICAO'],
      createdAt: new Date().toISOString(),
      isRead: false
    });
  } else {
    const reasonLabels: Record<string, string> = {
      'FALTA_EQUIPAMENTO_ESPECIFICO': 'Falta de equipamento específico',
      'ARVORE_GRANDE_PORTE_GUINDASTE': 'Árvore de grande porte (requer guindaste/auto escada)',
      'NECESSIDADE_APOIO_CEEE_EQUATORIAL': 'Apoio da concessionária de energia pendente (fiação energizada)',
      'CONDICAO_CLIMATICA_TEMPESTADE': 'Condição climática adversa / Tempestade',
      'AUTORIZACAO_AMBIENTAL_PENDENTE': 'Autorização ambiental / SMA pendente',
      'ACESSO_BLOQUEADO_IMPOSSIBILITADO': 'Acesso bloqueado / Impossibilitado',
      'OUTRO': 'Motivo operacional detalhado em relatório'
    };
    const reasonText = record.unresolvedReason ? reasonLabels[record.unresolvedReason] || record.unresolvedReason : 'Motivo não especificado';

    notifs.unshift({
      id: `notif-${Date.now()}`,
      title: `⚠️ Ocorrência NÃO Concluída: ${occ.protocol}`,
      message: `A ${record.squadName} registrou atendimento pendente. Motivo: ${reasonText}. Ocorrência mantida em aberto para o próximo turno assumir!`,
      type: 'CRITICAL_UNRESOLVED',
      occurrenceId: occ.id,
      occurrenceProtocol: occ.protocol,
      targetRoles: ['PELOTAO', 'COBOM', 'GUARNICAO'],
      targetSquadId: occ.assignedSquadId,
      createdAt: new Date().toISOString(),
      isRead: false
    });
  }

  saveNotifications(notifs);
  return updatedOcc;
}

/**
 * Atualiza status para 'EM_ATENDIMENTO' quando a guarnição desloca/chega no local
 */
export function setSquadInAttendance(occurrenceId: string, squadId: string): Occurrence {
  const list = getStoredOccurrences();
  const index = list.findIndex(o => o.id === occurrenceId);
  if (index === -1) throw new Error('Ocorrência não encontrada');

  const occ = list[index];
  const squad = getStoredSquads().find(s => s.id === squadId);
  const updatedOcc: Occurrence = {
    ...occ,
    status: 'EM_ATENDIMENTO',
    assignedSquadId: squadId,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updatedOcc;
  saveOccurrences(list);

  const notifs = getStoredNotifications();
  notifs.unshift({
    id: `notif-${Date.now()}`,
    title: `🚒 Guarnição no Local: ${occ.protocol}`,
    message: `${squad?.name || 'Guarnição'} iniciou atendimento no endereço ${occ.address} (${occ.neighborhood}).`,
    type: 'STATUS_CHANGE',
    occurrenceId: occ.id,
    occurrenceProtocol: occ.protocol,
    targetRoles: ['COBOM', 'PELOTAO'],
    createdAt: new Date().toISOString(),
    isRead: false
  });
  saveNotifications(notifs);

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
 * Limpa e reseta os dados para os padrões de Santa Maria do CBMRS
 */
export function resetToSeedData(): void {
  localStorage.setItem(STORAGE_KEYS.OCCURRENCES, JSON.stringify(SEED_OCCURRENCES));
  localStorage.setItem(STORAGE_KEYS.PLATOONS, JSON.stringify(SEED_PLATOONS));
  localStorage.setItem(STORAGE_KEYS.SQUADS, JSON.stringify(SEED_SQUADS));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
  localStorage.setItem(STORAGE_KEYS.RAW_E193, INITIAL_E193_RAW_TEXT);
}

/**
 * Exporta banco completo em JSON para backup
 */
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
