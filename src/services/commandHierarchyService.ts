/**
 * commandHierarchyService.ts
 * 
 * Regras de hierarquia militar e antiguidade do CBMRS (4º BBM)
 * para determinação precisa de Comandante de Guarnição (CG) por turno e intervalo.
 */

export type CanonicalRank = 
  | 'CEL' 
  | 'TC' 
  | 'MAJ' 
  | 'CAP' 
  | '1TEN' 
  | '2TEN' 
  | 'ASP' 
  | 'SUBTEN' 
  | '1SGT' 
  | '2SGT' 
  | '3SGT' 
  | 'CB' 
  | 'SD' 
  | 'CIVIL';

/**
 * Mapeamento de peso hierárquico (maior valor = posto mais elevado)
 */
export const RANK_WEIGHTS: Record<CanonicalRank, number> = {
  CEL: 140,
  TC: 130,
  MAJ: 120,
  CAP: 110,
  '1TEN': 100,
  '2TEN': 90,
  ASP: 80,
  SUBTEN: 70,
  '1SGT': 60,
  '2SGT': 50,
  '3SGT': 40,
  CB: 30,
  SD: 20,
  CIVIL: 10,
};

/**
 * Normaliza qualquer texto de posto/graduação real do CBMRS para o token canônico
 * Exemplos:
 * "Cap QOEM" -> "CAP"
 * "1º Ten QOEG" -> "1TEN"
 * "2º Sgt PME" -> "2SGT"
 * "Ten Cel" / "Ten Cel QOEM" -> "TC"
 * "Cel" -> "CEL"
 * "Sub Ten" / "Subtenente" -> "SUBTEN"
 * "3º Sgt" -> "3SGT"
 * "Cb" / "Cabo" -> "CB"
 * "Sd" / "Soldado" -> "SD"
 */
export function normalizarPosto(postoGraduacao?: string | null): CanonicalRank {
  if (!postoGraduacao) return 'SD';
  const clean = postoGraduacao
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[ºª°.]/g, '') // remove ordinais e pontos
    .trim();

  // Coronel / Tenente Coronel
  if (clean.includes('TEN CEL') || clean.includes('TENENTE CORONEL') || clean.includes('TC')) return 'TC';
  if (clean.startsWith('CEL') || clean.includes('CORONEL')) return 'CEL';

  // Major
  if (clean.startsWith('MAJ') || clean.includes('MAJOR')) return 'MAJ';

  // Capitão
  if (clean.startsWith('CAP') || clean.includes('CAPITAO')) return 'CAP';

  // Tenentes
  if (clean.includes('1 TEN') || clean.includes('1TEN') || clean.includes('PRIMEIRO TEN')) return '1TEN';
  if (clean.includes('2 TEN') || clean.includes('2TEN') || clean.includes('SEGUNDO TEN')) return '2TEN';
  if (clean.includes('TEN') || clean.includes('TENENTE')) return '1TEN';

  // Aspirante a Oficial
  if (clean.includes('ASP') || clean.includes('ASPIRANTE')) return 'ASP';

  // Subtenente
  if (clean.includes('SUB TEN') || clean.includes('SUBTEN') || clean.includes('SUBTENENTE')) return 'SUBTEN';

  // Sargentos
  if (clean.includes('1 SGT') || clean.includes('1SGT') || clean.includes('PRIMEIRO SGT') || clean.includes('PRIMEIRO SARGENTO')) return '1SGT';
  if (clean.includes('2 SGT') || clean.includes('2SGT') || clean.includes('SEGUNDO SGT') || clean.includes('SEGUNDO SARGENTO')) return '2SGT';
  if (clean.includes('3 SGT') || clean.includes('3SGT') || clean.includes('TERCEIRO SGT') || clean.includes('TERCEIRO SARGENTO')) return '3SGT';
  if (clean.includes('SGT') || clean.includes('SARGENTO')) return '3SGT';

  // Cabo
  if (clean.startsWith('CB') || clean.includes('CABO')) return 'CB';

  // Soldado
  if (clean.startsWith('SD') || clean.includes('SOLDADO')) return 'SD';

  // Civil
  if (clean.includes('CIVIL') || clean.includes('ESTAG') || clean.includes('FUNC')) return 'CIVIL';

  return 'SD';
}

/**
 * Retorna o peso hierárquico numérico para ordenação
 */
export function pesoHierarquico(postoOuTexto: string): number {
  const canonico = normalizarPosto(postoOuTexto);
  return RANK_WEIGHTS[canonico] ?? 20;
}

/**
 * Compara dois militares por posto (maior peso) e, em caso de empate,
 * por antiguidade de matrícula (menor número = mais antigo).
 * Retorna:
 * > 0 se militarA é MAIS ANTIGO / SUPERIOR a militarB
 * < 0 se militarB é MAIS ANTIGO / SUPERIOR a militarA
 * = 0 se estritamente idênticos
 */
