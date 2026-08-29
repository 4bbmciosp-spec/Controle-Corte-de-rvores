import { E193ImportEntry } from '../types';

/**
 * Normaliza datas do formato brasileiro (DD/MM/YYYY HH:mm) para ISO 8601 com timezone de Santa Maria (-03:00)
 */
export function formatToIsoSantaMaria(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // Caso 1: Já está em formato ISO (ex: 2026-08-29T08:00:00-03:00 ou 2026-08-29T08:00:00Z)
  if (trimmed.includes('T')) {
    if (trimmed.includes('-03:00') || trimmed.includes('+') || trimmed.endsWith('Z')) {
      return trimmed;
    }
    return `${trimmed.slice(0, 19)}-03:00`;
  }

  // Caso 2: Formato DD/MM/YYYY HH:mm ou DD/MM/YYYY HH:mm:ss
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    const hour = match[4].padStart(2, '0');
    const minute = match[5].padStart(2, '0');
    const second = (match[6] || '00').padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`;
  }

  // Caso 3: Formato YYYY-MM-DD HH:mm
  const matchIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (matchIso) {
    const year = matchIso[1];
    const month = matchIso[2];
    const day = matchIso[3];
    const hour = matchIso[4];
    const minute = matchIso[5];
    const second = matchIso[6] || '00';
    return `${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`;
  }

  return trimmed;
}

/**
 * Extrai o Posto/Graduação e o Nome de Guerra a partir de uma string composta (ex: "1º SGT GONÇALVES", "2º SGT VALDEQUE SOUZA PEREIRA")
 */
export function extractRankAndWarName(rawStr: string): { posto: string; nome: string } {
  if (!rawStr) return { posto: 'SD', nome: '' };
  const trimmed = rawStr.trim();

  // Lista de postos e graduações ordenados dos mais longos para os mais curtos
  const rankPatterns: { regex: RegExp; canonical: string }[] = [
    { regex: /^(?:TEN\s*CEL|TEN-CEL|TC)\b/i, canonical: 'TEN CEL' },
    { regex: /^(?:CAP\s*QOEM|CAP-QOEM)\b/i, canonical: 'CAP QOEM' },
    { regex: /^(?:1[º°ª]?\s*TEN|1\s*TEN)\b/i, canonical: '1º TEN' },
    { regex: /^(?:2[º°ª]?\s*TEN|2\s*TEN)\b/i, canonical: '2º TEN' },
    { regex: /^(?:1[º°ª]?\s*SGT|1\s*SGT)\b/i, canonical: '1º SGT' },
    { regex: /^(?:2[º°ª]?\s*SGT|2\s*SGT)\b/i, canonical: '2º SGT' },
    { regex: /^(?:3[º°ª]?\s*SGT|3\s*SGT)\b/i, canonical: '3º SGT' },
    { regex: /^(?:SUB\s*TEN|SUB-TEN|SUBTEN)\b/i, canonical: 'SUBTEN' },
    { regex: /^(?:CEL|CORONEL)\b/i, canonical: 'CEL' },
    { regex: /^(?:MAJ|MAJOR)\b/i, canonical: 'MAJ' },
    { regex: /^(?:CAP|CAPIT[ÃA]O)\b/i, canonical: 'CAP' },
    { regex: /^(?:ASP|ASPIRANTE)\b/i, canonical: 'ASP' },
    { regex: /^(?:CB|CABO)\b/i, canonical: 'CB' },
    { regex: /^(?:SD|SOLDADO)\b/i, canonical: 'SD' },
    { regex: /^(?:CIVIL)\b/i, canonical: 'CIVIL' },
  ];

  for (const p of rankPatterns) {
    const match = trimmed.match(p.regex);
    if (match) {
      const remaining = trimmed.slice(match[0].length).trim();
      return {
        posto: p.canonical,
        nome: remaining || trimmed,
      };
    }
  }

  // Fallback: primeira palavra como posto, resto como nome
  const tokens = trimmed.split(/\s+/);
  if (tokens.length > 1) {
    return {
      posto: tokens[0].toUpperCase(),
      nome: tokens.slice(1).join(' '),
    };
  }

  return {
    posto: 'SD',
    nome: trimmed,
  };
}

/**
 * Normaliza o nome do Pelotão para os 4 pelotões reais já cadastrados no 4º BBM
 * ('1º PEL', '2º PEL BS', '3º PEL', 'COBOM-SM')
 */
export function normalizeCanonicalPlatoonName(rawPlatoonName: string): string {
  const upper = (rawPlatoonName || '').toUpperCase();

  if (upper.includes('COBOM')) return 'COBOM-SM';
  if (upper.includes('1º PEL') || upper.includes('1 PEL') || upper.includes('1ºPEL')) return '1º PEL';
  if (upper.includes('2º PEL') || upper.includes('2 PEL') || upper.includes('2ºPEL') || upper.includes('PINHEIRO MACHADO') || upper.includes('PEL BS')) return '2º PEL BS';
  if (upper.includes('3º PEL') || upper.includes('3 PEL') || upper.includes('3ºPEL') || upper.includes('CAMOBI')) return '3º PEL';

  return rawPlatoonName.trim() || '1º PEL';
}

/**
 * Parser tolerante do texto bruto colado do e-193.
 * Transforma o texto estruturado com cabeçalhos de pelotão, viaturas e linhas TAB em um array achatado de E193ImportEntry.
 */
export function parseE193RosterText(rawText: string): E193ImportEntry[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trimEnd())
    .filter(l => l.length > 0);

  const entries: E193ImportEntry[] = [];

  let currentBbm = '4º BBM';
  let currentPlatoonName = '1º PEL';
  let currentHeadquarters = 'Santa Maria';
  let currentCallSign = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 1. Ignorar marcadores soltos de colchetes ou cabeçalho genérico da cidade
    if (line.startsWith('[') && !line.includes('/')) {
      continue;
    }

    // 2. Identifica cabeçalho de Pelotão (ex: "4º BBM / 1ª CIA / 2º PEL BS/ P. PINHEIRO MACHADO" ou "4º BBM / COBOM-SM")
    if (line.includes('/') && (line.includes('BBM') || line.includes('CIA') || line.includes('PEL') || line.includes('COBOM'))) {
      const cleanLine = line.replace(/^[\[\(]+|[\]\)]+$/g, '').trim();
      const segments = cleanLine.split('/').map(s => s.trim()).filter(Boolean);

      if (segments.length >= 1) {
        currentBbm = segments[0] || '4º BBM';
      }

      if (segments.length === 1) {
        currentPlatoonName = normalizeCanonicalPlatoonName(segments[0]);
      } else if (segments.length === 2) {
        currentPlatoonName = normalizeCanonicalPlatoonName(segments[1]);
        currentHeadquarters = segments[1].includes('COBOM') ? 'Santa Maria' : segments[1];
      } else if (segments.length === 3) {
        currentPlatoonName = normalizeCanonicalPlatoonName(segments[1]);
        currentHeadquarters = segments[2];
      } else if (segments.length >= 4) {
        currentPlatoonName = normalizeCanonicalPlatoonName(segments[segments.length - 2]);
        currentHeadquarters = segments[segments.length - 1];
      }

      // Se a própria linha já tiver o callsign (ex: "COBOM-SM (4º BBM / COBOM-SM)"), pode capturar
      const vtrInHeader = cleanLine.match(/^([A-Z0-9\-]+)\s*\(/i);
      if (vtrInHeader) {
        currentCallSign = vtrInHeader[1].toUpperCase();
      }

      continue;
    }

    // 3. Identifica Linha de Viatura / Seção sem TAB (ex: "ABC-794 (4º BBM...)", "ABT-1496", "COBOM-SM (4º BBM / COBOM-SM)")
    if (!line.includes('\t') && (
      /^([A-Z0-9]{2,5}-\d{2,5})/i.test(line) ||
      /^COBOM-SM/i.test(line) ||
      /\(([A-Z0-9\-]+)\)/i.test(line) ||
      /^[A-Z]{3,4}\s*-\s*\d{3,4}/i.test(line)
    )) {
      // Extrai o call_sign antes dos parênteses
      const beforeParen = line.split('(')[0].trim();
      const match = beforeParen.match(/^([A-Z0-9\-]+)/i);
      if (match) {
        currentCallSign = match[1].toUpperCase();
      } else {
        currentCallSign = beforeParen.toUpperCase();
      }

      // Se for COBOM-SM, garante que o pelotão também seja COBOM-SM
      if (currentCallSign.includes('COBOM')) {
        currentPlatoonName = 'COBOM-SM';
        currentHeadquarters = 'Santa Maria';
      }

      continue;
    }

    // 4. Identifica Linha de Militar com campos separados por TAB (ou 2+ espaços como fallback)
    let parts = line.split('\t').map(p => p.trim());
    if (parts.length < 4 && line.includes('  ')) {
      // Fallback para caso onde TABs viraram múltiplos espaços no copy/paste
      parts = line.split(/\s{2,}/).map(p => p.trim());
    }

    // Se temos campos suficientes para ser uma linha de militar
    if (parts.length >= 4) {
      const matricula = parts[0].replace(/\D/g, '');
      const rawPostoNome = parts[1] || '';
      const funcao = parts[2] || 'COMBATENTE';
      const cargaHorariaRaw = parseInt(parts[3], 10);
      const cargaHoraria = !isNaN(cargaHorariaRaw) && cargaHorariaRaw >= 1 && cargaHorariaRaw <= 24 ? cargaHorariaRaw : 24;
      const inicioTurnoRaw = parts[4] || '';
      const fimTurnoRaw = parts[5] || '';

      if (matricula && rawPostoNome) {
        const { posto, nome } = extractRankAndWarName(rawPostoNome);
        const inicioTurno = formatToIsoSantaMaria(inicioTurnoRaw);
        const fimTurno = formatToIsoSantaMaria(fimTurnoRaw);

        // Se por algum motivo o callsign ainda não foi definido, usa o nome do pelotão ou 'ABT-0000'
        const effectiveCallSign = currentCallSign || (currentPlatoonName === 'COBOM-SM' ? 'COBOM-SM' : 'VTR-OPERACIONAL');

        entries.push({
          platoon_name: currentPlatoonName,
          platoon_bbm: currentBbm,
          platoon_headquarters: currentHeadquarters,
          call_sign: effectiveCallSign,
          matricula,
          posto_graduacao: posto,
          nome_guerra: nome,
          funcao_na_guarnicao: funcao,
          carga_horaria_horas: cargaHoraria,
          inicio_turno: inicioTurno,
          fim_turno: fimTurno,
        });
      }
    }
  }

  return entries;
}