export function compararAntiguidade(
  militarA: { rank?: string; posto_graduacao?: string; matricula?: string; registrationNumber?: string },
  militarB: { rank?: string; posto_graduacao?: string; matricula?: string; registrationNumber?: string }
): number {
  const pesoA = pesoHierarquico(militarA.posto_graduacao || militarA.rank || '');
  const pesoB = pesoHierarquico(militarB.posto_graduacao || militarB.rank || '');

  if (pesoA !== pesoB) {
    return pesoA - pesoB; // Positivo se A for superior a B
  }

  // Desempate por matrícula: menor número inteiro = mais antigo
  const matAStr = (militarA.matricula || militarA.registrationNumber || '').replace(/\D/g, '');
  const matBStr = (militarB.matricula || militarB.registrationNumber || '').replace(/\D/g, '');

  const numA = parseInt(matAStr, 10);
  const numB = parseInt(matBStr, 10);

  if (!isNaN(numA) && !isNaN(numB)) {
    // Menor matrícula = mais antigo (ganha prioridade)
    return numB - numA; // Positivo se A for menor (mais antigo) que B
  }

  if (!isNaN(numA)) return 1;
  if (!isNaN(numB)) return -1;

  return 0;
}

export interface EscalaCandidate {
  militarId: string;
  matricula: string;
  postoGraduacao: string;
  nomeGuerra: string;
  funcao: string;
  isExplicitE193Cg?: boolean;
  inicioTurno: string; // ISO
  fimTurno: string; // ISO
}

export interface CgDeterminationResult {
  isCg: boolean;
  cgDefinidoExplicitamente: boolean;
  motivo: 'E193_EXPLICITO' | 'FUNCAO_ESCALA' | 'HIERARQUIA_ANTIGUIDADE' | 'INDEFINIDO';
}

/**
 * Algoritmo de determinação de Comandante de Guarnição (CG) por intervalo de turno
 * de acordo com as regras da Seção 4.6:
 * 
 * 1. O E-193 indica CG explicitamente para aquele intervalo/guarnição?
 *      SIM -> usar o CG indicado (is_cg = true, cg_definido_explicitamente = true)
 * 2. Função indicada na escala (ex: CG, COMANDANTE)
 * 3. Sobreposição/estrutura CG x COV
 * 4. Hierarquia de postos
 * 5. Antiguidade / matrícula
 * 6. Horário de serviço
 */
export function determinarCgPorIntervalo(
  candidatosNoIntervalo: EscalaCandidate[]
): Map<string, CgDeterminationResult> {
  const results = new Map<string, CgDeterminationResult>();

  if (!candidatosNoIntervalo || candidatosNoIntervalo.length === 0) {
    return results;
  }

  // Inicializa todos como falso
  candidatosNoIntervalo.forEach(c => {
    results.set(c.militarId, {
      isCg: false,
      cgDefinidoExplicitamente: false,
      motivo: 'INDEFINIDO',
    });
  });

  // 1. Verificação de CG Explícito do E-193
  const explicitCandidates = candidatosNoIntervalo.filter(c => c.isExplicitE193Cg);
  if (explicitCandidates.length === 1) {
    const chosen = explicitCandidates[0];
    results.set(chosen.militarId, {
      isCg: true,
      cgDefinidoExplicitamente: true,
      motivo: 'E193_EXPLICITO',
    });
    return results;
  } else if (explicitCandidates.length > 1) {
    // Desempata entre os explícitos por antiguidade
    explicitCandidates.sort((a, b) => compararAntiguidade(
      { posto_graduacao: a.postoGraduacao, matricula: a.matricula },
      { posto_graduacao: b.postoGraduacao, matricula: b.matricula }
    ));
    const chosen = explicitCandidates[explicitCandidates.length - 1]; // maior antiguidade
    results.set(chosen.militarId, {
      isCg: true,
      cgDefinidoExplicitamente: true,
      motivo: 'E193_EXPLICITO',
    });
    return results;
  }

  // 2 & 3. Verificação por Função Indicada na Escala (ex: COMANDANTE, CG, COV)
  const roleCandidates = candidatosNoIntervalo.filter(c => {
    const fn = (c.funcao || '').toUpperCase();
    return fn.includes('COMANDANTE') || fn.includes('CG') || fn.includes('CMT') || fn.includes('CHEFE DE GUARNI');
  });

  if (roleCandidates.length === 1) {
    const chosen = roleCandidates[0];
    results.set(chosen.militarId, {
      isCg: true,
      cgDefinidoExplicitamente: true,
      motivo: 'FUNCAO_ESCALA',
    });
    return results;
  } else if (roleCandidates.length > 1) {
    roleCandidates.sort((a, b) => compararAntiguidade(
      { posto_graduacao: a.postoGraduacao, matricula: a.matricula },
      { posto_graduacao: b.postoGraduacao, matricula: b.matricula }
    ));
    const chosen = roleCandidates[roleCandidates.length - 1];
    results.set(chosen.militarId, {
      isCg: true,
      cgDefinidoExplicitamente: true,
      motivo: 'FUNCAO_ESCALA',
    });
    return results;
  }

  // 4 & 5. Hierarquia de Postos e Antiguidade (Seção 4.2 / 4.3)
  const sorted = [...candidatosNoIntervalo].sort((a, b) => compararAntiguidade(
    { posto_graduacao: a.postoGraduacao, matricula: a.matricula },
    { posto_graduacao: b.postoGraduacao, matricula: b.matricula }
  ));

  const highest = sorted[sorted.length - 1];
  if (highest) {
    results.set(highest.militarId, {
      isCg: true,
      cgDefinidoExplicitamente: false,
      motivo: 'HIERARQUIA_ANTIGUIDADE',
    });
  }

  return results;
}
